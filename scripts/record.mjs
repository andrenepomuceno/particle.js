// Records a scenario offline and deterministically: frame k is the state after --warmup-steps + k ×
// --steps-per-frame simulation steps, read from the canvas (no UI) and piped to ffmpeg (VP9 WebM) and/or
// written as PNGs, with a JSON of metadata and the timeline captions as WebVTT beside it. See docs/recording.md.
// Usage: node scripts/record.mjs --scenario id [--seconds 10] [--fps 60] [--steps-per-frame 1] [--size 1080x1920]
//   [--particles n] [--seed s] [--warmup-steps n] [--display file.json|'{...}'] [--out reports/videos/<id>.webm]
//   [--png] [--no-video] [--crf 24] [--speed 2] [--capacity n] [--verify k,k,...]
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectProblems, newAppPage, withBrowser } from './lib/browser.mjs';

const { values } = parseArgs({
  options: {
    scenario: { type: 'string' },
    seconds: { type: 'string', default: '10' },
    fps: { type: 'string', default: '60' },
    'steps-per-frame': { type: 'string', default: '1' },
    size: { type: 'string', default: '1080x1920' },
    particles: { type: 'string' },
    seed: { type: 'string' },
    'warmup-steps': { type: 'string', default: '0' },
    display: { type: 'string' },
    out: { type: 'string' },
    png: { type: 'boolean', default: false },
    'no-video': { type: 'boolean', default: false },
    crf: { type: 'string', default: '24' },
    speed: { type: 'string', default: '2' },
    capacity: { type: 'string' },
    verify: { type: 'string', default: '' },
  },
});

const fail = (message) => {
  console.error(`record: ${message}`);
  process.exit(2);
};
const integer = (name, min) => {
  const value = Number(values[name]);
  if (!Number.isInteger(value) || value < min) fail(`--${name} must be an integer >= ${min}, got '${values[name]}'`);
  return value;
};
const optionalInteger = (name, min) => (values[name] === undefined ? undefined : integer(name, min));

if (!values.scenario) fail('--scenario <id> is required');
const fps = integer('fps', 1);
const seconds = Number(values.seconds);
if (!(seconds > 0)) fail(`--seconds must be > 0, got '${values.seconds}'`);
const frames = Math.round(seconds * fps);
const stepsPerFrame = integer('steps-per-frame', 0);
const warmupSteps = integer('warmup-steps', 0);
const crf = integer('crf', 0);
// libvpx-vp9 -cpu-used: 0 is ~3× slower than 2 for ~20 % fewer bytes at the same quality (docs/recording.md).
const speed = integer('speed', 0);
if (speed > 8) fail(`--speed must be an integer within [0, 8], got '${values.speed}'`);
const particles = optionalInteger('particles', 1);
const seed = optionalInteger('seed', 0);
const capacity = optionalInteger('capacity', 1);
const size = /^(\d+)x(\d+)$/.exec(values.size);
if (!size) fail(`--size must be WIDTHxHEIGHT, got '${values.size}'`);
const [width, height] = [Number(size[1]), Number(size[2])];
// VP9 in yuv420p needs even dimensions.
if (width % 2 || height % 2 || width < 16 || height < 16) fail(`--size must have even dimensions of at least 16, got ${values.size}`);
const verify = values.verify.split(',').filter(Boolean).map((k) => {
  const frame = Number(k);
  if (!Number.isInteger(frame) || frame < 0 || frame >= frames) fail(`--verify frames must be integers within [0, ${frames - 1}], got '${k}'`);
  return frame;
});
const video = !values['no-video'];
if (!video && !values.png) fail('--no-video needs --png, or nothing would be written');
const display = values.display === undefined ? {}
  : JSON.parse(values.display.trim().startsWith('{') ? values.display : await readFile(values.display, 'utf8'));
const out = values.out ?? path.join('reports', 'videos', `${values.scenario}.webm`);
const base = out.replace(/\.webm$/, '');
const framesDir = `${base}-frames`;
await mkdir(path.dirname(out), { recursive: true });
if (values.png) await mkdir(framesDir, { recursive: true });

const scriptStarted = performance.now();
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** Loads the scenario as a recording does: seed, particle total and display options, the frame loop stopped. */
async function openWorld(page, appBase) {
  const query = new URLSearchParams({ scenario: 'sandbox', ...(capacity ? { capacity: String(capacity) } : {}) });
  await page.route(/googletagmanager/, (route) => route.abort());
  await page.goto(`${appBase}?${query}`);
  return page.evaluate(async ({ scenario, seed, particles, display }) => {
    const { applyDisplayOptions, readDisplayOptions } = await import('/src/app/displayOptions.ts');
    const c = globalThis.particleController;
    c.beginCapture();
    if (particles !== undefined) c.setParticleTarget(particles);
    c.loadScenario(scenario, seed);
    applyDisplayOptions(c, readDisplayOptions(display, 'display options'));
    const { state } = c;
    const gl = c.renderer.getContext();
    return {
      buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      name: state.name, seed: state.seed, particles: state.particleCount, capacity: state.capacity, settings: state.settings,
      source: state.scenarioSource.text, notices: state.notices.map((n) => n.text),
    };
  }, { scenario: values.scenario, seed, particles, display });
}

/** Frames queued for ffmpeg before capture waits: capture and encoding overlap, memory stays bounded. */
const QUEUE_BYTES = 256 * 1024 * 1024;

/** ffmpeg reading PNGs on stdin and writing VP9 WebM; `done` settles when it exits. */
function startEncoder() {
  const process = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-b:v', '0', '-row-mt', '1', '-cpu-used', String(speed), out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    process.on('error', reject);
    process.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });
  // A dying ffmpeg breaks the pipe; `done` reports its exit code instead of an unhandled EPIPE.
  process.stdin.on('error', () => {});
  const write = async (buffer) => {
    if (!process.stdin.write(buffer) && process.stdin.writableLength > QUEUE_BYTES) await Promise.race([once(process.stdin, 'drain'), done]);
  };
  return { write, done, end: () => process.stdin.end() };
}
let encoder;

const report = await withBrowser(async ({ browser, base: appBase }) => {
  const started = performance.now();
  const page = await newAppPage(browser, { viewport: { width, height }, deviceScaleFactor: 1 });
  const problems = collectProblems(page);
  const world = await openWorld(page, appBase);
  // A browser shrinks a drawing buffer past the GPU's limits without an error.
  if (world.buffer[0] !== width || world.buffer[1] !== height) {
    throw new Error(`the GPU gave a ${world.buffer.join('x')} drawing buffer for --size ${width}x${height}; use a smaller size`);
  }
  // Only now, so a failed setup leaves no empty video behind.
  if (video) encoder = startEncoder();
  await page.evaluate((steps) => globalThis.particleController.advance(steps), warmupSteps);
  const setupMs = performance.now() - started;

  const times = [];
  const hashes = [];
  const timeline = [];
  const states = new Map();
  let diagnosticsFirst;
  let previous = { fired: undefined, caption: undefined };
  const recording = performance.now();
  for (let frame = 0; frame < frames; frame++) {
    // Frame 0 is the state after the warm-up; each later one is stepsPerFrame steps and 1/fps s further.
    const grab = await page.evaluate(({ steps, seconds, keep }) => {
      const c = globalThis.particleController;
      c.captureFrame(steps, seconds);
      const { time, timeline, caption } = c.state;
      return {
        png: c.renderer.domElement.toDataURL('image/png'), time, fired: timeline.fired, caption: caption ?? null,
        particles: keep ? JSON.stringify(c.readParticles()) : undefined,
      };
    }, { steps: frame === 0 ? 0 : stepsPerFrame, seconds: frame === 0 ? 0 : 1 / fps, keep: verify.includes(frame) });
    const png = Buffer.from(grab.png.slice(grab.png.indexOf(',') + 1), 'base64');
    times.push(grab.time);
    hashes.push(sha256(png));
    if (grab.particles !== undefined) states.set(frame, grab.particles);
    if (grab.fired !== previous.fired || grab.caption !== previous.caption) {
      timeline.push({ frame, time: grab.time, eventsFired: grab.fired, caption: grab.caption });
      previous = grab;
    }
    if (encoder) await encoder.write(png);
    if (values.png) await writeFile(path.join(framesDir, `${String(frame).padStart(5, '0')}.png`), png);
    if (frame === 0) diagnosticsFirst = await page.evaluate(() => globalThis.particleController.diagnostics());
    if (frame % fps === 0) process.stdout.write(`\rrecord: frame ${frame + 1}/${frames}`);
  }
  const msPerFrame = (performance.now() - recording) / frames;
  const diagnosticsLast = await page.evaluate(() => globalThis.particleController.diagnostics());
  await page.close();

  // Each verified frame is replayed in a fresh page straight to its step and compared particle by particle.
  const checks = [];
  for (const frame of verify) {
    const replay = await newAppPage(browser, { viewport: { width: 320, height: 240 }, deviceScaleFactor: 1 });
    await openWorld(replay, appBase);
    const particles = await replay.evaluate((steps) => {
      const c = globalThis.particleController;
      c.advance(steps);
      return JSON.stringify(c.readParticles());
    }, warmupSteps + frame * stepsPerFrame);
    checks.push({ frame, steps: warmupSteps + frame * stepsPerFrame, identical: particles === states.get(frame) });
    await replay.close();
  }
  process.stdout.write('\n');
  return { world, setupMs, msPerFrame, times, hashes, timeline, diagnosticsFirst, diagnosticsLast, checks, problems };
});

if (encoder) {
  encoder.end();
  await encoder.done;
}

const dirty = git('status', '--porcelain', '--untracked-files=no') !== '';
const metadata = {
  scenario: { id: values.scenario, name: report.world.name, sha256: sha256(report.world.source) },
  particlejs: { version: JSON.parse(await readFile('package.json', 'utf8')).version, commit: git('rev-parse', 'HEAD'), dirty },
  seed: report.world.seed.value,
  particles: report.world.particles,
  capacity: report.world.capacity,
  settings: report.world.settings,
  stepsPerFrame, warmupSteps, fps, frames, size: [width, height],
  display,
  output: { video: video ? out : null, png: values.png ? framesDir : null, crf, speed },
  // The frames' identity: two runs of the same command on the same GPU give the same value.
  hash: sha256(report.hashes.join('')),
  frameTimes: report.times,
  frameHashes: report.hashes,
  timeline: report.timeline,
  diagnostics: { first: report.diagnosticsFirst, last: report.diagnosticsLast },
  verify: report.checks,
  // msPerFrame: the capture loop (simulation, render, PNG); totalMs also holds setup, verification and the encoder's tail.
  timing: { setupMs: Math.round(report.setupMs), msPerFrame: Math.round(report.msPerFrame * 10) / 10, totalMs: Math.round(performance.now() - scriptStarted) },
  notices: report.world.notices,
  problems: report.problems,
};
await writeFile(`${base}.json`, `${JSON.stringify(metadata, null, 2)}\n`);

/** hh:mm:ss.mmm of a frame's start. */
const cueTime = (frame) => {
  const ms = Math.round((frame * 1000) / fps);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
};
// Captions are a DOM overlay in the app, not canvas pixels: a subtitle track keeps them, in sync, off the frames.
const cues = report.timeline.map((entry, k) => ({ ...entry, end: report.timeline[k + 1]?.frame ?? frames }))
  .filter((entry) => entry.caption !== null && entry.end > entry.frame)
  .map((entry) => `${cueTime(entry.frame)} --> ${cueTime(entry.end)}\n${entry.caption.replace(/\n\n+/g, '\n')}`);
if (cues.length > 0) await writeFile(`${base}.vtt`, `WEBVTT\n\n${cues.join('\n\n')}\n`);
const failed = report.checks.filter((c) => !c.identical);
console.log(JSON.stringify({ frames, hash: metadata.hash, timing: metadata.timing, out: video ? out : framesDir, metadata: `${base}.json`, verify: report.checks, problems: report.problems }, null, 2));
process.exit(failed.length > 0 || report.problems.length > 0 ? 1 : 0);
