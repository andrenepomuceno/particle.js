import { describe, expect, it } from 'vitest';
import { referenceStep, type ReferenceState } from '../src/engine/cpu/referenceStep';
import { referencePotentials, summarizeEnergy } from '../src/engine/cpu/energy';
import { compileForce } from '../src/engine/forces/compile';
import { defaultParticle, ParticleKind, ParticleSet, type Particle } from '../src/engine/particles';
import { DEFAULT_SETTINGS, type SimulationSettings } from '../src/engine/settings';
import { makeForce } from './helpers';

const gravity = compileForce(makeForce({ expression: '-G * m_i * m_j / r^2', params: [{ name: 'G', value: 1 }] }));

function setOf(...particles: Particle[]): ParticleSet {
  const set = new ParticleSet(Math.max(particles.length, 1));
  set.addAll(particles);
  return set;
}

// These cases pin down the semi-implicit Euler formulas; Verlet has its own block below.
const settings = (overrides: Partial<SimulationSettings> = {}): SimulationSettings => ({
  ...DEFAULT_SETTINGS, timeStep: 0.1, integrator: 'euler', ...overrides,
});

describe('referenceStep (Euler)', () => {
  it('applies symplectic Euler: v += a dt, then x += v dt', () => {
    const set = setOf(defaultParticle({ position: [-1, 0, 0] }), defaultParticle({ position: [1, 0, 0], mass: 2 }));
    referenceStep(set, [gravity], settings(), 0);
    const a = set.get(0);
    expect(a.velocity[0]).toBeCloseTo(0.1 * 2 / 4, 6);
    expect(a.position[0]).toBeCloseTo(-1 + 0.1 * 0.05, 6);
    expect(set.get(1).velocity[0]).toBeCloseTo(-0.1 / 4, 6);
    expect(a.time).toBeCloseTo(0.1, 6);
  });

  it('conserves momentum for a pairwise force', () => {
    const set = setOf(
      defaultParticle({ position: [0, 0, 0], mass: 1 }),
      defaultParticle({ position: [1, 2, 0], mass: 3 }),
      defaultParticle({ position: [-2, 1, 1], mass: 2 }),
    );
    for (let k = 0; k < 20; k++) referenceStep(set, [gravity], settings(), k);
    const momentum = [0, 1, 2].map((axis) => set.toArray().reduce((sum, p) => sum + p.mass * p.velocity[axis]!, 0));
    momentum.forEach((component) => expect(component).toBeCloseTo(0, 5));
  });

  it('ignores short-range forces beyond the cutoff', () => {
    const short = compileForce(makeForce({ range: 'short', cutoff: 1.5, expression: '1', params: [] }));
    const set = setOf(defaultParticle({ position: [0, 0, 0] }), defaultParticle({ position: [2, 0, 0] }));
    referenceStep(set, [short], settings(), 0);
    expect(set.get(0).velocity).toEqual([0, 0, 0]);
  });

  it('softens the distance seen by the expression', () => {
    const soft = compileForce(makeForce({ softening: 3, expression: 'r', params: [] }));
    const set = setOf(defaultParticle({ position: [0, 0, 0] }), defaultParticle({ position: [4, 0, 0] }));
    referenceStep(set, [soft], settings({ timeStep: 1 }), 0);
    expect(set.get(0).velocity[0]).toBeCloseTo(-5, 6);
  });

  it('keeps fixed particles still while advancing their clock', () => {
    const set = setOf(defaultParticle({ kind: ParticleKind.fixed, velocity: [1, 1, 1] }), defaultParticle({ position: [1, 0, 0] }));
    referenceStep(set, [gravity], settings(), 0);
    expect(set.get(0).position).toEqual([0, 0, 0]);
    expect(set.get(0).velocity).toEqual([0, 0, 0]);
    expect(set.get(0).time).toBeCloseTo(0.1, 6);
  });

  it('skips coincident particles instead of producing NaN', () => {
    const set = setOf(defaultParticle(), defaultParticle());
    referenceStep(set, [gravity], settings(), 0);
    expect(set.get(0).velocity).toEqual([0, 0, 0]);
  });

  it('applies friction, speed clamp and 2D mode', () => {
    const set = setOf(defaultParticle({ velocity: [3, 4, 5] }));
    referenceStep(set, [], settings({ friction: 1, maxSpeed: 2, mode2D: true, timeStep: 1 }), 0);
    const v = set.get(0).velocity;
    expect(Math.hypot(...v)).toBeCloseTo(Math.min(2, 5 * Math.exp(-1)), 6);
    expect(v[2]).toBe(0);
    expect(set.get(0).position[2]).toBe(0);
  });

  it('bounces off a sphere and stays inside it', () => {
    const set = setOf(defaultParticle({ position: [9.5, 0, 0], velocity: [1, 0, 0] }));
    referenceStep(set, [], settings({ boundary: 'sphere', boundarySize: 10, restitution: 0.5, timeStep: 1 }), 0);
    expect(set.get(0).velocity[0]).toBeCloseTo(-0.5, 6);
    expect(Math.hypot(...set.get(0).position)).toBeLessThanOrEqual(10);
  });

  it('bounces off a box per axis', () => {
    const set = setOf(defaultParticle({ position: [9.5, 0, 9.9], velocity: [1, 1, 1] }));
    referenceStep(set, [], settings({ boundary: 'box', boundarySize: 10, timeStep: 1 }), 0);
    expect(set.get(0).velocity).toEqual([-1, 1, -1]);
  });

  it('clamps escaped particles back into the boundary', () => {
    const sphere = setOf(defaultParticle({ position: [30, 0, 0], velocity: [-1, 0, 0] }));
    referenceStep(sphere, [], settings({ boundary: 'sphere', boundarySize: 10, timeStep: 1 }), 0);
    expect(sphere.get(0).position[0]).toBeCloseTo(10, 5);
    const box = setOf(defaultParticle({ position: [30, -30, 0], velocity: [-1, 1, 0] }));
    referenceStep(box, [], settings({ boundary: 'box', boundarySize: 10, timeStep: 1 }), 0);
    expect(box.get(0).position).toEqual([10, -10, 0]);
  });
});

describe('referenceStep (velocity Verlet)', () => {
  const verlet = (overrides: Partial<SimulationSettings> = {}) => settings({ integrator: 'verlet', ...overrides });

  it('drifts with x + v dt + a dt^2 / 2 and kicks with the average acceleration', () => {
    const spring = compileForce(makeForce({ mode: 'potential', expression: '0.5 * k * r^2', params: [{ name: 'k', value: 1 }] }));
    const set = setOf(defaultParticle({ position: [-1, 0, 0] }), defaultParticle({ kind: ParticleKind.fixed, position: [1, 0, 0] }));
    referenceStep(set, [spring], verlet({ timeStep: 0.1 }), 0);
    const x1 = -1 + 0.5 * 0.01 * 2;
    expect(set.get(0).position[0]).toBeCloseTo(x1, 6);
    expect(set.get(0).velocity[0]).toBeCloseTo(0.5 * 0.1 * (2 + (1 - x1)), 6);
  });

  it('reuses the stored acceleration instead of recomputing it', () => {
    const set = setOf(defaultParticle({ position: [-1, 0, 0] }), defaultParticle({ position: [1, 0, 0] }));
    const state: ReferenceState = { acceleration: new Float64Array([5, 0, 0, -5, 0, 0]) };
    referenceStep(set, [], verlet({ timeStep: 1 }), 0, state);
    expect(set.get(0).position[0]).toBeCloseTo(-1 + 2.5, 6);
    expect(state.acceleration).toEqual(new Float64Array(6));
  });

  it('conserves energy far better than Euler at the same step', () => {
    const gravity = compileForce(makeForce({ mode: 'potential', expression: '-G * m_i * m_j / r', params: [{ name: 'G', value: 1 }] }));
    const drift = (integrator: SimulationSettings['integrator']) => {
      const set = setOf(defaultParticle({ position: [-5, 0, 0], velocity: [0, -0.2, 0] }), defaultParticle({ position: [5, 0, 0], velocity: [0, 0.2, 0] }));
      const s = settings({ integrator, timeStep: 0.5 });
      const energy = () => summarizeEnergy(set, set.velocity, referencePotentials(set, [gravity], 0), [gravity], false);
      const start = energy();
      const state: ReferenceState = {};
      let worst = 0;
      for (let k = 0; k < 400; k++) {
        referenceStep(set, [gravity], s, k * 0.5, state);
        const e = energy();
        worst = Math.max(worst, Math.abs(e.kinetic + e.potential - start.kinetic - start.potential));
      }
      return worst;
    };
    expect(drift('verlet')).toBeLessThan(drift('euler') / 5);
  });

  it('is time-reversible: flipping velocities retraces the path', () => {
    const gravity = compileForce(makeForce({ mode: 'potential', expression: '-G * m_i * m_j / r', params: [{ name: 'G', value: 1 }] }));
    const set = setOf(defaultParticle({ position: [-5, 0, 0], velocity: [0, -0.2, 0] }), defaultParticle({ position: [5, 1, 0], velocity: [0.1, 0.2, 0] }));
    const s = verlet({ timeStep: 0.1 });
    for (let k = 0; k < 100; k++) referenceStep(set, [gravity], s, 0);
    set.toArray().forEach((p, k) => set.set(k, { ...p, velocity: p.velocity.map((c) => -c) as typeof p.velocity }));
    for (let k = 0; k < 100; k++) referenceStep(set, [gravity], s, 0);
    expect(set.get(0).position[0]).toBeCloseTo(-5, 3);
    expect(set.get(1).position[1]).toBeCloseTo(1, 3);
  });

  it('keeps fixed particles still and advances every clock', () => {
    const set = setOf(defaultParticle({ kind: ParticleKind.fixed }), defaultParticle({ position: [3, 0, 0] }));
    referenceStep(set, [gravity], verlet(), 0);
    expect(set.get(0).position).toEqual([0, 0, 0]);
    expect(set.get(0).time).toBeCloseTo(0.1, 6);
    expect(set.get(1).time).toBeCloseTo(0.1, 6);
  });
});
