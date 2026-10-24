import { describe, expect, it } from 'vitest';
import { referenceStep } from '../src/engine/cpu/referenceStep';
import { compileForce } from '../src/engine/forces/compile';
import { defaultParticle, ParticleKind, ParticleSet, type Particle } from '../src/engine/particles';
import { DEFAULT_SETTINGS, type SimulationSettings } from '../src/engine/settings';
import { makeForce } from './helpers';

const setOf = (...particles: Particle[]) => {
  const set = new ParticleSet(4);
  set.addAll(particles);
  return set;
};
const settings = (overrides: Partial<SimulationSettings>): SimulationSettings => ({
  ...DEFAULT_SETTINGS, timeStep: 0.01, collisionDistance: 1, ...overrides,
});
const momentum = (set: ParticleSet) => [0, 1, 2].map((k) => set.toArray().reduce((s, p) => s + p.mass * p.velocity[k]!, 0));

describe.each(['euler', 'verlet'] as const)('collisions (%s)', (integrator) => {
  it('swaps velocities in an elastic head-on collision of equal masses', () => {
    const set = setOf(defaultParticle({ position: [-0.4, 0, 0], velocity: [1, 0, 0] }), defaultParticle({ position: [0.4, 0, 0], velocity: [-1, 0, 0] }));
    referenceStep(set, [], settings({ integrator }), 0);
    expect(set.get(0).velocity[0]).toBeCloseTo(-1, 6);
    expect(set.get(1).velocity[0]).toBeCloseTo(1, 6);
  });

  it('leaves a perfectly inelastic pair at the common velocity, conserving momentum', () => {
    const set = setOf(defaultParticle({ position: [-0.4, 0, 0], velocity: [2, 0, 0], mass: 3 }), defaultParticle({ position: [0.4, 0, 0], velocity: [-1, 0, 0] }));
    const before = momentum(set);
    referenceStep(set, [], settings({ integrator, collisionRestitution: 0 }), 0);
    expect(set.get(0).velocity[0]).toBeCloseTo(set.get(1).velocity[0], 6);
    momentum(set).forEach((p, k) => expect(p).toBeCloseTo(before[k]!, 6));
  });

  it('keeps kinetic energy in an elastic oblique collision of unequal masses', () => {
    const set = setOf(defaultParticle({ position: [0, 0, 0], velocity: [1, 0.5, 0], mass: 2 }), defaultParticle({ position: [0.6, 0.3, 0], velocity: [-0.5, 0, 0] }));
    const energy = () => set.toArray().reduce((s, p) => s + 0.5 * p.mass * p.velocity.reduce((a, c) => a + c * c, 0), 0);
    const e0 = energy();
    const p0 = momentum(set);
    referenceStep(set, [], settings({ integrator }), 0);
    expect(energy()).toBeCloseTo(e0, 6);
    momentum(set).forEach((p, k) => expect(p).toBeCloseTo(p0[k]!, 6));
  });

  it('bounds an attraction inside the contact radius to its value at the radius', () => {
    const coulomb = compileForce(makeForce({ expression: 'k * q_i * q_j / r^2', params: [{ name: 'k', value: 1 }] }));
    const set = setOf(defaultParticle({ position: [-0.0005, 0, 0], charge: 1 }), defaultParticle({ position: [0.0005, 0, 0], charge: -1 }));
    referenceStep(set, [coulomb], settings({ integrator, timeStep: 0.01 }), 0);
    expect(Math.abs(set.get(0).velocity[0])).toBeCloseTo(0.01, 6);
  });

  it('bounces off a fixed particle as off an infinite mass', () => {
    const set = setOf(defaultParticle({ position: [-0.4, 0, 0], velocity: [1, 0, 0] }), defaultParticle({ position: [0.4, 0, 0], kind: ParticleKind.fixed }));
    referenceStep(set, [], settings({ integrator }), 0);
    expect(set.get(0).velocity[0]).toBeCloseTo(-1, 6);
    expect(set.get(1).velocity).toEqual([0, 0, 0]);
  });

  it('skips the force of an approaching pair but keeps it for overlapping pairs at rest', () => {
    const repulsion = compileForce(makeForce({ expression: '1', params: [] }));
    const approaching = setOf(defaultParticle({ position: [-0.4, 0, 0], velocity: [0.5, 0, 0] }), defaultParticle({ position: [0.4, 0, 0], velocity: [-0.5, 0, 0] }));
    referenceStep(approaching, [repulsion], settings({ integrator }), 0);
    expect(approaching.get(0).velocity[0]).toBeCloseTo(-0.5, 6);
    const resting = setOf(defaultParticle({ position: [-0.4, 0, 0] }), defaultParticle({ position: [0.4, 0, 0] }));
    referenceStep(resting, [repulsion], settings({ integrator }), 0);
    expect(resting.get(0).velocity[0]).toBeLessThan(0);
  });
});

