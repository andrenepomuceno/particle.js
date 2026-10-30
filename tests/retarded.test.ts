import { describe, expect, it } from 'vitest';
import { createHistory, retardedSource } from '../src/engine/cpu/history';
import { pairScope } from '../src/engine/cpu/pairs';
import { referenceStep, type ReferenceState } from '../src/engine/cpu/referenceStep';
import { compileForce, forceScope } from '../src/engine/forces/compile';
import { forceFromPreset } from '../src/engine/forces/presets';
import { defaultParticle, ParticleKind, ParticleSet, type Particle, type Vec3 } from '../src/engine/particles';
import { DEFAULT_SETTINGS, type SimulationSettings } from '../src/engine/settings';
import { makeForce } from './helpers';

const C = 2;
const minkowski = (overrides: Partial<SimulationSettings> = {}): SimulationSettings => ({
  ...DEFAULT_SETTINGS, metric: 'minkowski', lightSpeed: C, integrator: 'euler', timeStep: 0.05, historyDepth: 256, ...overrides,
});

function setFor(settings: SimulationSettings, ...particles: Particle[]): ParticleSet {
  const set = new ParticleSet(particles.length);
  set.setMetric(settings);
  set.addAll(particles);
  return set;
}

const fixed = (position: Vec3) => defaultParticle({ kind: ParticleKind.fixed, position, charge: 1 });

/** Retarded time of x(t) = x0 + v·t seen from `at` at time t: the earlier root of |at − x(t_r)| = c·(t − t_r). */
function analyticRetarded(at: Vec3, x0: Vec3, v: Vec3, t: number): number {
  // With τ = t − t_r and w = at − x0 − v·t: |w + v·τ|² = c²τ².
  const w = at.map((c, k) => c - x0[k]! - v[k]! * t);
  const a = v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2 - C ** 2;
  const b = 2 * (w[0]! * v[0]! + w[1]! * v[1]! + w[2]! * v[2]!);
  const cc = w[0]! ** 2 + w[1]! ** 2 + w[2]! ** 2;
  const tau = (-b - Math.sqrt(b * b - 4 * a * cc)) / (2 * a);
  return t - tau;
}

describe('retarded source', () => {
  it('sees a resting source where it is, light-delayed by r/c', () => {
    const set = setFor(minkowski(), fixed([3, 4, 0]), defaultParticle());
    const history = createHistory(set, 64, 10, 0.1);
    const source = retardedSource(set, history, 1, [3, 4, 0], 10, C);
    expect(source.delta.map((c) => +c.toFixed(9))).toEqual([3, 4, 0]);
    expect(source.delay).toBeCloseTo(5 / C, 9);
    expect(source.retarded).toBe(true);
  });

  it('finds the exact retarded event of a uniformly moving source', () => {
    const v: Vec3 = [1.2, -0.5, 0.3];
    const set = setFor(minkowski(), fixed([4, 2, -1]), defaultParticle({ velocity: v }));
    const history = createHistory(set, 256, 0, 0.05);
    const source = retardedSource(set, history, 1, [4, 2, -1], 0, C);
    const tr = analyticRetarded([4, 2, -1], [0, 0, 0], v, 0);
    // The trajectory interpolates exactly, but the gap's curvature leaves an O(dt²) error in the root.
    expect(source.delay).toBeCloseTo(-tr, 4);
    source.delta.forEach((c, k) => expect(c).toBeCloseTo([4, 2, -1][k]! - v[k]! * tr, 4));
    source.velocity.forEach((c, k) => expect(c).toBeCloseTo(v[k]!, 5));
    source.acceleration.forEach((c) => expect(c).toBeCloseTo(0, 9));
  });

  it('falls back to the present beyond the history', () => {
    const set = setFor(minkowski(), fixed([30, 0, 0]), defaultParticle({ velocity: [0.5, 0, 0] }));
    // Reach: c·(depth − 1)·dt = 2·7·0.1 = 1.4, far short of 30.
    const source = retardedSource(set, createHistory(set, 8, 0, 0.1), 1, [30, 0, 0], 0, C);
    expect(source.retarded).toBe(false);
    expect([source.delta, source.delay]).toEqual([[30, 0, 0], 0]);
  });
});

describe('retarded forces', () => {
  it('reproduce, with Liénard–Wiechert, the field of a uniformly moving charge measured from its present position', () => {
    // Heaviside: E = k·q·(1 − β²)·R / (R³·(1 − β²·sin²ψ)^{3/2}), R from the present position, ψ its angle to v.
    const v: Vec3 = [1.4, 0, 0];
    const at: Vec3 = [1.5, 3, 0];
    const set = setFor(minkowski(), fixed(at), defaultParticle({ velocity: v, charge: 1 }));
    const history = createHistory(set, 256, 0, 0.02);
    const source = retardedSource(set, history, 1, at, 0, C);
    const lw = compileForce(forceFromPreset('lienardWiechert', { softening: 0 }));
    const distance = Math.hypot(...source.delta);
    const pair = {
      ...pairScope(set, 0, 1, 0, false, C), ux: source.delta[0] / distance, uy: source.delta[1] / distance, uz: source.delta[2] / distance,
      vx_j: source.velocity[0], vy_j: source.velocity[1], vz_j: source.velocity[2], ax_j: 0, ay_j: 0, az_j: 0, t_ret: source.delay,
    };
    const force = lw.evaluateVector!(forceScope(lw, pair, distance));
    const beta2 = (1.4 / C) ** 2;
    const R = Math.hypot(...at);
    const sin2 = (at[1] / R) ** 2;
    const heaviside = at.map((c) => ((1 - beta2) * c) / (R ** 3 * (1 - beta2 * sin2) ** 1.5));
    force.forEach((c, k) => expect(c).toBeCloseTo(heaviside[k]!, 5));
  });

  it('let a distant charge notice a kick only r/c later', () => {
    const settings = minkowski({ timeStep: 0.1 });
    const coulomb = compileForce(makeForce({ expression: 'k * q_i * q_j / r^2', params: [{ name: 'k', value: 1 }], retarded: true }));
    const observer: Vec3 = [8, 0, 0];
    const set = setFor(settings, fixed(observer), defaultParticle({ charge: 1, mass: 1e9 }));
    const state: ReferenceState = {};
    referenceStep(set, [coulomb], settings, 0, state);
    // A sudden kick: the history keeps the source at rest until now.
    set.set(1, { ...set.get(1), velocity: [0, 1.5, 0] });
    const seen: number[] = [];
    for (let n = 1; n <= 60; n++) {
      referenceStep(set, [coulomb], settings, n * 0.1, state);
      const t = (n + 1) * 0.1;
      seen.push(retardedSource(set, state.history!, 1, observer, t, C).delta[1]!);
    }
    // The kick happened at t = 0.1; its news reaches x = 8 at 0.1 + 8/c = 4.1 (step n = 40).
    seen.slice(0, 38).forEach((dy) => expect(dy).toBeCloseTo(0, 6));
    expect(seen[45]!).toBeLessThan(-0.1);
  });

  it('act instantaneously under the Galilean metric', () => {
    const settings: SimulationSettings = { ...DEFAULT_SETTINGS, integrator: 'euler', timeStep: 0.05 };
    const law = { expression: 'k * q_i * q_j / r^2', params: [{ name: 'k', value: 1 }] };
    const particles = [defaultParticle({ charge: 1, velocity: [0.3, 0, 0] }), defaultParticle({ charge: 1, position: [2, 1, 0] })];
    const [a, b] = [setFor(settings, ...particles), setFor(settings, ...particles)];
    const [retarded, instantaneous] = [compileForce(makeForce({ ...law, retarded: true })), compileForce(makeForce(law))];
    for (let n = 0; n < 20; n++) {
      referenceStep(a, [retarded], settings, n * 0.05);
      referenceStep(b, [instantaneous], settings, n * 0.05);
    }
    expect(a.toArray()).toEqual(b.toArray());
  });

  it('feel an overlapping source at the contact radius, as instantaneous forces do', () => {
    const settings = minkowski({ collisionDistance: 1, collisionRestitution: 1 });
    const law = { expression: '-k * q_i * q_j / r^2', params: [{ name: 'k', value: 1 }] };
    // At rest and overlapping (0.1 apart, inside the 1 contact radius): no impulse, the force at r = 1.
    const particles = [defaultParticle({ charge: 1 }), defaultParticle({ charge: 1, position: [0.1, 0, 0] })];
    const [a, b] = [setFor(settings, ...particles), setFor(settings, ...particles)];
    referenceStep(a, [compileForce(makeForce({ ...law, retarded: true }))], settings, 0);
    referenceStep(b, [compileForce(makeForce(law))], settings, 0);
    expect(a.get(0).velocity[0]).toBeCloseTo(b.get(0).velocity[0], 9);
    // |Δu| = F·dt/m = 1·dt at r = 1 (v = u/γ reads slightly less).
    expect(Math.abs(a.velocity[0]!)).toBeCloseTo(settings.timeStep, 6);
  });

  it('refuses a retarded potential', () => {
    expect(() => compileForce(makeForce({ mode: 'potential', expression: '1 / r', params: [], retarded: true }))).toThrow(/retarded force must be in force mode/);
  });
});
