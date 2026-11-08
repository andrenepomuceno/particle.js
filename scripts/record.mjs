// Records a scenario offline and deterministically: frame k is the state after --warmup-steps + k ×
// --steps-per-frame simulation steps, read from the canvas (no UI) and piped to ffmpeg (VP9 WebM) and/or
// written as PNGs, with a JSON of metadata and the timeline captions as WebVTT beside it. See docs/recording.md.
// Usage: node scripts/record.mjs --scenario id [--seconds 10] [--fps 60] [--steps-per-frame 1] [--size 1080x1920]
//   [--particles n] [--seed s] [--warmup-steps n] [--display file.json|'{...}'] [--out reports/videos/<id>.webm]
//   [--png] [--no-video] [--crf 24] [--speed 2] [--capacity n] [--verify k,k,...]
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectProblems, newAppPage, withBrowser } from './lib/browser.mjs';
import { LANGS } from './lib/langs.mjs';

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
    lang: { type: 'string', default: 'en' },
    out: { type: 'string' },
    png: { type: 'boolean', default: false },
    'no-video': { type: 'boolean', default: false },
    crf: { type: 'string', default: '24' },
    speed: { type: 'string', default: '2' },
    supersample: { type: 'string', default: '1' },
    capacity: { type: 'string' },
    verify: { type: 'string', default: '' },
  },
});

const fail = (message) => {
  console.error(`record: ${message}`);
  process.exit(2);
};
const integer = (name, min, max = Number.MAX_SAFE_INTEGER) => {
  const value = Number(values[name]);
  if (!Number.isInteger(value) || value < min || value > max) fail(`--${name} must be an integer within [${min}, ${max}], got '${values[name]}'`);
  return value;
};
const optionalInteger = (name, min, max) => (values[name] === undefined ? undefined : integer(name, min, max));

if (!values.scenario) fail('--scenario <id> is required');
const fps = integer('fps', 1, 1000);
const seconds = Number(values.seconds);
if (!(Number.isFinite(seconds) && seconds > 0)) fail(`--seconds must be a finite number > 0, got '${values.seconds}'`);
const frames = Math.round(seconds * fps);
if (frames < 1) fail(`--seconds ${values.seconds} at --fps ${fps} rounds to 0 frames`);
const stepsPerFrame = integer('steps-per-frame', 0);
const warmupSteps = integer('warmup-steps', 0);
const crf = integer('crf', 0, 63);
// libvpx-vp9 -cpu-used: 0 is ~3× slower than 2 for ~20 % fewer bytes at the same quality (docs/recording.md).
const speed = integer('speed', 0, 8);
// Renders at s× the size and averages down to it: cleaner edges for s² the pixels.
const supersample = integer('supersample', 1, 4);
const particles = optionalInteger('particles', 1);
// createRng takes a 32-bit seed.
const seed = optionalInteger('seed', 0, 0xffffffff);
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
if (!LANGS.includes(values.lang)) fail(`--lang must be one of ${LANGS.join(', ')}, got '${values.lang}'`);
const video = !values['no-video'];
if (!video && !values.png) fail('--no-video needs --png, or nothing would be written');
const display = values.display === undefined ? {}
  : JSON.parse(values.display.trim().startsWith('{') ? values.display : await readFile(values.display, 'utf8'));
const out = values.out ?? path.join('reports', 'videos', `${values.scenario}.webm`);
if (!out.endsWith('.webm')) fail(`--out must end in .webm (the metadata, subtitles and frames take its name), got '${out}'`);
const base = out.slice(0, -'.webm'.length);
const framesDir = `${base}-frames`;

// Everything that can fail cheaply fails before the browser starts.
const run = (command, ...args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const git = (...args) => {
  try {
    return run('git', ...args).trim();
  } catch (error) {
    return fail(`git ${args.join(' ')} failed (the metadata records the commit): ${error.message}`);
  }
};
const source = {
  version: JSON.parse(await readFile('package.json', 'utf8')).version,
  commit: git('rev-parse', 'HEAD'),
  dirty: git('status', '--porcelain', '--untracked-files=no') !== '',
};
if (video) {
  let encoders = '';
  try {
    encoders = run('ffmpeg', '-hide_banner', '-encoders');
  } catch (error) {
    fail(`ffmpeg is needed for video output (or pass --png --no-video): ${error.message}`);
  }
  if (!/\blibvpx-vp9\b/.test(encoders)) fail('this ffmpeg has no libvpx-vp9 encoder (or pass --png --no-video)');
}
await mkdir(path.dirname(out), { recursive: true });
// Frames and subtitles of an earlier run must not sit beside this one's.
await rm(`${base}.vtt`, { force: true });
if (values.png) {
  await mkdir(framesDir, { recursive: true });
  const stale = (await readdir(framesDir)).filter((name) => /^\d{5}\.png$/.test(name));
  await Promise.all(stale.map((name) => rm(path.join(framesDir, name))));
}

const scriptStarted = performance.now();
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** Frames queued for ffmpeg before capture waits: capture and encoding overlap, memory stays bounded. */
const QUEUE_BYTES = 256 * 1024 * 1024;

/**
 * ffmpeg reading PNGs on stdin and writing VP9 WebM to a partial file that finish() renames over `out`,
 * so a failed run never replaces an earlier video; abort() kills it and removes the partial file.
 */
function startEncoder() {
  const partial = `${base}.partial.webm`;
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-b:v', '0', '-row-mt', '1', '-cpu-used', String(speed),
    '-f', 'webm', partial,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });
  // Observed here so an early exit surfaces through write() or finish(), not as an unhandled rejection.
  done.catch(() => {});
  // A dying ffmpeg breaks the pipe; `done` reports its exit code instead of an unhandled EPIPE.
  ffmpeg.stdin.on('error', () => {});
  return {
    async write(buffer) {
      if (ffmpeg.exitCode !== null) await done;
      if (!ffmpeg.stdin.write(buffer) && ffmpeg.stdin.writableLength > QUEUE_BYTES) await Promise.race([once(ffmpeg.stdin, 'drain'), done]);
    },
    async finish() {
      ffmpeg.stdin.end();
      await done;
      await rename(partial, out);
    },
    async abort() {
      ffmpeg.kill('SIGKILL');
      await done.catch(() => {});
      await rm(partial, { force: true });
    },
  };
}

/** Loads the scenario as a recording does: seed, particle total and display options, the frame loop stopped. */
async function openWorld(page, appBase, worldSeed) {
  const query = new URLSearchParams({ scenario: 'sandbox', lang: values.lang, ...(capacity ? { capacity: String(capacity) } : {}) });
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
  }, { scenario: values.scenario, seed: worldSeed, particles, display });
}

/** Captures every frame into the encoder and/or PNG files; returns what the metadata needs. */
async function capture(page, encoder) {
  await page.evaluate((steps) => globalThis.particleController.advance(steps), warmupSteps);
  const times = [];
  const hashes = [];
  const timeline = [];
  const states = new Map();
  const series = { kinetic: [], potential: [], total: [], momentum: [], angularMomentum: [] };
  let diagnosticsFirst;
  let diagnosticsLast;
  let previous = { fired: undefined, caption: undefined };
  const started = performance.now();
  for (let frame = 0; frame < frames; frame++) {
    // Frame 0 is the state after the warm-up; each later one is stepsPerFrame steps and 1/fps s further.
    const grab = await page.evaluate(({ steps, seconds, keep, factor }) => {
      const c = globalThis.particleController;
      c.captureFrame(steps, seconds);
      const { time, timeline, caption } = c.state;
      // The picture first: diagnostics render the potential pass offscreen.
      let picture = c.renderer.domElement;
      if (factor > 1) {
        // Supersampled: the browser's high-quality resampling averages the frame down to the output size.
        const small = globalThis.recorderCanvas ??= Object.assign(globalThis.document.createElement('canvas'), { width: picture.width / factor, height: picture.height / factor });
        const context = small.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(picture, 0, 0, small.width, small.height);
        picture = small;
      }
      const png = picture.toDataURL('image/png');
      return {
        png, time, fired: timeline.fired, caption: caption ?? null, diagnostics: c.diagnostics(),
        particles: keep ? JSON.stringify(c.readParticles()) : undefined,
      };
    }, { steps: frame === 0 ? 0 : stepsPerFrame, seconds: frame === 0 ? 0 : 1 / fps, keep: verify.includes(frame), factor: supersample });
    const png = Buffer.from(grab.png.slice(grab.png.indexOf(',') + 1), 'base64');
    times.push(grab.time);
    hashes.push(sha256(png));
    if (grab.particles !== undefined) states.set(frame, grab.particles);
    const d = grab.diagnostics;
    for (const key of Object.keys(series)) series[key].push(d[key]);
    if (frame === 0) diagnosticsFirst = d;
    diagnosticsLast = d;
    if (grab.fired !== previous.fired || grab.caption !== previous.caption) {
      timeline.push({ frame, time: grab.time, eventsFired: grab.fired, caption: grab.caption });
      previous = grab;
    }
    if (encoder) await encoder.write(png);
    if (values.png) await writeFile(path.join(framesDir, `${String(frame).padStart(5, '0')}.png`), png);
    if (frame % fps === 0) process.stdout.write(`\rrecord: frame ${frame + 1}/${frames}`);
  }
  const msPerFrame = (performance.now() - started) / frames;
  process.stdout.write('\n');
  return { times, hashes, timeline, states, series, diagnosticsFirst, diagnosticsLast, msPerFrame };
}

/** Replays each verified frame in a fresh page straight to its step, with the recording's seed, and compares the particles. */
async function replay(browser, appBase, worldSeed, states) {
  const checks = [];
  const problems = [];
  for (const frame of verify) {
    const page = await newAppPage(browser, { viewport: { width: 320, height: 240 }, deviceScaleFactor: 1 });
    const pageProblems = collectProblems(page);
    await openWorld(page, appBase, worldSeed);
    const steps = warmupSteps + frame * stepsPerFrame;
    const particles = await page.evaluate((n) => {
      const c = globalThis.particleController;
      c.advance(n);
      return JSON.stringify(c.readParticles());
    }, steps);
    checks.push({ frame, steps, identical: particles === states.get(frame) });
    problems.push(...pageProblems.map((problem) => `verify frame ${frame}: ${problem}`));
    await page.close();
  }
  return { checks, problems };
}

const report = await withBrowser(async ({ browser, base: appBase }) => {
  const started = performance.now();
  const page = await newAppPage(browser, { viewport: { width, height }, deviceScaleFactor: supersample });
  const problems = collectProblems(page);
  const world = await openWorld(page, appBase, seed);
  // A browser shrinks a drawing buffer past the GPU's limits without an error.
  if (world.buffer[0] !== width * supersample || world.buffer[1] !== height * supersample) {
    throw new Error(`the GPU gave a ${world.buffer.join('x')} drawing buffer for --size ${width}x${height} at --supersample ${supersample}; use a smaller size or factor`);
  }
  const setupMs = performance.now() - started;
  const encoder = video ? startEncoder() : undefined;
  try {
    const captured = await capture(page, encoder);
    await page.close();
    // The scenario's own seed or the random one it drew: the replay must lay out the same world.
    const verified = await replay(browser, appBase, world.seed.value, captured.states);
    await encoder?.finish();
    return { world, setupMs, ...captured, checks: verified.checks, problems: [...problems, ...verified.problems] };
  } catch (error) {
    await encoder?.abort();
    throw error;
  }
});

const metadata = {
  scenario: { id: values.scenario, name: report.world.name, sha256: sha256(report.world.source) },
  particlejs: source,
  seed: report.world.seed.value,
  particles: report.world.particles,
  capacity: report.world.capacity,
  settings: report.world.settings,
  stepsPerFrame, warmupSteps, fps, frames, size: [width, height],
  display,
  lang: values.lang,
  output: { video: video ? out : null, png: values.png ? framesDir : null, crf, speed, supersample },
  // The frames' identity: two runs of the same command on the same GPU give the same value.
  hash: sha256(report.hashes.join('')),
  frameTimes: report.times,
  frameHashes: report.hashes,
  timeline: report.timeline,
  diagnostics: { first: report.diagnosticsFirst, last: report.diagnosticsLast },
  // Per frame, aligned with frameTimes: energies, P and L about the origin (about Q: L − Q × P).
  series: report.series,
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
/** Caption text as a WebVTT cue payload: no blank line (it ends a cue), no '-->', markup characters escaped. */
const cueText = (caption) => caption.split('\n').map((line) => line.trim()).filter(Boolean).join('\n')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Captions are a DOM overlay in the app, not canvas pixels: a subtitle track keeps them, in sync, off the frames.
const cues = report.timeline.map((entry, k) => ({ ...entry, end: report.timeline[k + 1]?.frame ?? frames }))
  .filter((entry) => entry.caption !== null && entry.end > entry.frame && cueText(entry.caption) !== '')
  .map((entry) => `${cueTime(entry.frame)} --> ${cueTime(entry.end)}\n${cueText(entry.caption)}`);
if (cues.length > 0) await writeFile(`${base}.vtt`, `WEBVTT\n\n${cues.join('\n\n')}\n`);
const failed = report.checks.filter((c) => !c.identical);
console.log(JSON.stringify({ frames, hash: metadata.hash, timing: metadata.timing, out: video ? out : framesDir, metadata: `${base}.json`, verify: report.checks, problems: report.problems }, null, 2));
process.exit(failed.length > 0 || report.problems.length > 0 ? 1 : 0);
