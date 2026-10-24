import { describe, expect, it } from 'vitest';
import { compileForce } from '../src/engine/forces/compile';
import { appliedForce, DEFAULT_PLOT_PARTICLES, plotPair, resultantPotential } from '../src/engine/forces/resultant';
import { makeForce } from './helpers';

const at = (curve: ReturnType<typeof resultantPotential>, d: number) => {
  const p = curve!.points.reduce((best, q) => (Math.abs(q.d - d) < Math.abs(best.d - d) ? q : best));
  return p.v;
};

describe('resultantPotential', () => {
  it('sums potential-mode V exactly and integrates force-mode F to zero at the right edge', () => {
    const coulombV = compileForce(makeForce({ id: 'a', name: 'V', mode: 'potential', expression: 'k * q_i * q_j / r', params: [{ name: 'k', value: 2 }] }));
    const coulombF = compileForce(makeForce({ id: 'b', name: 'F', expression: 'k * q_i * q_j / r^2', params: [{ name: 'k', value: 3 }] }));
    const curve = resultantPotential([coulombV, coulombF], 'long', { samples: 2000 })!;
    expect(curve.maxDistance).toBe(100);
    expect(curve.integrated).toEqual(['F']);
    for (const d of [2, 10, 50]) {
      const exact = 2 / d + (3 / d - 3 / 100);
      expect(at(curve, d)).toBeCloseTo(exact, 3);
    }
    expect(curve.points.at(-1)!.v).toBeCloseTo(2 / 100, 12);
  });

  it('keeps ranges apart and drops a short-range V beyond its cutoff', () => {
    const well = compileForce(makeForce({ mode: 'potential', range: 'short', cutoff: 4, expression: '-1 + 0 * r', params: [] }));
    const gravity = compileForce(makeForce({ mode: 'potential', expression: '-m_i * m_j / r', params: [] }));
    const short = resultantPotential([well, gravity], 'short', { samples: 120 })!;
    expect(short.maxDistance).toBeCloseTo(4.8, 12);
    expect(at(short, 2)).toBe(-1);
    expect(at(short, 4.5)).toBe(0);
    expect(resultantPotential([gravity], 'short')).toBeUndefined();
  });

  it('plots a softened potential exactly: its slope is the applied force', () => {
    const potential = compileForce(makeForce({ mode: 'potential', softening: 5, expression: 'k * q_i * q_j / r', params: [{ name: 'k', value: 2 }] }));
    const curve = resultantPotential([potential], 'long', { samples: 2000 })!;
    expect(curve.integrated).toEqual([]);
    const h = curve.points[1]!.d - curve.points[0]!.d;
    for (const k of [20, 200, 1500]) {
      const slope = -(curve.points[k + 1]!.v - curve.points[k - 1]!.v) / (2 * h);
      expect(slope).toBeCloseTo(appliedForce(potential, curve.points[k]!.d), 5);
    }
  });

  it('uses the given pair and distance range', () => {
    const coulomb = compileForce(makeForce({ mode: 'potential', expression: 'q_i * q_j / r', params: [] }));
    const pair = plotPair({ ...DEFAULT_PLOT_PARTICLES, j: { ...DEFAULT_PLOT_PARTICLES.j, charge: -3 } });
    const curve = resultantPotential([coulomb], 'long', { pair, maxDistance: 10, samples: 10 })!;
    expect(curve.points.map((p) => p.d)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(curve.points[1]!.v).toBeCloseTo(-1.5, 12);
    expect(() => resultantPotential([coulomb], 'long', { maxDistance: 0 })).toThrow(/plot distance must be > 0, got 0/);
  });
});
