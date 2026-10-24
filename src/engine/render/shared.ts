/**
 * v1's palette: hue sweeps red to magenta as `level` goes 0 → 1, white once saturated; the
 * brightness is sqrt(level) with a floor so faint values stay visible.
 */
export const V1_PALETTE_GLSL = /* glsl */ `
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 v1Palette(float level, float brightnessFloor) {
  float saturation = 1.0;
  if (level > 1.0) {
    level = 1.0;
    saturation = 0.0;
  }
  return hsv2rgb(vec3(0.8333 * level, saturation, max(sqrt(level), brightnessFloor)));
}
`;

/** Pixels per world unit at distance 1 for a perspective camera (point sizes divide by depth). */
export function perspectiveScale(viewportHeight: number, fovDegrees: number): number {
  return viewportHeight / (2 * Math.tan((fovDegrees * Math.PI) / 360));
}
