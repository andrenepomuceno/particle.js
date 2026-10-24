import { describe, expect, it } from 'vitest';
import { addPairForce, pairScope } from '../src/engine/cpu/pairs';
import { implicitKick, referenceStep } from '../src/engine/cpu/referenceStep';
import { compileForce, forceScope } from '../src/engine/forces/compile';
import { defaultParticle, ParticleKind, ParticleSet, type Particle } from '../src/engine/particles';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { makeForce } from './helpers';

function setOf(...particles: Particle[]): ParticleSet {
  const set = new ParticleSet(particles.length);
  set.addAll(particles);
  return set;
}

// A uniform magnetic field along z felt by charge q_i, written as a pair force with a fixed partner.
const B = 2;
const uniform = compileForce(makeForce({ expression: `n_j * q_i * cross(v_i, vec(0, 0, ${B}))`, params: [] }));

describe('velocity-dependent vector forces', () => {
  it('gives ∂F/∂v_i matching finite differences', () => {
    const force = compileForce(makeForce({
      expression: 'k * q_i * q_j / r^3 * cross(v_i, cross(v_j, d)) - c * v_dot * rhat', params: [{ name: 'k', value: 3 }, { name: 'c', value: 0.7 }],
    }));
    expect([force.kind, force.jacobian]).toEqual(['vector', true]);
    const set = setOf(defaultParticle({ position: [0.4, -1, 0.3], velocity: [0.2, 0.5, -0.1], charge: 1.5 }),
      defaultParticle({ position: [-1, 0.8, 0], velocity: [-0.3, 0.1, 0.4], charge: -2 }));
    const pair = pairScope(set, 0, 1, 0);
    const dist = Math.hypot(1.4, -1.8, 0.3);
    const scope = forceScope(force, pair, dist);
    const jacobian = force.evaluateWithJacobian!(scope).J;
    const h = 1e-6;
    (['vx_i', 'vy_i', 'vz_i'] as const).forEach((name, l) => {
      const plus = force.evaluateVector!({ ...scope, [name]: scope[name]! + h });
      const minus = force.evaluateVector!({ ...scope, [name]: scope[name]! - h });
      for (let k = 0; k < 3; k++) expect(jacobian[k]![l]!).toBeCloseTo((plus[k]! - minus[k]!) / (2 * h), 6);
    });
  });

  it('gyrates on a closed circle of radius m v / (q B) with |v| preserved (Boris-exact step)', () => {
    const [m, q, v] = [2, 1, 0.5];
    const set = setOf(
      defaultParticle({ position: [0, 0, 0], velocity: [v, 0, 0], mass: m, charge: q }),
      defaultParticle({ position: [1e3, 0, 0], kind: ParticleKind.fixed, nuclearCharge: 1 }),
    );
    const period = (2 * Math.PI * m) / (q * B);
    const steps = 400;
    const settings = { ...DEFAULT_SETTINGS, integrator: 'verlet' as const, timeStep: period / steps };
    let farthest = 0;
    for (let k = 0; k < steps; k++) {
      referenceStep(set, [uniform], settings, k * settings.timeStep);
      const p = set.get(0).position;
      farthest = Math.max(farthest, Math.hypot(p[0], p[1]));
      expect(Math.hypot(...set.get(0).velocity)).toBeCloseTo(v, 6);
    }
    expect(farthest).toBeCloseTo((2 * m * v) / (q * B), 2);
    // Implicit midpoint lags the phase by O(dt²) per turn but closes the orbit.
    expect(Math.hypot(...set.get(0).position)).toBeLessThan(5e-3);
  });

  it('solves the implicit kick exactly for a rotation', () => {
    // F = v × (0,0,B) at v = (1,0,0): J = ∂F/∂v rows [[0,B,0],[-B,0,0],[0,0,0]].
    const kick = implicitKick([0, -B, 0], [0, B, 0, -B, 0, 0, 0, 0, 0], 1, 0.1);
    const after = [1 + kick[0], kick[1], kick[2]];
    expect(Math.hypot(...after)).toBeCloseTo(1, 12);
  });

  it('attracts parallel currents (Biot–Savart between moving charges)', () => {
    const biotSavart = compileForce(makeForce({ expression: 'k * q_i * q_j / r^3 * cross(v_i, cross(v_j, d))', params: [{ name: 'k', value: 1 }] }));
    const set = setOf(defaultParticle({ position: [0, 1, 0], velocity: [1, 0, 0], charge: 1 }), defaultParticle({ position: [0, -1, 0], velocity: [1, 0, 0], charge: 1 }));
    const out: [number, number, number] = [0, 0, 0];
    addPairForce([biotSavart], pairScope(set, 0, 1, 0), 2, out);
    expect(out[1]).toBeLessThan(0);
    expect(out[1]).toBeCloseTo(-1 / 4, 12);
    expect([out[0], out[2]]).toEqual([0, 0]);
  });
});
