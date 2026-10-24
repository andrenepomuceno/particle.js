import { describe, expect, it } from 'vitest';
import { referenceStep } from '../src/engine/cpu/referenceStep';
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

const settings = (overrides: Partial<SimulationSettings> = {}): SimulationSettings => ({
  ...DEFAULT_SETTINGS, timeStep: 0.1, ...overrides,
});

describe('referenceStep', () => {
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
