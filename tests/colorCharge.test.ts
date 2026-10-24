import { describe, expect, it } from 'vitest';
import { colorDot, colorPlane } from '../src/engine/colorCharge';
import { compileForce, forceScope } from '../src/engine/forces/compile';
import { forceFromPreset } from '../src/engine/forces/presets';
import type { Vec3 } from '../src/engine/particles';

const R: Vec3 = [1, 0, 0];
const G: Vec3 = [0, 1, 0];
const B: Vec3 = [0, 0, 1];
const anti = (c: Vec3): Vec3 => c.map((v) => -v) as Vec3;

describe('color charge in the 120° weight plane', () => {
  it.each([
    ['same color', R, R, 1],
    ['different colors', R, G, -0.5],
    ['color and its anticolor', B, anti(B), -1],
    ['color and another anticolor', R, anti(G), 0.5],
  ])('%s', (_, a, b, expected) => {
    expect(colorDot(a, b)).toBeCloseTo(expected, 12);
  });

  it('maps white, baryons and mesons to neutral', () => {
    for (const neutral of [[1, 1, 1], [0, 0, 0]] as Vec3[]) {
      colorPlane(neutral).forEach((c) => expect(c).toBeCloseTo(0, 12));
    }
    const meson = colorPlane(R).map((c, k) => c + colorPlane(anti(R))[k]!);
    meson.forEach((c) => expect(c).toBeCloseTo(0, 12));
  });

  it('places base vectors 120° apart on the unit circle', () => {
    for (const c of [R, G, B]) expect(Math.hypot(...colorPlane(c))).toBeCloseTo(1, 12);
  });

  it('makes the Cornell preset confine color/anticolor and repel equal colors', () => {
    const force = compileForce(forceFromPreset('color'));
    // `d` is the true distance; the preset's softening of 1 makes r = √(d² + 1), and the force of
    // the softened potential carries the Plummer factor d/r.
    const at = (a: Vec3, b: Vec3, d: number) => force.evaluate(forceScope(force, {
      m_i: 1, m_j: 1, q_i: 0, q_j: 0, q2_i: 0, q2_j: 0, i3_i: 0, i3_j: 0, p_i: 1, p_j: 1, n_i: 0, n_j: 0,
      sx_i: 0, sy_i: 0, sz_i: 0, sx_j: 0, sy_j: 0, sz_j: 0, ux: 1, uy: 0, uz: 0,
      cr_i: a[0], cg_i: a[1], cb_i: a[2], cr_j: b[0], cg_j: b[1], cb_j: b[2], t_i: 0, t_j: 0, time: 0,
    }, d));
    expect(at(R, anti(R), 10)).toBeLessThan(0);
    expect(at(R, anti(R), 30)).toBeCloseTo(-(20 / 901 + 0.5) * (30 / Math.sqrt(901)), 12);
    expect(at(R, R, 10)).toBeGreaterThan(0);
    expect(at(R, G, 10)).toBeCloseTo(at(R, anti(R), 10) / 2, 12);
  });
});
