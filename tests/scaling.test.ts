import { describe, expect, it } from 'vitest';
import { MAX_CAPACITY } from '../src/app/SimulationController';
import type { Particle } from '../src/engine/particles';
import { createRng } from '../src/engine/random';
import { boxHalfSize, DEFAULT_SETTINGS, type SimulationSettings } from '../src/engine/settings';
import { SCENARIOS } from '../src/scenarios';
import { scaleBoundary } from '../src/scenarios/scaling';
import { parseScenario } from '../src/scenarios/scenarioFile';
import type { Scenario } from '../src/scenarios/types';

const scenario = (groups: object[], settings: object = {}) => parseScenario(
  JSON.stringify({ format: 'particle.js-v2/scenario', version: 1, id: 't', name: 'T', settings, groups }), 't.json',
);
const radius = (p: { position: number[] }) => Math.hypot(...p.position);

/** How far a particle lies outside the boundary (≤ 0 inside): sphere radius, or box half-sizes per axis. */
function overshoot({ position }: Particle, settings: SimulationSettings): number {
  if (settings.boundary === 'sphere') return Math.hypot(...position) - settings.boundarySize;
  const half = boxHalfSize(settings);
  return Math.max(...position.map((c, k) => Math.abs(c) - half[k]!));
}

/** Builds a scenario at each particle total as the controller does and checks every particle starts inside the scaled boundary. */
function expectInside(s: Scenario, targets: readonly number[]): void {
  for (const target of targets) {
    const { particles, linearScale } = s.build(createRng(s.seed ?? 1), target);
    const settings = scaleBoundary({ ...DEFAULT_SETTINGS, ...s.settings }, linearScale);
    const outside = particles.filter((p) => overshoot(p, settings) > 1e-9 * settings.boundarySize);
    const worst = Math.max(0, ...outside.map((p) => overshoot(p, settings)));
    expect(outside.length, `target ${target}: ${outside.length} of ${particles.length} outside boundarySize ${settings.boundarySize}, worst by ${worst}`).toBe(0);
  }
}

describe('scaling scenarios to a particle total', () => {
  it('keeps the file counts without a target', () => {
    const s = scenario([{ count: 10, shape: { type: 'disk', radius: 10 } }]);
    expect(s.defaultCount).toBe(10);
    expect(s.build(createRng(1))).toMatchObject({ linearScale: 1 });
    expect(s.build(createRng(1)).particles).toHaveLength(10);
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))('never builds %s past the requested total, even at the capacity', (_, s) => {
    for (const target of [MAX_CAPACITY, 15001, 1001]) {
      if (target < s.defaultCount) continue;
      expect(s.build(createRng(s.seed ?? 1), target).particles.length).toBeLessThanOrEqual(target);
    }
  });

  it('rounds a scaled count to whole cycles so the mix stays balanced', () => {
    const soup = scenario([{ count: 21, shape: { type: 'disk', radius: 10 }, charge: { cycle: [1, 1, -1, 1, -1, -1, -1] }, mass: { cycle: [1, 2] } }]);
    const { particles } = soup.build(createRng(1), 100);
    expect(particles.length % 14).toBe(0);
    expect(particles.reduce((sum, p) => sum + p.charge, 0)).toBe(-particles.length / 7);
  });

  it('grows a disk by the square root to keep its density', () => {
    const { particles, linearScale } = scenario([{ count: 100, shape: { type: 'disk', radius: 10 } }]).build(createRng(1), 400);
    expect(particles).toHaveLength(400);
    expect(linearScale).toBeCloseTo(2, 12);
    expect(Math.max(...particles.map(radius))).toBeLessThanOrEqual(20);
    expect(Math.max(...particles.map(radius))).toBeGreaterThan(15);
  });

  it('grows a sphere by the cube root and a flat box by the square root', () => {
    expect(scenario([{ count: 10, shape: { type: 'sphere', radius: 5 } }]).build(createRng(1), 80).linearScale).toBeCloseTo(2, 12);
    expect(scenario([{ count: 10, shape: { type: 'box', size: [4, 4, 0] } }]).build(createRng(1), 40).linearScale).toBeCloseTo(2, 12);
  });

  it('adds grid columns and rows instead of stretching the spacing', () => {
    const { particles } = scenario([{ count: 16, shape: { type: 'grid', spacing: 1, columns: 4, rows: 4 } }]).build(createRng(1), 64);
    expect(particles).toHaveLength(64);
    const xs = new Set(particles.map((p) => p.position[0]));
    expect(xs.size).toBe(8);
  });

  it('scales a sphere by the square root in 2D, where it is projected onto a disk', () => {
    expect(scenario([{ count: 10, shape: { type: 'sphere', radius: 5 } }], { mode2D: true }).build(createRng(1), 40).linearScale).toBeCloseTo(2, 12);
  });

  it('grows a single-site grid in the plane instead of stacking particles', () => {
    const { particles } = scenario([{ count: 1, shape: { type: 'grid', spacing: 1, columns: 1, rows: 1 } }]).build(createRng(1), 9);
    expect(new Set(particles.map((p) => p.position.join(','))).size).toBe(9);
  });

  it('keeps pinned groups and whole clusters', () => {
    const { particles } = scenario([
      { count: 1, scale: false, shape: { type: 'point' }, mass: 99 },
      { count: 30, cluster: { size: 3, radius: 1 }, shape: { type: 'disk', radius: 10 } },
    ]).build(createRng(1), 101);
    expect(particles.filter((p) => p.mass === 99)).toHaveLength(1);
    expect((particles.length - 1) % 3).toBe(0);
    expect(Math.abs(particles.length - 101)).toBeLessThanOrEqual(2);
  });

  it('fails loudly when pinned groups leave no room', () => {
    const s = scenario([{ count: 5, scale: false, shape: { type: 'point' } }, { count: 5, shape: { type: 'point' } }]);
    expect(() => s.build(createRng(1), 5)).toThrow(/leaves no room: 5 particles are pinned/);
    expect(() => s.build(createRng(1), 0)).toThrow(/integer >= 1/);
  });
});

describe('scaling inside a boundary', () => {
  const lattice = (columns: number, rows: number, layers: number) => ({ type: 'grid', spacing: 6, columns, rows, layers });

  it.each([
    ['a 2D lattice whose outer sites touch the walls', [{ count: 630, shape: lattice(28, 25, 1) }], { mode2D: true, boundary: 'box', boundarySize: 81 }],
    ['a 3D lattice in a box', [{ count: 1000, shape: lattice(10, 10, 10) }], { boundary: 'box', boundarySize: 27 }],
    ['a 3D lattice in a sphere', [{ count: 1000, shape: lattice(10, 10, 10) }], { boundary: 'sphere', boundarySize: Math.hypot(27, 27, 27) }],
    ['a lattice in a slab', [{ count: 128, shape: lattice(8, 8, 2) }], { boundary: 'box', boundarySize: 21, boundaryDepth: 3 }],
    ['clustered disks off the center', [{ count: 90, cluster: { size: 3, radius: 2 }, shape: { type: 'disk', radius: 20, center: [30, 0, 0] } }], { mode2D: true, boundary: 'box', boundarySize: 52 }],
    ['a box in a slab', [{ count: 200, shape: { type: 'box', size: [100, 100, 8] } }], { boundary: 'box', boundarySize: 50, boundaryDepth: 4 }],
  ])('keeps %s inside the scaled boundary when it fits at the file count', (_, groups, settings) => {
    const s = scenario(groups, settings);
    expectInside(s, [s.defaultCount, 2 * s.defaultCount + 1, 15000, MAX_CAPACITY]);
  });

  it('grows a box in a slab in x and y only, at constant density', () => {
    const { particles, linearScale } = scenario([{ count: 100, shape: { type: 'box', size: [100, 100, 8] } }], { boundary: 'box', boundarySize: 50, boundaryDepth: 4 }).build(createRng(1), 400);
    expect(linearScale).toBeCloseTo(2, 12);
    expect(Math.max(...particles.map((p) => Math.abs(p.position[2])))).toBeLessThanOrEqual(4);
    expect(Math.max(...particles.map((p) => Math.abs(p.position[0])))).toBeGreaterThan(75);
  });

  it('fails loudly when a sphere or a shell would grow through a slab', () => {
    for (const type of ['sphere', 'shell']) {
      const s = scenario([{ count: 10, shape: { type, radius: 2 } }], { boundary: 'box', boundarySize: 50, boundaryDepth: 4 });
      expect(() => s.build(createRng(1), 40)).toThrow(`groups[0]: a ${type} cannot grow in a slab box`);
      expect(s.build(createRng(1), 5).particles).toHaveLength(5);
    }
  });
});

describe('scaled library scenarios', () => {
  const bounded = SCENARIOS.filter((s) => s.settings.boundary !== 'none' && s.defaultCount > 0);

  it.each(bounded.map((s) => [s.id, s] as const))('%s starts every particle inside its boundary at any particle total', (_, s) => {
    expectInside(s, [s.defaultCount, 100, 1000, 5000, 15000, MAX_CAPACITY]);
  });
});
