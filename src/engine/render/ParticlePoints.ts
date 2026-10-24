import {
  BufferGeometry, Float32BufferAttribute, GLSL3, Points, ShaderMaterial,
  type Texture,
} from 'three';
import { perspectiveScale, V1_PALETTE_GLSL } from './shared';

export const COLOR_MODES = ['charge', 'color', 'speed', 'mass', 'spin', 'parity', 'nuclear', 'isospin'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const PARTICLE_STYLES = ['spherow', 'flat'] as const;
export type ParticleStyle = (typeof PARTICLE_STYLES)[number];

/** Sphere radius inside the raymarched sprite, as a fraction of the sprite's half-size. */
const SPHERE_FRACTION = 0.6;

const COMMON = /* glsl */ `
${V1_PALETTE_GLSL}
// v1 speed palette: hue sweeps 0..300° up to 16x the average speed, white once saturated.
vec3 speedColor(float speed, float averageSpeed) {
  return v1Palette(speed / max(16.0 * averageSpeed, 1e-6), 0.2);
}
`;

const VERTEX = /* glsl */ `
precision highp sampler2D;
in float aIndex;
uniform sampler2D uPosition;
uniform sampler2D uVelocity;
uniform sampler2D uAttributes;
uniform sampler2D uColor;
uniform sampler2D uSpin;
uniform int uWidth;
uniform int uColorMode;
uniform int uStyle;
uniform float uRadius;
uniform float uScale;
uniform float uAverageSpeed;
uniform int uHighlight;
out vec3 vColor;
out vec3 vVelocity;
out vec3 vCenter;
out float vHighlight;
${COMMON}

// Anticolor shows as the complementary color: anti-red (-1, 0, 0) is cyan.
vec3 displayColor(vec3 c) {
  vec3 anti = max(-c, 0.0);
  vec3 rgb = max(c, 0.0) + vec3(anti.x + anti.y + anti.z) - anti;
  float peak = max(max(rgb.r, rgb.g), rgb.b);
  return peak > 0.0 ? 0.15 + 0.85 * rgb / peak : vec3(0.75);
}

vec3 signedColor(float value) {
  if (value > 0.0) return vec3(0.25, 0.45, 1.0);
  if (value < 0.0) return vec3(1.0, 0.3, 0.25);
  return vec3(0.75);
}

// v1 generateParticleColor: charge picks blue/red/gray; color charge, negative nuclear charge (v1)
// and negative parity (v2) tint it.
vec3 meaningfulColor(vec4 attr, vec4 color) {
  vec3 rgb = attr.y > 0.0 ? vec3(0.0, 0.0, 6.0) : attr.y < 0.0 ? vec3(6.0, 0.0, 0.0) : vec3(2.0);
  if (any(notEqual(color.rgb, vec3(0.0)))) rgb += 2.0 * (displayColor(color.rgb) - 0.15) / 0.85;
  if (color.w < 0.0) rgb.g += 1.0;
  if (attr.w < 0.0) rgb.g += 1.0;
  return normalize(rgb);
}

void main() {
  int index = int(aIndex);
  ivec2 coord = ivec2(index % uWidth, index / uWidth);
  vec4 pos = texelFetch(uPosition, coord, 0);
  vec4 attr = texelFetch(uAttributes, coord, 0);
  vec4 color = texelFetch(uColor, coord, 0);
  vec4 spin = texelFetch(uSpin, coord, 0);
  vVelocity = texelFetch(uVelocity, coord, 0).xyz;
  vCenter = pos.xyz;

  if (uColorMode == 0) vColor = meaningfulColor(attr, color);
  else if (uColorMode == 1) vColor = displayColor(color.rgb);
  else if (uColorMode == 2) vColor = speedColor(length(vVelocity), uAverageSpeed);
  else if (uColorMode == 3) vColor = mix(vec3(0.5), vec3(1.0), clamp(log(attr.x + 1.0) * 0.3, 0.0, 1.0));
  // Spin direction as a color (x→red, y→green, z→blue, both signs), gray when spinless.
  else if (uColorMode == 4) vColor = length(spin.xyz) > 0.0 ? 0.25 + 0.75 * abs(normalize(spin.xyz)) : vec3(0.5);
  else if (uColorMode == 5) vColor = signedColor(attr.w);
  else if (uColorMode == 6) vColor = signedColor(color.w);
  else vColor = signedColor(spin.w);
  if (pos.w == 2.0) vColor *= 0.6;
  vHighlight = index == uHighlight ? 1.0 : 0.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float diameter = 2.0 * uRadius * uScale / -mvPosition.z;
  if (uStyle == 0) diameter /= ${SPHERE_FRACTION};
  gl_PointSize = max(diameter * (vHighlight > 0.0 ? 1.6 : 1.0), 2.0);
}
`;

const FRAGMENT = /* glsl */ `
in vec3 vColor;
in vec3 vVelocity;
in vec3 vCenter;
in float vHighlight;
uniform int uStyle;
uniform float uAverageSpeed;
out vec4 fragmentColor;
${COMMON}

#define EPSILON 1e-3
#define SPHERE_RADIUS 0.8
#define CAMERA_DISTANCE 4.0
#define FOCAL 1.5
// Arrow tip at 1.0 plus its 0.05 rounding.
#define BOUNDING_RADIUS 1.06

// Capped cone + cylinder arrow with its tip at 'end' (v1 particleShader arrowSdf).
float arrowSdf(vec3 position, vec3 start, vec3 end, float baseRadius, float tipRadius, float tipHeight) {
  vec3 t = start - end;
  float l = length(t);
  t /= l;
  l = max(l, tipHeight);
  position -= end;
  if (t.y + 1.0 < 0.0001) {
    position.y = -position.y;
  } else {
    float k = 1.0 / (1.0 + t.y);
    vec3 column1 = vec3(t.z * t.z * k + t.y, t.x, t.z * -t.x * k);
    vec3 column2 = vec3(-t.x, t.y, -t.z);
    vec3 column3 = vec3(-t.x * t.z * k, t.z, t.x * t.x * k + t.y);
    position = mat3(column1, column2, column3) * position;
  }
  vec2 q = vec2(length(position.xz), position.y);
  vec2 e = vec2(tipRadius, tipHeight);
  float h = clamp(dot(q, e) / dot(e, e), 0.0, 1.0);
  vec2 d1 = q - e * h;
  vec2 d2 = q - vec2(tipRadius, tipHeight);
  d2.x -= clamp(d2.x, baseRadius - tipRadius, 0.0);
  vec2 d3 = q - vec2(baseRadius, tipHeight);
  d3.y -= clamp(d3.y, 0.0, l - tipHeight);
  vec2 d4 = vec2(q.y - l, max(q.x - baseRadius, 0.0));
  float s = max(max(max(d1.x, -d1.y), d4.x), min(d2.y, d3.x));
  return sqrt(min(min(min(dot(d1, d1), dot(d2, d2)), dot(d3, d3)), dot(d4, d4))) * sign(s);
}

bool hasArrow;
vec3 arrowDirection;
bool hitSphere;

float sceneSdf(vec3 p) {
  float sphere = length(p) - SPHERE_RADIUS;
  float arrow = arrowSdf(p, -arrowDirection, arrowDirection, 0.3, 0.9, 0.75) - 0.05;
  hitSphere = sphere < arrow;
  return min(sphere, arrow);
}

// Tetrahedron finite differences: 4 SDF evaluations instead of 6.
vec3 sceneNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * sceneSdf(p + k.xyy * EPSILON) + k.yyx * sceneSdf(p + k.yyx * EPSILON) +
    k.yxy * sceneSdf(p + k.yxy * EPSILON) + k.xxx * sceneSdf(p + k.xxx * EPSILON)
  );
}

void spherow() {
  float speed = length(vVelocity);
  hasArrow = speed > 0.0;
  arrowDirection = hasArrow ? vVelocity / speed : vec3(0.0, 1.0, 0.0);

  // Orthonormal frame of the real camera looking at this particle.
  vec3 forward = normalize(vCenter - cameraPosition);
  vec3 right = normalize(cross(forward, abs(forward.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec2 uv = vec2(gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y);
  vec3 rayOrigin = -forward * CAMERA_DISTANCE;
  vec3 rayDirection = normalize(right * uv.x + up * uv.y + forward * FOCAL);

  // Analytic entry into the bounding sphere: most sprite pixels miss it and never march.
  float bound = hasArrow ? BOUNDING_RADIUS : SPHERE_RADIUS;
  float b = dot(rayOrigin, rayDirection);
  float disc = b * b - dot(rayOrigin, rayOrigin) + bound * bound;
  if (disc < 0.0) discard;
  float t = -b - sqrt(disc);
  float exit = -b + sqrt(disc);

  hitSphere = true;
  if (hasArrow) {
    bool hit = false;
    for (int i = 0; i < 24; i++) {
      float d = sceneSdf(rayOrigin + rayDirection * t);
      if (d < EPSILON) {
        hit = true;
        break;
      }
      t += d;
      if (t > exit) break;
    }
    if (!hit) discard;
    sceneSdf(rayOrigin + rayDirection * t);
  }

  vec3 p = rayOrigin + rayDirection * t;
  // sceneNormal re-evaluates the SDF and overwrites hitSphere, so read it first.
  bool onSphere = hitSphere;
  vec3 n = onSphere ? normalize(p) : sceneNormal(p);
  vec3 hitColor = onSphere ? vColor : speedColor(length(vVelocity), uAverageSpeed);
  vec3 light = normalize(-forward + 0.6 * up - 0.4 * right);
  vec3 color = hitColor * max(dot(n, light), 0.0);
  color += 0.33 * hitColor * (0.5 + 0.5 * dot(n, up));
  color += 0.5 * pow(max(dot(reflect(-light, n), -rayDirection), 0.0), 32.0);
  color = sqrt(color);
  if (vHighlight > 0.0 && length(p) > SPHERE_RADIUS * 0.9 && dot(n, -forward) < 0.35) color = vec3(1.0);
  fragmentColor = vec4(color, 1.0);
}

void flatDisc() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float shade = 0.55 + 0.45 * sqrt(1.0 - d);
  vec3 color = vHighlight > 0.0 && d > 0.6 ? vec3(1.0) : vColor * shade;
  fragmentColor = vec4(color, 1.0);
}

void main() {
  if (uStyle == 0) spherow();
  else flatDisc();
}
`;

export class ParticlePoints {
  readonly object: Points;
  private readonly material: ShaderMaterial;
  private readonly geometry = new BufferGeometry();

  constructor(width: number) {
    const capacity = width * width;
    this.geometry.setAttribute('aIndex', new Float32BufferAttribute(Float32Array.from({ length: capacity }, (_, k) => k), 1));
    this.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(capacity * 3), 3));
    this.material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uPosition: { value: null },
        uVelocity: { value: null },
        uAttributes: { value: null },
        uColor: { value: null },
        uSpin: { value: null },
        uWidth: { value: width },
        uColorMode: { value: 0 },
        uStyle: { value: 0 },
        uRadius: { value: 3 },
        uScale: { value: 400 },
        uAverageSpeed: { value: 1 },
        uHighlight: { value: -1 },
      },
    });
    this.object = new Points(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.setCount(0);
  }

  bind(textures: { position: Texture; velocity: Texture; attributes: Texture; color: Texture; spin: Texture }): void {
    const u = this.material.uniforms;
    u.uPosition!.value = textures.position;
    u.uVelocity!.value = textures.velocity;
    u.uAttributes!.value = textures.attributes;
    u.uColor!.value = textures.color;
    u.uSpin!.value = textures.spin;
  }

  setCount(count: number): void {
    this.geometry.setDrawRange(0, count);
  }

  setColorMode(mode: ColorMode): void {
    this.material.uniforms.uColorMode!.value = COLOR_MODES.indexOf(mode);
  }

  setStyle(style: ParticleStyle): void {
    this.material.uniforms.uStyle!.value = PARTICLE_STYLES.indexOf(style);
  }

  /** Sizes particles as spheres of the given world-space radius under a perspective camera. */
  setRadius(radius: number, viewportHeight: number, fovDegrees: number): void {
    this.material.uniforms.uRadius!.value = radius;
    this.material.uniforms.uScale!.value = perspectiveScale(viewportHeight, fovDegrees);
  }

  /** Reference for the speed palette, which saturates at 16x this value. */
  setAverageSpeed(speed: number): void {
    this.material.uniforms.uAverageSpeed!.value = speed;
  }

  setHighlight(index: number | undefined): void {
    this.material.uniforms.uHighlight!.value = index ?? -1;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
