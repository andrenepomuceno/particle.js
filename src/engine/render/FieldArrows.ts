import { BufferGeometry, Float32BufferAttribute, GLSL3, Points, ShaderMaterial, Vector2, type Texture } from 'three';
import { perspectiveScale, V1_PALETTE_GLSL } from './shared';

const VERTEX = /* glsl */ `
precision highp sampler2D;
in float aIndex;
uniform sampler2D uProbes;
uniform sampler2D uField;
uniform int uWidth;
uniform float uSpacing;
uniform float uScale;
uniform vec2 uViewport;
out vec3 vField;
out vec2 vDirection;
out float vLength;

void main() {
  int index = int(aIndex);
  ivec2 coord = ivec2(index % uWidth, index / uWidth);
  vec3 pos = texelFetch(uProbes, coord, 0).xyz;
  vField = texelFetch(uField, coord, 0).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float size = uSpacing * uScale / -mvPosition.z;
  gl_PointSize = size;

  // Screen-space direction of the field; a component toward the camera shortens the arrow.
  float magnitude = length(vField);
  vDirection = vec2(1.0, 0.0);
  vLength = 0.0;
  if (magnitude > 0.0) {
    vec4 tip = projectionMatrix * modelViewMatrix * vec4(pos + 0.5 * uSpacing * vField / magnitude, 1.0);
    vec2 delta = (tip.xy / tip.w - gl_Position.xy / gl_Position.w) * 0.5 * uViewport;
    float pixels = length(delta);
    if (pixels > 0.0) {
      vDirection = delta / pixels;
      vLength = clamp(pixels / (0.5 * size), 0.0, 1.0);
    }
  }
}
`;

const FRAGMENT = /* glsl */ `
in vec3 vField;
in vec2 vDirection;
in float vLength;
uniform float uReference;
uniform bool uLogScale;
out vec4 fragmentColor;

${V1_PALETTE_GLSL}

// iq's isosceles triangle with its tip at the origin and base at y = q.y.
float triangleSdf(vec2 p, vec2 q) {
  p.x = abs(p.x);
  vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
  vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
  float s = -sign(q.y);
  vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
  return -sqrt(d.x) * sign(d.y);
}

float boxSdf(vec2 p, vec2 half_) {
  vec2 d = abs(p) - half_;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Arrow along +x centered in the sprite, half-length 'len' in sprite units (sprite spans -0.5..0.5).
float arrowSdf(vec2 p, float len) {
  float head = min(0.18, len);
  float shaft = boxSdf(p - vec2(-0.5 * head, 0.0), vec2(max(len - 0.5 * head, 0.0), 0.035));
  float tip = triangleSdf(vec2(p.y, len - p.x), vec2(0.13, head));
  return min(shaft, tip);
}

// v1's field palette: hue sweeps red to magenta up to the reference strength, white beyond.
// sqrt spreads the low end, where most of a 1/r^2 field sits.
vec3 fieldColor(float magnitude) {
  float ratio = magnitude / max(uReference, 1e-30);
  // log10(1 + 9·ratio) maps 0 → 0 and the reference → 1, like the sqrt scale, but keeps decades apart.
  return v1Palette(uLogScale ? log(1.0 + 9.0 * ratio) / log(10.0) : sqrt(ratio), 0.35);
}

void main() {
  if (vLength <= 0.0) discard;
  vec2 uv = vec2(gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y);
  vec2 p = vec2(dot(uv, vDirection), dot(uv, vec2(-vDirection.y, vDirection.x)));
  float d = arrowSdf(p, 0.45 * max(vLength, 0.2));
  float aa = fwidth(d);
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  if (alpha <= 0.0) discard;
  fragmentColor = vec4(fieldColor(length(vField)), alpha);
}
`;

/** Probe arrows drawn straight from the GPU probe-position and field textures. */
export class FieldArrows {
  readonly object: Points;
  private readonly material: ShaderMaterial;
  private geometry = new BufferGeometry();

  constructor() {
    this.material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uProbes: { value: null },
        uField: { value: null },
        uWidth: { value: 1 },
        uSpacing: { value: 1 },
        uScale: { value: 400 },
        uViewport: { value: new Vector2(1, 1) },
        uReference: { value: 1 },
        uLogScale: { value: false },
      },
    });
    this.object = new Points(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.object.visible = false;
  }

  /** Points at a new probe grid; the textures are owned by GpuCompute. */
  setGrid(textures: { probes: Texture; field: Texture }, width: number, count: number, spacing: number): void {
    if (this.geometry.getAttribute('aIndex')?.count !== count) {
      this.geometry.dispose();
      this.geometry = new BufferGeometry();
      this.geometry.setAttribute('aIndex', new Float32BufferAttribute(Float32Array.from({ length: count }, (_, k) => k), 1));
      this.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
      this.object.geometry = this.geometry;
    }
    const u = this.material.uniforms;
    u.uProbes!.value = textures.probes;
    u.uField!.value = textures.field;
    u.uWidth!.value = width;
    u.uSpacing!.value = spacing;
  }

  /** Same perspective scale as ParticlePoints.setRadius, plus the drawing-buffer size for directions. */
  setViewport(width: number, height: number, fovDegrees: number): void {
    this.material.uniforms.uScale!.value = perspectiveScale(height, fovDegrees);
    (this.material.uniforms.uViewport!.value as Vector2).set(width, height);
  }

  /** |F| drawn at the top of the palette. */
  setLogScale(enabled: boolean): void {
    this.material.uniforms.uLogScale!.value = enabled;
  }

  setReference(reference: number): void {
    this.material.uniforms.uReference!.value = reference;
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
