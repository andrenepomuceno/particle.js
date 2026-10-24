// Cheap quality KPIs per bundled scenario, run on the GPU: each scenario advances `--steps` steps and
// O(N) metrics are taken at the start, halfway and the end. Prints a table, writes reports/kpis.json
// and exits 1 if any scenario is unhealthy (non-finite state). Warnings flag dull or broken scenes.
// Usage: node scripts/scenario-kpis.mjs [--scenario id,id|all] [--steps 2000]
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { collectProblems, newAppPage, withBrowser } from './lib/browser.mjs';

const { values } = parseArgs({ options: { scenario: { type: 'string', default: 'all' }, steps: { type: 'string', default: '2000' } } });
const steps = Number(values.steps);
if (!(Number.isInteger(steps) && steps >= 10)) throw new Error(`--steps must be an integer >= 10, got '${values.steps}'`);

async function libraryIds() {
  const dir = new URL('../src/scenarios/library/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(new URL(f, dir), 'utf8')).id));
}
const ids = values.scenario === 'all' ? await libraryIds() : values.scenario.split(',');
const BATCH = 10;

/** Runs in the page: metrics of the current particles (positions, velocities, masses). */
function measure() {
  const c = globalThis.particleController;
  const particles = c.readParticles().filter((p) => p.kind !== 2);
  const n = particles.length;
  const finite = particles.every((p) => [...p.position, ...p.velocity].every(Number.isFinite));
  const center = [0, 1, 2].map((k) => particles.reduce((s, p) => s + p.position[k], 0) / Math.max(n, 1));
  const radii = particles.map((p) => Math.hypot(...p.position.map((x, k) => x - center[k])));
  const rms = Math.sqrt(radii.reduce((s, r) => s + r * r, 0) / Math.max(n, 1));
  const kinetic = particles.reduce((s, p) => s + 0.5 * p.mass * p.velocity.reduce((v2, v) => v2 + v * v, 0), 0);
  const meanSpeed = particles.reduce((s, p) => s + Math.hypot(...p.velocity), 0) / Math.max(n, 1);
  // Visible: inside the camera's view volume.
  const V = c.camera.position.constructor;
  const visible = particles.filter((p) => {
    const q = new V(...p.position).project(c.camera);
    return Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z < 1;
  }).length / Math.max(n, 1);
  return { n, finite, center, radii, rms, kinetic, meanSpeed, visible, mode2D: c.state.settings.mode2D };
}

/** Connected clusters of particles closer than `link`, by a hash grid of cell size `link` (O(N)). */
function clusters(positions, link) {
  const key = (p) => p.map((x) => Math.floor(x / link)).join(',');
  const cells = new Map();
  positions.forEach((p, i) => {
    const k = key(p);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(i);
  });
  const parent = positions.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const offsets = [-1, 0, 1].flatMap((a) => [-1, 0, 1].flatMap((b) => [-1, 0, 1].map((c) => [a, b, c])));
  positions.forEach((p, i) => {
    const base = p.map((x) => Math.floor(x / link));
    for (const o of offsets) {
      for (const j of cells.get(base.map((b, k) => b + o[k]).join(',')) ?? []) {
        if (j <= i) continue;
        if (Math.hypot(...p.map((x, k) => x - positions[j][k])) < link) parent[find(i)] = find(j);
      }
    }
  });
  const sizes = new Map();
  positions.forEach((_, i) => sizes.set(find(i), (sizes.get(find(i)) ?? 0) + 1));
  const counts = [...sizes.values()];
  return { count: counts.length, largest: Math.max(0, ...counts) / Math.max(positions.length, 1) };
}

const results = await withBrowser(async ({ browser, base }) => {
  const out = [];
  for (const id of ids) {
    const page = await newAppPage(browser);
    const problems = collectProblems(page);
    await page.goto(`${base}?scenario=${id}`);
    await page.waitForFunction(() => globalThis.particleController);
    const samples = [];
    const positions = [];
    await page.evaluate(() => globalThis.particleController.store.set({ paused: true }));
    let done = 0;
    for (const target of [0, Math.round(steps / 2), steps]) {
      // Small batches: advance() queues every step at once, and hundreds of heavy steps (e.g. a
      // velocity-dependent force on 10k particles) can trip the GPU watchdog and lose the context.
      for (; done < target; done += Math.min(BATCH, target - done)) {
        await page.evaluate((n) => globalThis.particleController.advance(n), Math.min(BATCH, target - done));
      }
      const sample = await page.evaluate(measure);
      positions.push(await page.evaluate(() => globalThis.particleController.readParticles().filter((p) => p.kind !== 2).map((p) => p.position)));
      samples.push({ ...sample, time: await page.evaluate(() => globalThis.particleController.state.time) });
    }
    const [start, , end] = samples;
    const dims = start.mode2D ? 2 : 3;
    // Linking length: half the mean spacing of the initial cloud.
    const link = 0.5 * Math.max(start.rms, 1e-9) * Math.pow(Math.PI / Math.max(start.n, 1), 1 / dims);
    const [c0, c1] = [clusters(positions[0], link), clusters(positions[2], link)];
    const escaped = end.radii.filter((r) => r > 10 * Math.max(start.rms, 1e-9)).length / Math.max(end.n, 1);
    const kineticRatio = start.kinetic > 0 ? end.kinetic / start.kinetic : end.kinetic > 0 ? Infinity : 1;
    const structure = Math.abs(c1.largest - c0.largest) + Math.abs(Math.log((c1.count + 1) / (c0.count + 1)));
    const warnings = [];
    if (start.n === 0) warnings.push('empty (nothing to measure)');
    if (!end.finite) warnings.push('non-finite state');
    // Escapes and clusters mean little for a handful of particles.
    const few = start.n < 10;
    if (!few && escaped > 0.2) warnings.push(`${(escaped * 100).toFixed(0)}% escaped`);
    // Motion relative to the scene: how many scene sizes the mean particle could cross in the run.
    // (A kinetic-energy ratio is meaningless for scenes that start at rest.)
    const crossings = (end.meanSpeed * (end.time - start.time)) / Math.max(start.rms, 1e-9);
    if (!few && crossings < 1e-3 && structure < 0.1) warnings.push('frozen');
    if (!few && crossings > 100) warnings.push(`runaway speeds (${crossings.toFixed(0)} scene sizes crossed)`);
    if (!few && start.n > 0 && structure < 0.05) warnings.push('little emergence (structure unchanged)');
    if (start.n > 0 && start.visible < 0.8) warnings.push(`framing: ${(start.visible * 100).toFixed(0)}% visible at start`);
    else if (start.n > 0 && end.visible < 0.5) warnings.push(`${(end.visible * 100).toFixed(0)}% visible at the end`);
    if (problems.length > 0) warnings.push(`${problems.length} console problem(s)`);
    out.push({
      id, particles: start.n, time: end.time, finite: end.finite, escaped, kineticRatio,
      clusters: [c0.count, c1.count], largest: [c0.largest, c1.largest], structure, visible: [start.visible, end.visible], warnings, problems,
    });
    await page.close();
    console.error(`${id}: ${warnings.length ? warnings.join('; ') : 'ok'}`);
  }
  return out;
});

const pad = (s, n) => String(s).padEnd(n);
console.log([pad('scenario', 22), pad('N', 6), pad('KE end/start', 13), pad('clusters', 12), pad('largest', 13), pad('struct', 7), pad('visible', 10), 'flags'].join(' '));
for (const r of results) {
  console.log([
    pad(r.id, 22), pad(r.particles, 6), pad(r.kineticRatio.toPrecision(3), 13), pad(`${r.clusters[0]}→${r.clusters[1]}`, 12),
    pad(`${r.largest[0].toFixed(2)}→${r.largest[1].toFixed(2)}`, 13), pad(r.structure.toFixed(2), 7), pad(`${(r.visible[0] * 100).toFixed(0)}→${(r.visible[1] * 100).toFixed(0)}%`, 10),
    r.warnings.join('; ') || 'ok',
  ].join(' '));
}
await mkdir('reports', { recursive: true });
await writeFile('reports/kpis.json', `${JSON.stringify({ steps, results }, null, 2)}\n`);
process.exit(results.some((r) => !r.finite) ? 1 : 0);
