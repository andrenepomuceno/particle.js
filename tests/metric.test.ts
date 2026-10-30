import { describe, expect, it } from 'vitest';
import { summarizeEnergy, summarizeSpacetime } from '../src/engine/cpu/energy';
import { referenceStep, type ReferenceState } from '../src/engine/cpu/referenceStep';
import { pairScope } from '../src/engine/cpu/pairs';
import { compileForce, forceScope } from '../src/engine/forces/compile';
import { forceFromPreset } from '../src/engine/forces/presets';
import { generateVelocityShader } from '../src/engine/shaders/computeShaders';
import { JsonReader } from '../src/engine/json';
import { coordinateVelocity, kineticEnergy, lorentzFactor, properVelocity, velocityJacobian } from '../src/engine/metric';
import { defaultParticle, ParticleKind, ParticleSet, type Particle } from '../src/engine/particles';
import { DEFAULT_SETTINGS, readSettings, validateSettings, type SimulationSettings } from '../src/engine/settings';
import { makeForce } from './helpers';

const C = 2;
const minkowski = (overrides: Partial<SimulationSettings> = {}): SimulationSettings => ({
  ...DEFAULT_SETTINGS, metric: 'minkowski', lightSpeed: C, ...overrides,
});

function setFor(settings: SimulationSettings, ...particles: Particle[]): ParticleSet {
  const set = new ParticleSet(Math.max(particles.length, 1));
  set.setMetric(settings);
  set.addAll(particles);
  return set;
}

function run(set: ParticleSet, forces: Parameters<typeof referenceStep>[1], settings: SimulationSettings, steps: number): void {
  const state: ReferenceState = {};
  for (let n = 0; n < steps; n++) referenceStep(set, forces, settings, n * settings.timeStep, state);
}

// A uniform field from one fixed source particle: only it has nuclear charge, so only it exerts the force.
const source = defaultParticle({ kind: ParticleKind.fixed, position: [0, 50, 0], nuclearCharge: 1 });
const k = 1 / C ** 2;

describe('metric helpers', () => {
  it('round-trips u = γv and is the identity when Galilean', () => {
    const v: [number, number, number] = [1.2, -0.5, 0.3];
    const u = properVelocity(v, k);
    expect(lorentzFactor(u, k)).toBeCloseTo(1 / Math.sqrt(1 - (1.2 ** 2 + 0.5 ** 2 + 0.3 ** 2) / C ** 2), 12);
    coordinateVelocity(u, k).forEach((c, axis) => expect(c).toBeCloseTo(v[axis]!, 12));
    expect(properVelocity(v, 0)).toEqual(v);
    expect(coordinateVelocity(v, 0)).toEqual(v);
    expect(lorentzFactor(v, 0)).toBe(1);
  });

  it('refuses a coordinate velocity at or above c', () => {
    expect(() => properVelocity([C, 0, 0], k)).toThrow(/reaches the speed of light c = 2/);
  });

  it('gives ∂v/∂u matching finite differences', () => {
    const u = [1.5, -0.7, 2.2];
    const jacobian = velocityJacobian(u, k);
    const h = 1e-6;
    for (let col = 0; col < 3; col++) {
      const plus = coordinateVelocity(u.map((c, axis) => (axis === col ? c + h : c)), k);
      const minus = coordinateVelocity(u.map((c, axis) => (axis === col ? c - h : c)), k);
      for (let row = 0; row < 3; row++) expect(jacobian[row * 3 + col]!).toBeCloseTo((plus[row]! - minus[row]!) / (2 * h), 8);
    }
  });

  it('computes the kinetic energy (γ − 1)mc², ½mv² when Galilean', () => {
    const u = properVelocity([1.6, 0, 0], k);
    expect(kineticEnergy(3, u, k)).toBeCloseTo((lorentzFactor(u, k) - 1) * 3 * C ** 2, 12);
    expect(kineticEnergy(3, [1.6, 0, 0], 0)).toBe(0.5 * 3 * 1.6 ** 2);
  });
});

describe('ParticleSet under Minkowski', () => {
  it('stores u = γv but hands out v', () => {
    const set = setFor(minkowski(), defaultParticle({ velocity: [1.2, 0, 0] }));
    expect(set.velocity[0]).toBeCloseTo(1.2 / Math.sqrt(1 - 0.36), 6);
    expect(set.get(0).velocity[0]).toBeCloseTo(1.2, 6);
  });

  it('rejects particles at or above c, naming them', () => {
    const set = new ParticleSet(2);
    set.setMetric(minkowski());
    expect(() => set.addAll([defaultParticle(), defaultParticle({ velocity: [0, 2.5, 0] })])).toThrow(/particle #1: speed 2.5 reaches the speed of light/);
    expect(set.count).toBe(0);
  });

  it('keeps each v when c changes, and refuses a c some particle would reach', () => {
    const set = setFor(minkowski(), defaultParticle({ velocity: [1.5, 0, 0] }), defaultParticle({ velocity: [0, 0.5, 0] }));
    set.setMetric(DEFAULT_SETTINGS);
    expect(set.velocity[0]).toBeCloseTo(1.5, 6);
    expect(() => set.setMetric(minkowski({ lightSpeed: 1 }))).toThrow(/1 particle\(s\) move at or above c = 1 \(fastest 1\.5/);
    expect(set.inverseLightSpeed2).toBe(0);
    expect(set.velocity[0]).toBeCloseTo(1.5, 6);
  });

  it('scales the stored u, so kicks never reach c', () => {
    const set = setFor(minkowski(), defaultParticle({ velocity: [1.9, 0, 0] }));
    set.scaleVelocity(0, 10, [0, 0, 0]);
    const speed = Math.hypot(...set.get(0).velocity);
    expect(speed).toBeLessThan(C);
    expect(speed).toBeGreaterThan(1.99);
  });

  it('refuses to step a set written for another metric', () => {
    const set = setFor(DEFAULT_SETTINGS, defaultParticle());
    expect(() => referenceStep(set, [], minkowski(), 0)).toThrow(/stores velocities for 1\/c² = 0, but the settings' metric gives 0.25/);
  });
});

describe.each(['euler', 'verlet'] as const)('Minkowski kinematics (%s)', (integrator) => {
  it('runs moving clocks slow by 1/γ and moves them at v', () => {
    const settings = minkowski({ integrator, timeStep: 0.1 });
    const set = setFor(settings, defaultParticle({ velocity: [1.2, 0, 0] }), defaultParticle({ position: [5, 5, 0] }));
    run(set, [], settings, 100);
    const [moving, resting] = [set.get(0), set.get(1)];
    expect(moving.time).toBeCloseTo(10 * Math.sqrt(1 - 0.36), 4);
    expect(resting.time).toBeCloseTo(10, 4);
    expect(moving.position[0]).toBeCloseTo(12, 4);
  });

  it('follows hyperbolic motion under a constant force, below c', () => {
    const [force, mass, dt, t] = [2, 2, 0.01, 10];
    const a = force / mass;
    const uniform = compileForce(makeForce({ expression: `n_j * vec(${force}, 0, 0)`, params: [] }));
    const settings = minkowski({ integrator, timeStep: dt });
    const set = setFor(settings, defaultParticle({ mass }), source);
    run(set, [uniform], settings, Math.round(t / dt));
    const p = set.get(0);
    const tolerance = integrator === 'verlet' ? 1e-4 : 1e-2;
    expect(p.position[0]).toBeCloseTo((C ** 2 / a) * (Math.sqrt(1 + (a * t / C) ** 2) - 1), -Math.log10(tolerance) - 1);
    expect(p.time).toBeCloseTo((C / a) * Math.asinh((a * t) / C), -Math.log10(tolerance) - 1);
    expect(p.velocity[0]).toBeCloseTo((a * t) / Math.sqrt(1 + (a * t / C) ** 2), 4);
    expect(p.velocity[0]).toBeLessThan(C);
  });

  it('matches the Galilean step when c is huge', () => {
    const gravity = compileForce(makeForce({ expression: '-G * m_i * m_j / r^2', params: [{ name: 'G', value: 1 }] }));
    const particles = [defaultParticle({ position: [-1, 0, 0], velocity: [0, -0.4, 0] }), defaultParticle({ position: [1, 0, 0], velocity: [0, 0.4, 0] })];
    const galilean = { ...DEFAULT_SETTINGS, integrator, timeStep: 0.01 };
    const fast = minkowski({ integrator, timeStep: 0.01, lightSpeed: 1e6 });
    const [a, b] = [setFor(galilean, ...particles), setFor(fast, ...particles)];
    run(a, [gravity], galilean, 500);
    run(b, [gravity], fast, 500);
    a.toArray().forEach((p, i) => p.position.forEach((c, axis) => expect(b.get(i).position[axis]).toBeCloseTo(c, 5)));
  });
});

describe('Minkowski with velocity-dependent forces and collisions', () => {
  it('gyrates in a uniform B with |u| kept, radius γmv/(qB) and period 2πγm/(qB)', () => {
    const [B, mass, charge, speed] = [1, 1, 1, 0.8 * C];
    const gamma = 1 / Math.sqrt(1 - 0.64);
    const period = (2 * Math.PI * gamma * mass) / (charge * B);
    const steps = 4000;
    const magnetic = compileForce(makeForce({ expression: `n_j * q_i * cross(v_i, vec(0, 0, ${B}))`, params: [] }));
    const settings = minkowski({ integrator: 'euler', timeStep: period / steps });
    const set = setFor(settings, defaultParticle({ velocity: [speed, 0, 0], charge, mass }), source);
    let farthest = 0;
    const state: ReferenceState = {};
    for (let n = 0; n < steps; n++) {
      referenceStep(set, [magnetic], settings, n * settings.timeStep, state);
      farthest = Math.max(farthest, Math.hypot(...set.get(0).position));
    }
    const p = set.get(0);
    expect(Math.hypot(...p.velocity) / speed).toBeCloseTo(1, 5);
    expect(farthest).toBeCloseTo((2 * gamma * mass * speed) / (charge * B), 2);
    expect(Math.hypot(...p.position)).toBeLessThan(0.01);
    // The clock sums 4000 steps in float32, as the GPU texture does.
    expect(p.time).toBeCloseTo(period / gamma, 3);
  });

  it('swaps the momenta of equal masses colliding head-on (exact elastic collision)', () => {
    const settings = minkowski({ integrator: 'euler', timeStep: 0.01, collisionDistance: 1 });
    const set = setFor(settings, defaultParticle({ position: [-0.45, 0, 0], velocity: [1.8, 0, 0] }), defaultParticle({ position: [0.45, 0, 0], velocity: [-1, 0, 0] }));
    const before = [set.velocity[0]!, set.velocity[4]!];
    referenceStep(set, [], settings, 0);
    expect(set.velocity[0]).toBeCloseTo(before[1]!, 5);
    expect(set.velocity[4]).toBeCloseTo(before[0]!, 5);
  });
});

describe('Minkowski energy and settings', () => {
  it('samples (γ − 1)mc², coordinate speeds, γ and the clock spread', () => {
    const set = setFor(minkowski(), defaultParticle({ velocity: [1.2, 0, 0], mass: 2, time: 3 }), defaultParticle({ time: 5 }));
    const energy = summarizeEnergy(set, set.velocity, new Float32Array(2), [], false);
    expect(energy.kinetic).toBeCloseTo((1.25 - 1) * 2 * C ** 2, 5);
    expect(energy.maxSpeed).toBeCloseTo(1.2, 5);
    expect(summarizeSpacetime(set, set.velocity)).toEqual({ maxGamma: expect.closeTo(1.25, 5), clockMin: 3, clockMax: 5 });
  });

  it('validates the metric, c and the speed clamp', () => {
    expect(validateSettings(minkowski({ maxSpeed: 5 }))).toEqual([expect.stringMatching(/maxSpeed must be 0 with the Minkowski metric/)]);
    expect(validateSettings(minkowski({ lightSpeed: 0 }))).toEqual([expect.stringMatching(/lightSpeed must be within \[1e-18, 1e\+18\]/)]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, maxSpeed: 5 })).toEqual([]);
  });

  it('reads the metric and c from scenario settings', () => {
    const settings = readSettings(new JsonReader('test'), { metric: 'minkowski', lightSpeed: 3 }, 'settings', { ...DEFAULT_SETTINGS });
    expect([settings.metric, settings.lightSpeed]).toEqual(['minkowski', 3]);
    expect(() => readSettings(new JsonReader('test'), { metric: 'curved' }, 'settings', { ...DEFAULT_SETTINGS })).toThrow(/settings.metric/);
  });
});

describe('c_light', () => {
  it('reads the configured c in expressions, under either metric', () => {
    const force = compileForce(makeForce({ expression: 'c_light', params: [] }));
    for (const settings of [minkowski({ lightSpeed: 3 }), { ...DEFAULT_SETTINGS, lightSpeed: 7 }]) {
      const set = setFor(settings, defaultParticle(), defaultParticle({ position: [1, 0, 0] }));
      const pair = pairScope(set, 0, 1, 0, false, settings.lightSpeed);
      expect(force.evaluate(forceScope(force, pair, 1))).toBe(settings.lightSpeed);
    }
    expect(generateVelocityShader([force])).toContain('uLightSpeed');
  });

  it('steps with the settings\' c: a Galilean set needs no setMetric when only c changes', () => {
    const push = compileForce(makeForce({ expression: 'n_j * vec(c_light, 0, 0)', params: [] }));
    const settings = { ...DEFAULT_SETTINGS, integrator: 'euler' as const, timeStep: 1, lightSpeed: 3 };
    const set = setFor(DEFAULT_SETTINGS, defaultParticle(), source);
    referenceStep(set, [push], settings, 0);
    expect(set.get(0).velocity[0]).toBeCloseTo(3, 9);
  });

  it('couples the magnetic preset as k/c² times Biot–Savart', () => {
    const magnetic = compileForce(forceFromPreset('magnetic', { softening: 0, params: [{ name: 'k', value: 2 }] }));
    const biotSavart = compileForce(makeForce({ expression: 'k * q_i * q_j / r^3 * cross(v_i, cross(v_j, d))', params: [{ name: 'k', value: 2 }] }));
    const set = setFor(minkowski({ lightSpeed: 4 }),
      defaultParticle({ position: [0.4, -1, 0.3], velocity: [0.2, 0.5, -0.1], charge: 1.5 }),
      defaultParticle({ position: [-1, 0.8, 0], velocity: [-0.3, 0.1, 0.4], charge: -2 }));
    const pair = pairScope(set, 0, 1, 0, false, 4);
    const dist = Math.hypot(1.4, -1.8, 0.3);
    const a = magnetic.evaluateVector!(forceScope(magnetic, pair, dist));
    const b = biotSavart.evaluateVector!(forceScope(biotSavart, pair, dist));
    a.forEach((c, axis) => expect(c).toBeCloseTo(b[axis]! / 16, 12));
  });
});
