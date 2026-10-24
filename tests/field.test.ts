import { describe, expect, it } from 'vitest';
import { referenceField } from '../src/engine/cpu/field';
import { referenceStep } from '../src/engine/cpu/referenceStep';
import {
  DEFAULT_PROBE, fieldGrid, fieldReference, fieldView, validateColumns, validateProbe, type CameraPose, type FieldProbe,
} from '../src/engine/field';
import { compileForce } from '../src/engine/forces/compile';
import { defaultParticle, ParticleSet, type Particle } from '../src/engine/particles';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { makeForce } from './helpers';

const forces = [
  compileForce(makeForce({ expression: 'k * q_i * q_j / r^2', softening: 0.3 })),
  compileForce(makeForce({ id: 'n', expression: 'n_i * n_j * s_i * (1 + s_j) * sin(x) + c_dot * t_j + 0.01 * time', range: 'short', cutoff: 2.5 })),
  compileForce(makeForce({ id: 'g', mode: 'potential', expression: '-G * m_i * m_j / r', params: [{ name: 'G', value: 0.7 }] })),
];

const particles: Particle[] = [
  defaultParticle({ position: [0, 0, 0], charge: 1, spin: 0.5, nuclearCharge: 1, color: [1, 0, 0], mass: 2 }),
  defaultParticle({ position: [1, 0.5, 0], charge: -1, spin: -1, nuclearCharge: 2, color: [0, 1, 0], time: 3 }),
  defaultParticle({ position: [-1.5, 2, 0.5], charge: 2, nuclearCharge: -1, color: [0, 0, -1], time: 1 }),
  defaultParticle({ position: [4, -1, 0], charge: -2, mass: 0.5 }),
];

function setOf(list: Particle[]): ParticleSet {
  const set = new ParticleSet(list.length);
  set.addAll(list);
  return set;
}

const probeOf = (p: Particle): FieldProbe => ({
  mass: p.mass, charge: p.charge, spin: p.spin, parity: p.parity, nuclearCharge: p.nuclearCharge, color: p.color,
});

describe('referenceField', () => {
  it('equals the force referenceStep applies to a particle with the probe attributes at the probe position', () => {
    const dt = 1e-3;
    const time = 2;
    const set = setOf(particles);
    referenceStep(set, forces, { ...DEFAULT_SETTINGS, integrator: 'euler', timeStep: dt }, time);
    // Particle 0 has clock 0, the probe's clock, so its t_i matches.
    const p = particles[0]!;
    const field = referenceField(setOf(particles), forces, probeOf(p), p.position, time);
    const after = set.get(0).velocity;
    for (let k = 0; k < 3; k++) expect(field[k]!).toBeCloseTo((p.mass * after[k]!) / dt, 4);
    expect(Math.hypot(...field)).toBeGreaterThan(0.1);
  });

  it('is linear in the test charge for a Coulomb force', () => {
    const set = setOf(particles);
    const positions = [2, 2, 0, -3, 1, 0];
    const one = referenceField(set, [forces[0]!], DEFAULT_PROBE, positions, 0);
    const minusTwo = referenceField(set, [forces[0]!], { ...DEFAULT_PROBE, charge: -2 }, positions, 0);
    one.forEach((value, k) => expect(minusTwo[k]!).toBeCloseTo(-2 * value, 10));
  });

  it('is zero without forces or particles', () => {
    expect([...referenceField(setOf(particles), [], DEFAULT_PROBE, [1, 1, 1], 0)]).toEqual([0, 0, 0]);
    expect([...referenceField(new ParticleSet(1), forces, DEFAULT_PROBE, [1, 1, 1], 0)]).toEqual([0, 0, 0]);
  });
});

const pose = (overrides: Partial<CameraPose> = {}): CameraPose => ({
  position: [10, 20, 100], target: [10, 20, 0], direction: [0, 0, -1], right: [1, 0, 0], fovDegrees: 90, aspect: 2, ...overrides,
});

describe('fieldView', () => {
  it('covers exactly the visible rectangle of the target plane', () => {
    const view = fieldView(pose(), false);
    expect(view.center).toEqual([10, 20, 0]);
    expect(view.halfHeight).toBeCloseTo(100, 9);
    expect(view.halfWidth).toBeCloseTo(200, 9);
    expect(view.up[1]).toBeCloseTo(1, 9);
  });

  it('lies in z = 0 in 2D mode even if the target is off-plane', () => {
    const view = fieldView(pose({ target: [10, 20, 5] }), true);
    expect(view.center).toEqual([10, 20, 0]);
    expect(view.right[2]).toBe(0);
    expect(view.up[2]).toBe(0);
    expect(view.halfHeight).toBeCloseTo(100, 9);
  });

  it('faces a tilted camera in 3D with orthonormal axes', () => {
    const d = Math.SQRT1_2;
    const view = fieldView(pose({ position: [0, -50, 50], target: [0, 0, 0], direction: [0, d, -d], right: [1, 0, 0] }), false);
    const n = [0, -d, d];
    expect(view.up.reduce((s, c, k) => s + c * n[k]!, 0)).toBeCloseTo(0, 9);
    expect(view.right.reduce((s, c, k) => s + c * view.up[k]!, 0)).toBeCloseTo(0, 9);
    expect(view.halfHeight).toBeCloseTo(50 * Math.SQRT2, 6);
  });

  it('fails when the camera sits on the plane', () => {
    expect(() => fieldView(pose({ position: [10, 20, 0] }), true)).toThrow(/camera sits on the field plane/);
  });
});

describe('fieldGrid', () => {
  const view = { center: [1, 2, 0] as [number, number, number], right: [1, 0, 0] as [number, number, number], up: [0, 1, 0] as [number, number, number], halfWidth: 10, halfHeight: 5 };

  it('uses square cells and centers probes in them', () => {
    const grid = fieldGrid(view, 4);
    expect(grid).toMatchObject({ columns: 4, rows: 2, count: 8, spacing: 5 });
    expect([...grid.positions.subarray(0, 3)]).toEqual([1 - 7.5, 2 - 2.5, 0]);
    expect([...grid.positions.subarray(21, 24)]).toEqual([1 + 7.5, 2 + 2.5, 0]);
  });

  it('keeps at least one row for very wide views', () => {
    expect(fieldGrid({ ...view, halfHeight: 0.1 }, 3).rows).toBe(1);
  });

  it('rejects bad column counts with the limit', () => {
    expect(() => fieldGrid(view, 1)).toThrow(/integer in \[2, 256\], got 1/);
    expect(validateColumns(2.5)).toMatch(/got 2.5/);
    expect(validateColumns(256)).toBeUndefined();
  });
});

describe('fieldReference', () => {
  it('takes the 90th percentile of the finite non-zero magnitudes', () => {
    const magnitudes = [...Array.from({ length: 100 }, (_, k) => k + 1), 0, NaN, Infinity, 1e9];
    expect(fieldReference(magnitudes)).toBe(91);
  });

  it('ignores a single spike that would dominate the mean', () => {
    expect(fieldReference([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1e6])).toBe(1);
  });

  it('is 0 when no probe feels a force', () => {
    expect(fieldReference([0, 0, NaN])).toBe(0);
    expect(fieldReference([])).toBe(0);
  });
});

describe('validateProbe', () => {
  it('accepts the default and names bad fields', () => {
    expect(validateProbe(DEFAULT_PROBE)).toEqual([]);
    expect(validateProbe({ ...DEFAULT_PROBE, mass: 0, color: [0, NaN, 0] })).toEqual([
      'test particle color[1] must be finite, got NaN',
      'test particle mass must be > 0, got 0',
    ]);
  });
});
