import { describe, expect, it } from 'vitest';
import { referenceField } from '../src/engine/cpu/field';
import { addPairForce, pairScope, probeScope } from '../src/engine/cpu/pairs';
import { referenceStep, type ReferenceState } from '../src/engine/cpu/referenceStep';
import { DEFAULT_PROBE } from '../src/engine/field';
import { compileForce, forceScope } from '../src/engine/forces/compile';
import { appliedForce, PLOT_PAIR } from '../src/engine/forces/resultant';
import { MEAN_NOISE, pairNoise } from '../src/engine/noise';
import { defaultParticle, ParticleSet, type Particle, type Vec3 } from '../src/engine/particles';
import { DEFAULT_SETTINGS, type SimulationSettings } from '../src/engine/settings';
import {
  generateAccelerationShader, generateFieldShader, generatePotentialShader, generateVelocityShader,
} from '../src/engine/shaders/computeShaders';
import { makeForce } from './helpers';

function setOf(...particles: Particle[]): ParticleSet {
  const set = new ParticleSet(particles.length);
  set.addAll(particles);
  return set;
}

const momentum = (set: ParticleSet): Vec3 => [0, 1, 2].map((k) => {
  let sum = 0;
  for (let i = 0; i < set.count; i++) sum += set.attributes[i * 4]! * set.velocity[i * 4 + k]!;
  return sum;
}) as Vec3;

const noise = compileForce(makeForce({ expression: 'sigma * randn', params: [{ name: 'sigma', value: 2 }] }));

describe('random variables in expressions', () => {
  it('are pair variables of force mode: rand and randn numbers, randv a vector', () => {
    expect([noise.kind, noise.random, noise.jacobian]).toEqual(['central', true, false]);
    const uniform = compileForce(makeForce({ expression: 'k * (rand - 0.5)', params: [{ name: 'k', value: 1 }] }));
    expect([uniform.kind, uniform.random]).toEqual(['central', true]);
    const vector = compileForce(makeForce({ expression: 'k * n_j * randv', params: [{ name: 'k', value: 1 }] }));
    expect([vector.kind, vector.random, vector.velocity]).toEqual(['vector', true, false]);
    expect([...vector.reads].filter((name) => name.startsWith('rand')).sort()).toEqual(['randvx', 'randvy', 'randvz']);
    expect(compileForce(makeForce()).random).toBe(false);
  });

  it('are refused in potential mode, like velocities', () => {
    expect(() => compileForce(makeForce({ mode: 'potential', expression: 'rand / r', params: [] })))
      .toThrow(/rand are random numbers, which a potential cannot hold.*use force mode/);
    expect(() => compileForce(makeForce({ mode: 'potential', expression: 'randn * dot(randv, d)', params: [] })))
      .toThrow(/randn, randv are random numbers/);
  });

  it('do not expose randv components nor accept the names as parameters', () => {
    expect(() => compileForce(makeForce({ expression: 'randvx', params: [] }))).toThrow(/unknown variable 'randvx'/);
    expect(() => compileForce(makeForce({ expression: 'rand', params: [{ name: 'rand', value: 1 }] }))).toThrow(/parameter name 'rand' is reserved/);
  });

  it('are constants for the Jacobian ∂F/∂v_i', () => {
    const force = compileForce(makeForce({ expression: '-gamma * v_dot * rhat + sigma * randn * rhat + c * randv - b * v_i', params: [{ name: 'gamma', value: 1.5 }, { name: 'sigma', value: 3 }, { name: 'c', value: 2 }, { name: 'b', value: 0.4 }] }));
    const drag = compileForce(makeForce({ expression: '-gamma * v_dot * rhat - b * v_i', params: [{ name: 'gamma', value: 1.5 }, { name: 'b', value: 0.4 }] }));
    expect([force.jacobian, force.random]).toEqual([true, true]);
    const set = setOf(defaultParticle({ position: [0.3, -1, 0.2], velocity: [0.5, 0.1, -0.2] }), defaultParticle({ position: [-0.7, 0.4, 0], velocity: [-0.1, 0.3, 0.2] }));
    const dist = Math.hypot(1, -1.4, 0.2);
    const expected = drag.evaluateWithJacobian!(forceScope(drag, pairScope(set, 0, 1, 0, false), dist)).J;
    for (const time of [0, 0.5, 1.5]) {
      const { F, J } = force.evaluateWithJacobian!(forceScope(force, pairScope(set, 0, 1, time, true), dist));
      expect(F.every(Number.isFinite)).toBe(true);
      J.forEach((row, k) => row.forEach((value, l) => expect(value).toBeCloseTo(expected[k]![l]!, 12)));
    }
  });
});

describe('random numbers in the CPU pair loop', () => {
  it('hash the pair symmetrically, or stay NaN when no force reads them', () => {
    const set = setOf(defaultParticle({ position: [0, 0, 0] }), defaultParticle({ position: [1, 0, 0] }));
    const ij = pairScope(set, 0, 1, 2.5, true);
    const ji = pairScope(set, 1, 0, 2.5, true);
    expect({ rand: ij.rand, randn: ij.randn, randvx: ij.randvx, randvy: ij.randvy, randvz: ij.randvz }).toEqual(pairNoise(0, 1, 2.5));
    expect([ji.rand, ji.randn, ji.randvx]).toEqual([ij.rand, ij.randn, ij.randvx]);
    expect(Number.isNaN(pairScope(set, 0, 1, 2.5, false).randn)).toBe(true);
  });

  it('push a pair equally and oppositely with sigma * randn, but with the same vector with k * randv', () => {
    const set = setOf(defaultParticle({ position: [0.2, 0, 0] }), defaultParticle({ position: [-0.4, 0.8, 0.1] }));
    const vector = compileForce(makeForce({ expression: 'k * randv', params: [{ name: 'k', value: 1.5 }] }));
    const dist = Math.hypot(0.6, -0.8, -0.1);
    const on = (forces: typeof noise[], i: number, j: number) => {
      const out: [number, number, number] = [0, 0, 0];
      addPairForce(forces, pairScope(set, i, j, 0.7, true), dist, out);
      return out;
    };
    const [fi, fj] = [on([noise], 0, 1), on([noise], 1, 0)];
    fi.forEach((c, k) => expect(c).toBeCloseTo(-fj[k]!, 14));
    expect(Math.hypot(...fi)).toBeGreaterThan(0);
    expect(on([vector], 0, 1)).toEqual(on([vector], 1, 0));
  });

  it('conserve the momentum of a pair under sigma * randn and a pair drag, which set the temperature sigma²·dt/(2·gamma)', () => {
    const [sigma, gamma, dt] = [3, 2, 0.01];
    const forces = [
      compileForce(makeForce({ expression: '-k * (r - 1)', params: [{ name: 'k', value: 4 }] })),
      compileForce(makeForce({ expression: '-gamma * v_dot', params: [{ name: 'gamma', value: gamma }] })),
      compileForce(makeForce({ expression: 'sigma * randn', params: [{ name: 'sigma', value: sigma }] })),
    ];
    const set = setOf(defaultParticle({ position: [-0.5, 0, 0], velocity: [0.3, 0, 0] }), defaultParticle({ position: [0.5, 0, 0], velocity: [-0.3, 0, 0] }));
    const settings: SimulationSettings = { ...DEFAULT_SETTINGS, timeStep: dt };
    let time = 0;
    let energy = 0;
    const steps = 40_000;
    for (let k = 0; k < steps; k++) {
      referenceStep(set, forces, settings, time);
      time += dt;
      momentum(set).forEach((p) => expect(Math.abs(p)).toBeLessThan(1e-12));
      // Only the separation is thermostatted (central forces): ½·μ·u² with μ = m/2 holds ½·T.
      const u = set.velocity[0]! - set.velocity[4]!;
      if (k >= steps / 10) energy += 0.25 * u * u;
    }
    const temperature = (2 * energy) / (steps - steps / 10);
    expect(temperature).toBeGreaterThan(0.9 * ((sigma * sigma * dt) / (2 * gamma)));
    expect(temperature).toBeLessThan(1.1 * ((sigma * sigma * dt) / (2 * gamma)));
  });

  it.each(['verlet', 'euler'] as const)('conserve the momentum of many particles under a position-only random force (%s)', (integrator) => {
    const particles = Array.from({ length: 12 }, (_, k) => defaultParticle({ position: [k % 4, Math.floor(k / 4), 0.1 * k], mass: 1 + (k % 3) }));
    const set = setOf(...particles);
    const forces = [compileForce(makeForce({ expression: 'sigma * (1 - x) * randn + a * (1 - x)', range: 'short', cutoff: 1.8, params: [{ name: 'sigma', value: 4 }, { name: 'a', value: 2 }] }))];
    const state: ReferenceState = {};
    let time = 0;
    for (let k = 0; k < 200; k++) {
      referenceStep(set, forces, { ...DEFAULT_SETTINGS, integrator, timeStep: 0.02 }, time, state);
      time += 0.02;
    }
    // Velocities are stored as float32: the sum cancels to their rounding, far below the kicks.
    let scale = 0;
    for (let i = 0; i < set.count; i++) scale += set.attributes[i * 4]! * Math.hypot(set.velocity[i * 4]!, set.velocity[i * 4 + 1]!, set.velocity[i * 4 + 2]!);
    expect(scale).toBeGreaterThan(1);
    momentum(set).forEach((p) => expect(Math.abs(p)).toBeLessThan(1e-6 * scale));
  });

  it('hash the time each integrator evaluates forces at: Euler at t, Verlet also at t + dt', () => {
    const [sigma, t, dt] = [2, 0.3, 0.1];
    const start = () => setOf(defaultParticle({ position: [-0.5, 0, 0] }), defaultParticle({ position: [0.5, 0, 0] }));
    // r̂ on particle 0 points from 1 to 0, along −x.
    const accel = (time: number) => -sigma * pairNoise(0, 1, time).randn;
    const euler = start();
    referenceStep(euler, [noise], { ...DEFAULT_SETTINGS, integrator: 'euler', timeStep: dt }, t);
    // Velocities are stored as float32.
    expect(euler.velocity[0]).toBeCloseTo(accel(t) * dt, 7);
    const verlet = start();
    referenceStep(verlet, [noise], { ...DEFAULT_SETTINGS, integrator: 'verlet', timeStep: dt }, t);
    expect(verlet.velocity[0]).toBeCloseTo(0.5 * (accel(t) + accel(t + dt)) * dt, 7);
  });
});

describe('random numbers in field probes and plots', () => {
  const force = compileForce(makeForce({ expression: 'k * rand + sigma * randn + dot(randv, rhat)', params: [{ name: 'k', value: 3 }, { name: 'sigma', value: 5 }] }));

  it('take their mean, so arrows and curves do not flicker', () => {
    expect(appliedForce(force, 2)).toBeCloseTo(1.5, 12);
    expect(PLOT_PAIR).toMatchObject(MEAN_NOISE);
    const set = setOf(defaultParticle({ position: [0, 0, 0] }), defaultParticle({ position: [3, 1, 0] }));
    expect(probeScope({ ...DEFAULT_PROBE, position: [1, 1, 0] }, set, 0, 4)).toMatchObject(MEAN_NOISE);
    const field = referenceField(set, [force], DEFAULT_PROBE, [1, 1, 0], 4);
    // 1.5 from each particle along the unit vector from it to the probe.
    const expected = [1 / Math.SQRT2 - 2 / Math.sqrt(4), 1 / Math.SQRT2, 0].map((c) => 1.5 * c);
    expected.forEach((c, k) => expect(field[k]).toBeCloseTo(c, 12));
  });

  it('are not hashed by the field shader, which keeps the means', () => {
    const shader = generateFieldShader([force]);
    expect(shader).not.toMatch(/pcgHash|pairSeed|floatBitsToUint/);
    expect(shader).toContain('vec2 noise = vec2(0.5, 0.0);');
    expect(shader).toContain('vec3 noiseVec = vec3(0.0, 0.0, 0.0);');
  });
});

describe('random numbers in the compute shaders', () => {
  const seedCall = 'uint seed = pairSeed(uint(min(index1, index2)), uint(max(index1, index2)), floatBitsToUint(uTime));';

  it('are hashed only when a force reads them', () => {
    for (const shader of [generateVelocityShader([compileForce(makeForce())]), generatePotentialShader([compileForce(makeForce({ mode: 'potential', expression: 'k / r' }))])]) {
      expect(shader).not.toMatch(/pcgHash|pairSeed|floatBitsToUint/);
      expect(shader).toContain('vec2 noise = vec2(0.5, 0.0);');
    }
  });

  it('hash only the values read, from the pair and uTime, in both force passes', () => {
    const uniform = compileForce(makeForce({ expression: 'k * rand', params: [{ name: 'k', value: 1 }] }));
    for (const shader of [generateVelocityShader([uniform]), generateAccelerationShader([uniform])]) {
      expect(shader).toContain('uint pcgHash(uint v) {');
      expect(shader).toContain(`{\n      ${seedCall}\n      noise.x = hashUniform(seed, 0u);\n    }`);
      expect(shader).not.toMatch(/noise\.y =|noiseVec\.[xyz] =/);
    }
    const all = compileForce(makeForce({ expression: 'randn * rhat + randv', params: [] }));
    const shader = generateVelocityShader([all]);
    for (const line of ['noise.y = hashNormal(seed, 1u);', 'noiseVec.x = hashNormal(seed, 3u);', 'noiseVec.y = hashNormal(seed, 5u);', 'noiseVec.z = hashNormal(seed, 7u);']) {
      expect(shader).toContain(line);
    }
    expect(shader).not.toContain('noise.x =');
  });

  it('skip pairs outside the range of every short-range force that reads them', () => {
    const short = compileForce(makeForce({ expression: 'randn', range: 'short', cutoff: 2, params: [] }));
    const other = compileForce(makeForce({ id: 'b', expression: 'rand', range: 'short', cutoff: 3, params: [] }));
    const gravity = compileForce(makeForce({ id: 'g' }));
    expect(generateVelocityShader([gravity, short, other])).toContain(`if (dist < uF1_cutoff || dist < uF2_cutoff) {\n      ${seedCall}`);
    const long = compileForce(makeForce({ id: 'l', expression: 'rand', params: [] }));
    expect(generateVelocityShader([short, long])).toContain(`    {\n      ${seedCall}`);
  });
});
