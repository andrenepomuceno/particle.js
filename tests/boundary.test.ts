import { describe, expect, it } from 'vitest';
import { referenceStep } from '../src/engine/cpu/referenceStep';
import { defaultParticle, ParticleSet } from '../src/engine/particles';
import { BoundaryLines } from '../src/engine/render/BoundaryLines';
import { boxHalfSize, DEFAULT_SETTINGS, validateSettings } from '../src/engine/settings';

describe('slab boxes (boundaryDepth)', () => {
  it('uses boundaryDepth along z, or boundarySize when it is 0', () => {
    expect(boxHalfSize({ boundarySize: 50, boundaryDepth: 4 })).toEqual([50, 50, 4]);
    expect(boxHalfSize({ boundarySize: 50, boundaryDepth: 0 })).toEqual([50, 50, 50]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, boundaryDepth: -1 })).toEqual(['boundaryDepth must be >= 0 (0 = boundarySize), got -1']);
  });

  it('reflects off the thin z faces and confines to them, while x and y stay wide', () => {
    const set = new ParticleSet(1);
    set.addAll([defaultParticle({ position: [30, 0, 3.9], velocity: [1, 0, 1] })]);
    const settings = { ...DEFAULT_SETTINGS, integrator: 'euler' as const, timeStep: 0.5, boundary: 'box' as const, boundarySize: 50, boundaryDepth: 4 };
    referenceStep(set, [], settings, 0);
    const { position, velocity } = set.get(0);
    expect(velocity[2]).toBeCloseTo(-1, 6);
    expect(velocity[0]).toBeCloseTo(1, 6);
    expect(Math.abs(position[2])).toBeLessThanOrEqual(4);
    expect(position[0]).toBeCloseTo(30.5, 5);
  });
});

describe('BoundaryLines', () => {
  const vertices = (settings: Parameters<BoundaryLines['update']>[0]) => {
    const lines = new BoundaryLines();
    lines.update(settings);
    return lines.object.geometry.getAttribute('position')?.count ?? 0;
  };
  const base = { boundarySize: 10, boundaryDepth: 2, mode2D: false };

  it('draws twelve box edges in 3D and a rectangle in 2D', () => {
    expect(vertices({ ...base, boundary: 'box' })).toBe(24);
    expect(vertices({ ...base, boundary: 'box', mode2D: true })).toBe(8);
  });

  it('draws three great circles in 3D, one in 2D, and nothing without a boundary', () => {
    expect(vertices({ ...base, boundary: 'sphere' })).toBe(3 * 96 * 2);
    expect(vertices({ ...base, boundary: 'sphere', mode2D: true })).toBe(96 * 2);
    expect(vertices({ ...base, boundary: 'none' })).toBe(0);
  });

  it('gives the box its slab depth', () => {
    const lines = new BoundaryLines();
    lines.update({ ...base, boundary: 'box' });
    const z = Array.from(lines.object.geometry.getAttribute('position')!.array).filter((_, k) => k % 3 === 2);
    expect(Math.max(...z)).toBe(2);
    expect(Math.min(...z)).toBe(-2);
  });
});
