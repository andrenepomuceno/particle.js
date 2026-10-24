// GPU vs float64 CPU reference: runs the same steps on both inside the page and reports the
// largest position deviation. Exits 1 if any case exceeds the float32 tolerance.
// Usage: node scripts/parity.mjs [--scale 1]   (multiplies every case's step count)
import { parseArgs } from 'node:util';
import { collectProblems, newAppPage, withBrowser } from './lib/browser.mjs';

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
  { name: 'spin dipole, 2D charge, isospin', settings: { timeStep: 0.02, boundary: 'box', boundarySize: 40 }, steps: 200, tolerance: 1e-3,
    forces: [
      { name: 'spin radial', mode: 'force', range: 'short', cutoff: 15, softening: 1, expression: '15 * (s_dot - 3 * si_r * sj_r) / r^4' },
      { name: 'charge 2D + isospin', mode: 'force', range: 'long', softening: 1, expression: 'q_dot / r^2 + 0.5 * i3_i * i3_j * exp(-r / 4)' },
    ] },
  // Non-central: F = −∇V of a potential in the relative position (spin dipole + anisotropic term).
  { name: 'vector potential (dipole), collisions', settings: { timeStep: 0.01, boundary: 'box', boundarySize: 30, collisionDistance: 1 }, steps: 200, tolerance: 1e-3,
    forces: [
      { preset: 'spinSpin', cutoff: 12, softening: 0.5, params: { k: 4 } },
      { name: 'anisotropic', mode: 'potential', range: 'long', softening: 0.5, expression: '0.2 * q_i * q_j * dx * dy / r^4' },
    ] },
  // Velocity-dependent: a fixed magnetic dipole's field and Biot–Savart between moving charges (implicit kick).
  { name: 'magnetic: dipole field + Biot-Savart', settings: { timeStep: 0.01 }, steps: 300, tolerance: 1e-3,
    forces: [
      { name: 'dipole field', mode: 'force', range: 'long', softening: 0.5, expression: 'q_i * cross(v_i, k * (3 * dot(s_j, rhat) * rhat - s_j) / r^3)', params: [{ name: 'k', value: 40 }] },
      { name: 'biot-savart', mode: 'force', range: 'long', softening: 0.5, expression: 'k * q_i * q_j / r^3 * cross(v_i, cross(v_j, d))', params: [{ name: 'k', value: 2 }] },
      { preset: 'coulomb', softening: 0.5, params: { k: 0.5 } },
    ] },
  // A slab box (boundaryDepth): the per-axis half-sizes of the GPU reflection and clamping.
  { name: 'collisions + gravity, box', settings: { timeStep: 0.02, boundary: 'box', boundarySize: 30, boundaryDepth: 1.5, collisionDistance: 2, collisionRestitution: 0.8 }, steps: 200, tolerance: 1e-3,
    forces: [
      { preset: 'gravity', softening: 1, params: { G: 5 } },
      // A softened central potential: its force carries the Plummer factor d/r (d = |Δx| on the GPU).
      { name: 'soft well', mode: 'potential', range: 'long', softening: 1.5, expression: '-k * q_i * q_j / r', params: [{ name: 'k', value: 2 }] },
    ] },
];
const GROUPS = {
  'binary gravity': [
    { count: 1, shape: { type: 'point', center: [-5, 0, 0] }, velocity: { type: 'constant', value: [0, -0.2, 0] } },
    { count: 1, shape: { type: 'point', center: [5, 0, 0] }, velocity: { type: 'constant', value: [0, 0.2, 0] } },
  ],
  'spin dipole, 2D charge, isospin': [
    { count: 12, shape: { type: 'grid', spacing: 4, columns: 4, rows: 3 }, species: { cycle: ['u', 'd', 'p', 'n'] },
      charge2: { cycle: [0.5, -0.5, 0] }, spin: { cycle: [[0, 0, 1], [1, 0, 0], [0, 1, 0.5]] }, velocity: { type: 'random', speed: 0.3 } },
  ],
  'vector potential (dipole), collisions': [
    { count: 12, shape: { type: 'grid', spacing: 3, columns: 4, rows: 3 }, charge: { cycle: [1, -1, 0.5] },
      spin: { cycle: [[0, 0, 1], [1, 0, 0], [0, 0.6, 0.8], [-1, 0, 0]] }, velocity: { type: 'random', speed: 0.3 } },
  ],
  'magnetic: dipole field + Biot-Savart': [
    { count: 1, kind: 'fixed', shape: { type: 'point', center: [0, 0, 0] }, spin: [0, 0, 1], charge: 0 },
    { count: 10, shape: { type: 'shell', radius: 4 }, charge: { cycle: [1, -1] }, velocity: { type: 'random', speed: 1 } },
  ],
  'collisions + gravity, box': [
    { count: 16, shape: { type: 'grid', spacing: 3, columns: 4, rows: 4 }, mass: { cycle: [1, 2] }, charge: { cycle: [1, -1, 1, 1] }, velocity: { type: 'random', speed: 1 } },
  ],
  'short-range LJ + Coulomb, box': [
    { count: 16, shape: { type: 'grid', spacing: 5, columns: 4, rows: 4 }, charge: { cycle: [1, -1] }, velocity: { type: 'random', speed: 0.5 } },
  ],
};

const failures = await withBrowser(async ({ browser, base }) => {
  const page = await newAppPage(browser);
  const problems = collectProblems(page);
  await page.goto(`${base}?scenario=sandbox`);
  let failed = 0;
  for (const testCase of CASES) {
    for (const integrator of ['euler', 'verlet']) {
      const scenario = JSON.stringify({
        format: 'particle.js-v2/scenario', version: 2, id: 'parity', name: testCase.name, seed: 1,
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
  const field = await page.evaluate(async ({ scenario }) => {
    const { referenceField } = await import('/src/engine/cpu/field.ts');
    const { ParticleSet } = await import('/src/engine/particles.ts');
    const c = globalThis.particleController;
    c.importFile(scenario, 'field.json');
    c.store.set({ paused: true });
    const particles = c.readParticles();
    const cpu = new ParticleSet(particles.length);
    cpu.addAll(particles);
    const positions = new Float32Array(Array.from({ length: 300 * 3 }, (_, k) => (k % 3 === 2 ? 0.5 : ((k * 7919) % 97) - 48)));
    const probe = { mass: 1.5, charge: -2, charge2: 0.5, spin: [0.3, 0, 1], isospin: 0.5, parity: 1, nuclearCharge: 0, color: [0, 0, 0] };
    // GpuCompute is private to the controller; the probe pass is driven directly, bypassing the view.
    c.gpu.setProbes(positions);
    c.gpu.computeField(c.state.time, probe);
    const gpu = c.gpu.readFieldMagnitudes();
    const ref = referenceField(cpu, c.compiledForces, probe, positions, c.state.time);
    const exact = Array.from(gpu, (_, p) => Math.hypot(ref[p * 3], ref[p * 3 + 1], ref[p * 3 + 2]));
    // Per-probe relative error, floored at the median |F| so near-zero probes do not dominate
    // and a single 1/r^2 spike cannot hide errors on the typical probes.
    const median = [...exact].sort((a, b) => a - b)[Math.floor(exact.length / 2)];
    let worst = 0;
    gpu.forEach((m, p) => (worst = Math.max(worst, Math.abs(m - exact[p]) / Math.max(exact[p], median))));
    return { relative: worst, largest: Math.max(...exact) };
  }, { scenario: JSON.stringify({
    format: 'particle.js-v2/scenario', version: 2, id: 'field', name: 'field', seed: 1,
    forces: CASES[1].forces, groups: GROUPS['short-range LJ + Coulomb, box'],
  }) });
  const fieldOk = field.relative <= 1e-4 && field.largest > 0;
  if (!fieldOk) failed++;
  console.log(`${fieldOk ? 'PASS' : 'FAIL'} field probes vs referenceField: max per-probe |Δ|F|| / max(|F|, median) = ${field.relative.toExponential(2)} (tolerance 1e-4)`);
  if (problems.length) console.log(JSON.stringify({ problems }));
  return failed + problems.length;
});
process.exit(failures ? 1 : 0);
