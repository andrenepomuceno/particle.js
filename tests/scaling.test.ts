import { describe, expect, it } from 'vitest';
import { createRng } from '../src/engine/random';
import { parseScenario } from '../src/scenarios/scenarioFile';

const scenario = (groups: object[], settings: object = {}) => parseScenario(
  JSON.stringify({ format: 'particle.js-v2/scenario', version: 1, id: 't', name: 'T', settings, groups }), 't.json',
);
const radius = (p: { position: number[] }) => Math.hypot(...p.position);

describe('scaling scenarios to a particle total', () => {
  it('keeps the file counts without a target', () => {
    const s = scenario([{ count: 10, shape: { type: 'disk', radius: 10 } }]);
    expect(s.defaultCount).toBe(10);
    expect(s.build(createRng(1))).toMatchObject({ linearScale: 1 });
    expect(s.build(createRng(1)).particles).toHaveLength(10);
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
