import { describe, expect, it } from 'vitest';
import { referencePotentials } from '../src/engine/cpu/energy';
import { addPairForce, pairScope } from '../src/engine/cpu/pairs';
import { referenceStep, type ReferenceState } from '../src/engine/cpu/referenceStep';
import { compileForce, forceScope } from '../src/engine/forces/compile';
import { defaultParticle, ParticleSet, type Particle } from '../src/engine/particles';
import { generateVelocityShader } from '../src/engine/shaders/computeShaders';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { makeForce } from './helpers';

// Spin dipole–dipole energy with a direction-dependent extra term: non-central, symmetric under
// swapping the particles (si_r ↔ −sj_r), so momentum is conserved.
const DIPOLE = compileForce(makeForce({
  mode: 'potential', softening: 0.2,
  expression: 'k * (s_dot - 3 * si_r * sj_r) / r^3 + 0.3 * q_i * q_j * dx * dy / r^4',
  params: [{ name: 'k', value: 2 }],
}));

function setOf(...particles: Particle[]): ParticleSet {
  const set = new ParticleSet(particles.length);
  set.addAll(particles);
  return set;
}

// Spaced so the Verlet run below has no close encounter (the r^-3 terms would need a smaller step).
const A = defaultParticle({ position: [0.6, -0.4, 0.2], spin: [0, 0.6, 0.8], charge: 1.5 });
const B = defaultParticle({ position: [2.8, 1.8, -1], spin: [1, 0, 0.2], charge: -0.5 });

const forceOn = (set: ParticleSet, i: number, j: number) => {
  const out: [number, number, number] = [0, 0, 0];
  const pair = pairScope(set, i, j, 0);
  const d = [0, 1, 2].map((k) => set.position[i * 4 + k]! - set.position[j * 4 + k]!);
  addPairForce([DIPOLE], pair, Math.hypot(...d), out);
  return out;
};

describe('vector forces from V(Δx)', () => {
  it('is the exact gradient: −∇V matches central differences of V', () => {
    const set = setOf(A, B);
    const pair = pairScope(set, 0, 1, 0);
    const dist = Math.hypot(...[0, 1, 2].map((k) => A.position[k]! - B.position[k]!));
    const scope = forceScope(DIPOLE, pair, dist);
    const force = DIPOLE.evaluateVector!(scope);
    const h = 1e-6;
    (['dx', 'dy', 'dz'] as const).forEach((axis, k) => {
      const at = (delta: number) => DIPOLE.evaluatePotential!({ ...scope, [axis]: scope[axis]! + delta });
      const numeric = -(at(h) - at(-h)) / (2 * h);
      expect(Math.abs(force[k]! - numeric)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(numeric)));
    });
    expect(Math.abs(force[0]! * pair.uy - force[1]! * pair.ux)).toBeGreaterThan(1e-3);
  });

  // Without softening; with it, a vector force is the exact gradient of the softened V (Plummer),
  // while a central one applies −V'(r_soft) along r̂ (documented in docs/forces.md).
  it('reduces to the central force for an isotropic V written in dx, dy, dz', () => {
    const central = compileForce(makeForce({ mode: 'potential', expression: 'k * q_i * q_j / r' }));
    const vector = compileForce(makeForce({ mode: 'potential', expression: 'k * q_i * q_j / sqrt(dx^2 + dy^2 + dz^2)' }));
    expect([central.vector, vector.vector]).toEqual([false, true]);
    const set = setOf(A, B);
    const pair = pairScope(set, 0, 1, 0);
    for (const dist of [0.4, 1.7, 6]) {
      const c: [number, number, number] = [0, 0, 0];
      const v: [number, number, number] = [0, 0, 0];
      addPairForce([central], pair, dist, c);
      addPairForce([vector], pair, dist, v);
      v.forEach((value, k) => expect(value).toBeCloseTo(c[k]!, 10));
      expect(vector.evaluate(forceScope(vector, pair, dist))).toBeCloseTo(c[0]! / pair.ux, 10);
    }
  });

  it('obeys Newton’s third law for a pair-symmetric potential', () => {
    const set = setOf(A, B);
    const onA = forceOn(set, 0, 1);
    const onB = forceOn(set, 1, 0);
    onA.forEach((value, k) => expect(value).toBeCloseTo(-onB[k]!, 12));
  });

  it('conserves momentum and energy in the float64 reference (Verlet)', () => {
    const particles = [A, B, defaultParticle({ position: [-2, 2.4, 0.8], spin: [0.5, 0.5, -0.7], charge: 1, velocity: [0.05, 0, 0] })];
    const set = setOf(...particles);
    const settings = { ...DEFAULT_SETTINGS, integrator: 'verlet' as const, timeStep: 1e-3 };
    const totals = () => {
      const p = [0, 1, 2].map((k) => particles.reduce((sum, _, i) => sum + set.attributes[i * 4]! * set.velocity[i * 4 + k]!, 0));
      const kinetic = particles.reduce((sum, _, i) => sum + 0.5 * set.attributes[i * 4]! * [0, 1, 2].reduce((v2, k) => v2 + set.velocity[i * 4 + k]! ** 2, 0), 0);
      const potential = 0.5 * referencePotentials(set, [DIPOLE], 0).reduce((a, b) => a + b, 0);
      return { p, energy: kinetic + potential };
    };
    const start = totals();
    const state: ReferenceState = {};
    for (let step = 0; step < 2000; step++) referenceStep(set, [DIPOLE], settings, step * settings.timeStep, state);
    const end = totals();
    // Velocities are stored in float32 (the GPU layout), so momentum holds to its rounding.
    end.p.forEach((value, k) => expect(Math.abs(value - start.p[k]!)).toBeLessThan(1e-5));
    expect(Math.abs(end.energy - start.energy)).toBeLessThan(1e-4 * Math.abs(start.energy));
    expect(Math.hypot(...[0, 1, 2].map((k) => set.position[k]! - A.position[k]!))).toBeGreaterThan(1e-3);
  });

  it('emits a vec3 gradient function added straight to the force', () => {
    const glsl = generateVelocityShader([DIPOLE]);
    expect(glsl).toContain('vec3 force0(vec3 p, vec4 attr1');
    expect(glsl).toContain('force += force0(contact, attr1');
    expect(glsl).toContain('uF0_soft2');
  });
});
