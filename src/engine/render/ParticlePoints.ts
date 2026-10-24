import {
  BufferGeometry, Float32BufferAttribute, GLSL3, Points, ShaderMaterial,
  type Texture,
} from 'three';

export const COLOR_MODES = ['charge', 'color', 'speed', 'mass', 'spin', 'parity'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

const VERTEX = /* glsl */ `
precision highp sampler2D;
in float aIndex;
uniform sampler2D uPosition;
uniform sampler2D uVelocity;
uniform sampler2D uAttributes;
uniform sampler2D uColor;
uniform int uWidth;
uniform int uColorMode;
uniform float uSize;
uniform float uScale;
uniform float uSpeedScale;
uniform int uHighlight;
out vec3 vColor;
out float vHighlight;

vec3 signed(float value) {
  if (value > 0.0) return vec3(1.0, 0.35, 0.25);
  if (value < 0.0) return vec3(0.25, 0.55, 1.0);
  return vec3(0.75);
}

void main() {
  int index = int(aIndex);
  ivec2 coord = ivec2(index % uWidth, index / uWidth);
  vec4 pos = texelFetch(uPosition, coord, 0);
  vec4 attr = texelFetch(uAttributes, coord, 0);
  if (uColorMode == 0) vColor = signed(attr.y);
  else if (uColorMode == 1) vColor = clamp(abs(texelFetch(uColor, coord, 0).rgb), 0.0, 1.0) * 0.85 + 0.15;
  else if (uColorMode == 2) {
    float t = clamp(length(texelFetch(uVelocity, coord, 0).xyz) * uSpeedScale, 0.0, 1.0);
    vColor = mix(vec3(0.15, 0.3, 1.0), vec3(1.0, 0.85, 0.2), t);
  }
  else if (uColorMode == 3) vColor = mix(vec3(0.5), vec3(1.0), clamp(log(attr.x + 1.0) * 0.3, 0.0, 1.0));
  else if (uColorMode == 4) vColor = signed(attr.z);
  else vColor = signed(attr.w);
  if (pos.w == 2.0) vColor *= 0.6;
  vHighlight = index == uHighlight ? 1.0 : 0.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float size = uSize * (vHighlight > 0.0 ? 2.0 : 1.0);
  gl_PointSize = max(size * uScale / -mvPosition.z, 1.5);
}
`;

const FRAGMENT = /* glsl */ `
in vec3 vColor;
in float vHighlight;
out vec4 fragmentColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float shade = 0.55 + 0.45 * sqrt(1.0 - d);
  vec3 color = vHighlight > 0.0 && d > 0.6 ? vec3(1.0) : vColor * shade;
  fragmentColor = vec4(color, 1.0);
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
        uWidth: { value: width },
        uColorMode: { value: 0 },
        uSize: { value: 4 },
        uScale: { value: 400 },
        uSpeedScale: { value: 1 },
        uHighlight: { value: -1 },
      },
    });
    this.object = new Points(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.setCount(0);
  }

  bind(textures: { position: Texture; velocity: Texture; attributes: Texture; color: Texture }): void {
    const u = this.material.uniforms;
    u.uPosition!.value = textures.position;
    u.uVelocity!.value = textures.velocity;
    u.uAttributes!.value = textures.attributes;
    u.uColor!.value = textures.color;
  }

  setCount(count: number): void {
    this.geometry.setDrawRange(0, count);
  }

  setColorMode(mode: ColorMode): void {
    this.material.uniforms.uColorMode!.value = COLOR_MODES.indexOf(mode);
  }

  /** Sizes points as spheres of the given world-space radius under a perspective camera. */
  setRadius(radius: number, viewportHeight: number, fovDegrees: number): void {
    this.material.uniforms.uSize!.value = 2 * radius;
    this.material.uniforms.uScale!.value = viewportHeight / (2 * Math.tan((fovDegrees * Math.PI) / 360));
  }

  setSpeedScale(maxSpeed: number): void {
    this.material.uniforms.uSpeedScale!.value = maxSpeed > 0 ? 1 / maxSpeed : 1;
  }

  setHighlight(index: number | undefined): void {
    this.material.uniforms.uHighlight!.value = index ?? -1;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
