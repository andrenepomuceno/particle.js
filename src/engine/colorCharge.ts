import type { Vec3 } from './particles';

/**
 * Color charge lives in the 2D weight plane of SU(3): the red, green and blue base
 * vectors are unit vectors 120° apart, so r + g + b = 0 (white is neutral) and an
 * anticolor is the negated vector. A particle stores amounts (r, g, b); its physical
 * color vector is r·e_r + g·e_g + b·e_b.
 */
export const COLOR_BASIS: readonly [number, number][] = [
  [1, 0],
  [-0.5, Math.sqrt(3) / 2],
  [-0.5, -Math.sqrt(3) / 2],
];

export function colorPlane(color: Vec3): [number, number] {
  return [
    color[0] * COLOR_BASIS[0]![0] + color[1] * COLOR_BASIS[1]![0] + color[2] * COLOR_BASIS[2]![0],
    color[0] * COLOR_BASIS[0]![1] + color[1] * COLOR_BASIS[1]![1] + color[2] * COLOR_BASIS[2]![1],
  ];
}

/** Same color +1, different colors −½, color/anticolor −1, color/other anticolor +½. */
export function colorDot(a: Vec3, b: Vec3): number {
  const [ax, ay] = colorPlane(a);
  const [bx, by] = colorPlane(b);
  return ax * bx + ay * by;
}

export const GLSL_COLOR_HELPERS = /* glsl */ `
vec2 colorPlane(vec4 c) {
  return vec2(c.x - 0.5 * (c.y + c.z), ${Math.sqrt(3) / 2} * (c.y - c.z));
}
float colorDot(vec4 a, vec4 b) {
  return dot(colorPlane(a), colorPlane(b));
}
`;
