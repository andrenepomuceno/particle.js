import { describe, expect, it } from 'vitest';
import { referencePotentials, summarizeEnergy } from '../src/engine/cpu/energy';
import { referenceStep } from '../src/engine/cpu/referenceStep';
import { compileForce } from '../src/engine/forces/compile';
import { defaultParticle, ParticleKind, ParticleSet } from '../src/engine/particles';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { makeForce } from './helpers';

const gravityPotential = compileForce(makeForce({ mode: 'potential', expression: '-G * m_i * m_j / r', params: [{ name: 'G', value: 1 }] }));

function energy(set: ParticleSet, forces = [gravityPotential]) {
  return summarizeEnergy(set, set.velocity, referencePotentials(set, forces, 0), forces, false);
}

describe('energy', () => {
  it('sums kinetic and pair potential energy once per pair', () => {
    const set = new ParticleSet(4);
    set.addAll([defaultParticle({ velocity: [3, 4, 0], mass: 2 }), defaultParticle({ position: [2, 0, 0] })]);
    const e = energy(set);
    expect(e.kinetic).toBeCloseTo(25, 5);
    expect(e.potential).toBeCloseTo(-(1 * 2 * 1) / 2, 5);
    expect(e.meanSpeed).toBeCloseTo(2.5, 5);
    expect(e.maxSpeed).toBeCloseTo(5, 5);
    expect(e.temperature).toBeCloseTo(25 / 2 / 1.5, 5);
    expect(e.missing).toEqual([]);
  });

  it('lists force-mode forces whose energy is not included', () => {
    const set = new ParticleSet(1);
    set.add(defaultParticle());
    expect(energy(set, [compileForce(makeForce({ name: 'Coulomb F' }))]).missing).toEqual(['Coulomb F']);
  });

  it('excludes fixed particles from kinetic energy and temperature', () => {
    const set = new ParticleSet(4);
    set.addAll([defaultParticle({ kind: ParticleKind.fixed, velocity: [9, 0, 0] }), defaultParticle({ velocity: [1, 0, 0] })]);
    expect(energy(set, []).kinetic).toBeCloseTo(0.5, 6);
  });

  it('is conserved by the integrator for a bound pair (V and F agree)', () => {
    const set = new ParticleSet(4);
    set.addAll([
      defaultParticle({ position: [-5, 0, 0], velocity: [0, -0.2, 0] }),
      defaultParticle({ position: [5, 0, 0], velocity: [0, 0.2, 0] }),
    ]);
    const settings = { ...DEFAULT_SETTINGS, timeStep: 0.01 };
    const start = energy(set);
    for (let k = 0; k < 2000; k++) referenceStep(set, [gravityPotential], settings, k * 0.01);
    const end = energy(set);
    const total = (e: typeof start) => e.kinetic + e.potential;
    expect(Math.abs(total(end) - total(start))).toBeLessThan(1e-3 * Math.abs(total(start)));
  });
});
