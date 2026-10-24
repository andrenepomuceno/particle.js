// GPU vs float64 CPU reference: runs the same steps on both inside the page and reports the
// largest position deviation. Exits 1 if any case exceeds the float32 tolerance.
// Usage: node scripts/parity.mjs [--scale 1]   (multiplies every case's step count)
import { parseArgs } from 'node:util';
import { collectProblems, withBrowser } from './lib/browser.mjs';

const { values } = parseArgs({ options: { scale: { type: 'string', default: '1' } } });
const scale = Number(values.scale);
if (!(scale > 0)) throw new Error(`--scale must be > 0, got '${values.scale}'`);

const binary = { name: 'G', mode: 'potential', range: 'long', expression: '-G * m_i * m_j / r', params: [{ name: 'G', value: 1 }] };
const CASES = [
  { name: 'binary gravity', forces: [binary], settings: { timeStep: 0.1 }, steps: 2000, tolerance: 1e-3 },
  // Many-body and chaotic: float32 rounding grows ~1e-9 (1 step) → 2e-5 (200 steps) → O(10) (2000),
  // so the comparison stops while the deviation still measures the implementation, not chaos.
  { name: 'short-range LJ + Coulomb, box', settings: { timeStep: 0.02, boundary: 'box', boundarySize: 40, friction: 0.01 }, steps: 200, tolerance: 1e-3,
    forces: [
      { preset: 'lennardJones', cutoff: 12, params: { epsilon: 1, sigma: 4 } },
      { preset: 'coulomb', softening: 1, params: { k: 2 } },
    ] },
];
const GROUPS = {
  'binary gravity': [
    { count: 1, shape: { type: 'point', center: [-5, 0, 0] }, velocity: { type: 'constant', value: [0, -0.2, 0] } },
    { count: 1, shape: { type: 'point', center: [5, 0, 0] }, velocity: { type: 'constant', value: [0, 0.2, 0] } },
  ],
  'short-range LJ + Coulomb, box': [
    { count: 16, shape: { type: 'grid', spacing: 5, columns: 4, rows: 4 }, charge: { cycle: [1, -1] }, velocity: { type: 'random', speed: 0.5 } },
  ],
};

const failures = await withBrowser(async ({ browser, base }) => {
  const page = await browser.newPage();
  const problems = collectProblems(page);
  await page.goto(`${base}?scenario=sandbox`);
  let failed = 0;
  for (const testCase of CASES) {
    for (const integrator of ['euler', 'verlet']) {
      const scenario = JSON.stringify({
        format: 'particle.js-v2/scenario', version: 1, id: 'parity', name: testCase.name, seed: 1,
        settings: { ...testCase.settings, integrator }, forces: testCase.forces, groups: GROUPS[testCase.name],
      });
      const deviation = await page.evaluate(async ({ scenario, steps }) => {
        const { referenceStep } = await import('/src/engine/cpu/referenceStep.ts');
        const { ParticleSet } = await import('/src/engine/particles.ts');
        const c = globalThis.particleController;
        c.importFile(scenario, 'parity.json');
        c.store.set({ paused: true });
        const start = c.readParticles();
        const cpu = new ParticleSet(4 * Math.ceil(start.length / 4) || 4);
        cpu.addAll(start);
        const { settings } = c.state;
        const state = {};
        const t0 = c.state.time;
        for (let k = 0; k < steps; k++) referenceStep(cpu, c.compiledForces, settings, t0 + k * settings.timeStep, state);
        c.advance(steps);
        const gpu = c.readParticles();
        let worst = 0;
        gpu.forEach((p, i) => p.position.forEach((v, k) => (worst = Math.max(worst, Math.abs(v - cpu.get(i).position[k])))));
        return worst;
      }, { scenario, steps: Math.max(1, Math.round(testCase.steps * scale)) });
      const ok = deviation <= testCase.tolerance;
      if (!ok) failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${testCase.name} / ${integrator}: max |Δx| = ${deviation.toExponential(2)} (tolerance ${testCase.tolerance})`);
    }
  }
  if (problems.length) console.log(JSON.stringify({ problems }));
  return failed + problems.length;
});
process.exit(failures ? 1 : 0);
