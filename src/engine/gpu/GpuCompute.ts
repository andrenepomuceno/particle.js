import {
  ClampToEdgeWrapping, DataTexture, FloatType, GLSL3, NearestFilter, RawShaderMaterial, RGBAFormat,
  Vector4, WebGLRenderTarget, type IUniform, type Texture, type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { forceUniformName, type CompiledForce } from '../forces/compile';
import type { FieldProbe } from '../field';
import type { ParticleSet } from '../particles';
import type { SimulationSettings } from '../settings';
import {
  BOUNDARY_CODE, generateAccelerationShader, generateFieldShader, generatePotentialShader, generateVelocityShader, POSITION_SHADER,
  VERLET_POSITION_SHADER, VERLET_VELOCITY_SHADER,
} from '../shaders/computeShaders';

const VERTEX_SHADER = /* glsl */ `
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragmentPrelude = (width: number) => /* glsl */ `
#define TEXTURE_WIDTH ${width}
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
out vec4 fragmentOutput;
#define gl_FragColor fragmentOutput
`;

const COPY_SHADER = /* glsl */ `
uniform sampler2D uSource;
void main() { gl_FragColor = texelFetch(uSource, ivec2(gl_FragCoord.xy), 0); }
`;

export class ShaderCompileError extends Error {
  constructor(readonly log: string, readonly source: string) {
    super(`compute shader failed to compile:\n${log}`);
    this.name = 'ShaderCompileError';
  }
}

export function textureWidthFor(capacity: number): number {
  return Math.max(1, Math.ceil(Math.sqrt(capacity)));
}

type PingPong = [WebGLRenderTarget, WebGLRenderTarget];

/**
 * Ping-pong GPGPU integrator. Owns its own render targets and materials so the
 * velocity shader can be regenerated at runtime and validated before it is swapped in.
 */
export class GpuCompute {
  readonly width: number;
  private readonly position: PingPong;
  private readonly velocity: PingPong;
  /** Velocity Verlet keeps a(x_n) between steps; index follows `current` like position/velocity. */
  private readonly acceleration: PingPong;
  private accelerationValid = false;
  private integrator: SimulationSettings['integrator'] = 'verlet';
  private velocityDependent = false;
  private current = 0;
  private readonly attributes: DataTexture;
  private readonly color: DataTexture;
  private readonly spin: DataTexture;
  private readonly quad = new FullScreenQuad();
  private readonly sharedUniforms: Record<string, IUniform>;
  private velocityMaterial: RawShaderMaterial;
  private potentialMaterial: RawShaderMaterial;
  private readonly potentialTarget: WebGLRenderTarget;
  private potentialStale = false;
  private fieldMaterial: RawShaderMaterial;
  private fieldStale = false;
  private readonly probeUniforms: Record<string, IUniform>;
  private probes: { width: number; count: number; positions: DataTexture; target: WebGLRenderTarget } | undefined;
  private fieldBuffer: Float32Array | undefined;
  private forceUniforms: Record<string, IUniform>;
  private accelerationMaterial: RawShaderMaterial;
  private readonly positionMaterial: RawShaderMaterial;
  private readonly verletPositionMaterial: RawShaderMaterial;
  private readonly verletVelocityMaterial: RawShaderMaterial;
  private readonly copyMaterial: RawShaderMaterial;
  private forces: readonly CompiledForce[] = [];
  private readonly prelude: string;

  constructor(private readonly renderer: WebGLRenderer, readonly set: ParticleSet) {
    this.width = textureWidthFor(set.capacity);
    this.prelude = fragmentPrelude(this.width);
    if (this.width * this.width !== set.capacity) {
      throw new Error(`ParticleSet capacity ${set.capacity} must be a square (width ${this.width})`);
    }
    this.position = [this.target(), this.target()];
    this.velocity = [this.target(), this.target()];
    this.acceleration = [this.target(), this.target()];
    this.attributes = this.dataTexture(set.attributes);
    this.color = this.dataTexture(set.color);
    this.spin = this.dataTexture(set.spin);
    this.sharedUniforms = {
      texturePosition: { value: null },
      textureVelocity: { value: null },
      uAttributes: { value: this.attributes },
      uColor: { value: this.color },
      uSpin: { value: this.spin },
      uCount: { value: 0 },
      uTimeStep: { value: 1 },
      uTime: { value: 0 },
      uFriction: { value: 0 },
      uBoundaryDepth: { value: 0 },
      uQuadraticDrag: { value: 0 },
      uMaxSpeed: { value: 0 },
      uBoundary: { value: 0 },
      uBoundarySize: { value: 1 },
      uRestitution: { value: 1 },
      uCollisionDistance: { value: 0 },
      uCollisionRestitution: { value: 1 },
      uMode2D: { value: false },
      uAcceleration: { value: null },
      uAccelerationNext: { value: null },
      uClockShift: { value: 0 },
    };
    this.positionMaterial = this.material(POSITION_SHADER, this.sharedUniforms);
    this.velocityMaterial = this.material(generateVelocityShader([]), this.sharedUniforms);
    this.accelerationMaterial = this.material(generateAccelerationShader([]), this.sharedUniforms);
    this.verletPositionMaterial = this.material(VERLET_POSITION_SHADER, this.sharedUniforms);
    this.verletVelocityMaterial = this.material(VERLET_VELOCITY_SHADER, this.sharedUniforms);
    this.potentialMaterial = this.material(generatePotentialShader([]), this.sharedUniforms);
    this.potentialTarget = this.target();
    this.probeUniforms = {
      uProbePositions: { value: null },
      uProbeWidth: { value: 1 },
      uProbeCount: { value: 0 },
      uProbeAttributes: { value: new Vector4() },
      uProbeColor: { value: new Vector4() },
      uProbeSpin: { value: new Vector4() },
    };
    this.fieldMaterial = this.material(generateFieldShader([]), { ...this.sharedUniforms, ...this.probeUniforms });
    this.forceUniforms = this.sharedUniforms;
    this.copyMaterial = this.material(COPY_SHADER, { uSource: { value: null } });
    for (const material of this.programs()) {
      this.validate(material.fragmentShader);
    }
  }

  get positionTexture(): Texture {
    return this.position[this.current]!.texture;
  }

  get velocityTexture(): Texture {
    return this.velocity[this.current]!.texture;
  }

  get attributesTexture(): Texture {
    return this.attributes;
  }

  get colorTexture(): Texture {
    return this.color;
  }

  get spinTexture(): Texture {
    return this.spin;
  }

  /** Recompiles the force passes (Euler velocity, Verlet acceleration). On failure the previous forces stay active. */
  setForces(forces: readonly CompiledForce[]): void {
    const source = generateVelocityShader(forces);
    const accelerationSource = generateAccelerationShader(forces);
    this.validate(this.prelude + source);
    this.validate(this.prelude + accelerationSource);
    const uniforms: Record<string, IUniform> = { ...this.sharedUniforms };
    forces.forEach((_, index) => {
      for (const name of ['cutoff', 'soft2', ...forces[index]!.definition.params.map((p) => p.name)]) {
        uniforms[forceUniformName(index, name)] = { value: 0 };
      }
    });
    const material = this.material(source, uniforms);
    this.velocityMaterial.dispose();
    this.velocityMaterial = material;
    this.accelerationMaterial.dispose();
    this.accelerationMaterial = this.material(accelerationSource, uniforms);
    this.forceUniforms = uniforms;
    this.velocityDependent = forces.some((f) => f.velocity);
    this.potentialStale = true;
    this.fieldStale = true;
    this.forces = forces;
    this.setForceValues(forces);
  }

  /** Pushes parameter, cutoff and softening values without recompiling. */
  setForceValues(forces: readonly CompiledForce[]): void {
    if (forces.length !== this.forces.length) {
      throw new Error(`expected values for ${this.forces.length} compiled forces, got ${forces.length}`);
    }
    const uniforms = this.velocityMaterial.uniforms;
    forces.forEach(({ definition }, index) => {
      const set = (name: string, value: number) => {
        const uniform = uniforms[forceUniformName(index, name)];
        if (!uniform) throw new Error(`force '${definition.name}' has no uniform '${name}'; recompile first`);
        uniform.value = value;
      };
      set('cutoff', definition.cutoff);
      set('soft2', definition.softening ** 2);
      definition.params.forEach((p) => set(p.name, p.value));
    });
    this.accelerationValid = false;
  }

  setSettings(settings: SimulationSettings): void {
    const u = this.sharedUniforms;
    u.uTimeStep!.value = settings.timeStep;
    u.uFriction!.value = settings.friction;
    u.uQuadraticDrag!.value = settings.quadraticDrag;
    u.uMaxSpeed!.value = settings.maxSpeed;
    u.uBoundary!.value = BOUNDARY_CODE[settings.boundary];
    u.uBoundarySize!.value = settings.boundarySize;
    u.uBoundaryDepth!.value = settings.boundaryDepth;
    u.uRestitution!.value = settings.restitution;
    // Collisions change which pairs exert forces, so a stored Verlet acceleration goes stale.
    if (u.uCollisionDistance!.value !== settings.collisionDistance) this.accelerationValid = false;
    u.uCollisionDistance!.value = settings.collisionDistance;
    u.uCollisionRestitution!.value = settings.collisionRestitution;
    // a(x) depends on positions and forces only; mode2D zeroes its z, and Euler leaves it stale.
    if (u.uMode2D!.value !== settings.mode2D || this.integrator !== settings.integrator) this.accelerationValid = false;
    u.uMode2D!.value = settings.mode2D;
    this.integrator = settings.integrator;
  }

  upload(): void {
    this.attributes.needsUpdate = true;
    this.color.needsUpdate = true;
    this.spin.needsUpdate = true;
    this.sharedUniforms.uCount!.value = this.set.count;
    for (const [targets, data] of [[this.position, this.set.position], [this.velocity, this.set.velocity]] as const) {
      const source = this.dataTexture(data);
      this.copyMaterial.uniforms.uSource!.value = source;
      this.renderTo(this.copyMaterial, targets[this.current]!);
      source.dispose();
    }
    this.accelerationValid = false;
  }

  step(time: number): void {
    // Velocity-dependent forces need the implicit velocity update, which only the Euler pass has.
    if (this.integrator === 'verlet' && !this.velocityDependent) this.stepVerlet(time);
    else this.stepEuler(time);
  }

  private stepEuler(time: number): void {
    const next = 1 - this.current;
    const u = this.sharedUniforms;
    u.uTime!.value = time;
    u.uClockShift!.value = 0;
    u.texturePosition!.value = this.position[this.current]!.texture;
    u.textureVelocity!.value = this.velocity[this.current]!.texture;
    this.renderTo(this.velocityMaterial, this.velocity[next]!);
    u.textureVelocity!.value = this.velocity[next]!.texture;
    this.renderTo(this.positionMaterial, this.position[next]!);
    this.current = next;
  }

  /** Drift with a(x_n), evaluate a(x_{n+1}) at time t + dt, then kick with their average. */
  private stepVerlet(time: number): void {
    const u = this.sharedUniforms;
    const dt = u.uTimeStep!.value as number;
    const now = this.current;
    const next = 1 - now;
    if (!this.accelerationValid) {
      u.uTime!.value = time;
      u.uClockShift!.value = 0;
      u.texturePosition!.value = this.position[now]!.texture;
      u.textureVelocity!.value = this.velocity[now]!.texture;
      this.renderTo(this.accelerationMaterial, this.acceleration[now]!);
      this.accelerationValid = true;
    }
    u.texturePosition!.value = this.position[now]!.texture;
    u.textureVelocity!.value = this.velocity[now]!.texture;
    u.uAcceleration!.value = this.acceleration[now]!.texture;
    this.renderTo(this.verletPositionMaterial, this.position[next]!);

    u.uTime!.value = time + dt;
    u.uClockShift!.value = dt;
    u.texturePosition!.value = this.position[next]!.texture;
    this.renderTo(this.accelerationMaterial, this.acceleration[next]!);

    u.uAccelerationNext!.value = this.acceleration[next]!.texture;
    this.renderTo(this.verletVelocityMaterial, this.velocity[next]!);
    this.current = next;
  }

  /** Copies GPU positions and velocities back into the ParticleSet. */
  readback(): void {
    const rows = Math.ceil(this.set.count / this.width);
    if (rows === 0) return;
    const buffer = new Float32Array(rows * this.width * 4);
    for (const [targets, data] of [[this.position, this.set.position], [this.velocity, this.set.velocity]] as const) {
      this.renderer.readRenderTargetPixels(targets[this.current]!, 0, 0, this.width, rows, buffer);
      data.set(buffer.subarray(0, this.set.count * 4));
    }
  }

  /** Per-particle Σ_j V(r_ij) over the potential-mode forces (one float per particle). */
  readPotentials(time: number): Float32Array {
    const rows = Math.ceil(this.set.count / this.width);
    const result = new Float32Array(this.set.count);
    if (rows === 0) return result;
    this.buildPotentialPass();
    const u = this.sharedUniforms;
    u.uTime!.value = time;
    u.texturePosition!.value = this.position[this.current]!.texture;
    u.textureVelocity!.value = this.velocity[this.current]!.texture;
    this.renderTo(this.potentialMaterial, this.potentialTarget);
    const buffer = new Float32Array(rows * this.width * 4);
    this.renderer.readRenderTargetPixels(this.potentialTarget, 0, 0, this.width, rows, buffer);
    for (let k = 0; k < this.set.count; k++) result[k] = buffer[k * 4]!;
    return result;
  }

  // Built lazily: it only serves the Statistics dialog, so a failure here must not hold back
  // the forces, and force edits should not pay for a second O(N²) program nobody reads.
  private buildPotentialPass(): void {
    if (!this.potentialStale) return;
    const source = generatePotentialShader(this.forces);
    this.validate(this.prelude + source);
    this.potentialMaterial.dispose();
    this.potentialMaterial = this.material(source, this.forceUniforms);
    this.potentialStale = false;
  }

  /** Replaces the probe grid (xyz per probe). Probes live in their own textures, never in the particle set. */
  setProbes(positions: Float32Array): void {
    const count = positions.length / 3;
    if (!Number.isInteger(count) || count === 0) throw new Error(`probe positions must hold xyz for at least one probe, got ${positions.length} values`);
    const width = textureWidthFor(count);
    if (this.probes?.width !== width) {
      this.disposeProbes();
      const data = new Float32Array(width * width * 4);
      this.probes = { width, count, positions: this.dataTexture(data, width), target: this.target(width) };
    }
    const probes = this.probes!;
    probes.count = count;
    const data = probes.positions.image.data as Float32Array;
    data.fill(0);
    for (let k = 0; k < count; k++) data.set(positions.subarray(k * 3, k * 3 + 3), k * 4);
    probes.positions.needsUpdate = true;
  }

  get probeTexture(): Texture {
    if (!this.probes) throw new Error('no probe grid; call setProbes first');
    return this.probes.positions;
  }

  /** (F, |F|) per probe after computeField. */
  get fieldTexture(): Texture {
    if (!this.probes) throw new Error('no probe grid; call setProbes first');
    return this.probes.target.texture;
  }

  get probeWidth(): number {
    return this.probes?.width ?? 1;
  }

  /** Runs the probe pass for the test particle and returns |F| per probe (the field stays on the GPU for drawing). */
  /** Renders the field into the probe target (no readback; the arrows sample it directly). */
  computeField(time: number, probe: FieldProbe): void {
    if (!this.probes) throw new Error('no probe grid; call setProbes first');
    this.buildFieldPass();
    const { width, count, positions, target } = this.probes;
    const p = this.probeUniforms;
    p.uProbePositions!.value = positions;
    p.uProbeWidth!.value = width;
    p.uProbeCount!.value = count;
    (p.uProbeAttributes!.value as Vector4).set(probe.mass, probe.charge, probe.charge2, probe.parity);
    (p.uProbeColor!.value as Vector4).set(...probe.color, probe.nuclearCharge);
    (p.uProbeSpin!.value as Vector4).set(...probe.spin, probe.isospin);
    const u = this.sharedUniforms;
    u.uTime!.value = time;
    u.uClockShift!.value = 0;
    u.texturePosition!.value = this.position[this.current]!.texture;
    u.textureVelocity!.value = this.velocity[this.current]!.texture;
    this.renderTo(this.fieldMaterial, target);
  }

  /** |F| per probe from the last computeField; a synchronous readback, so callers keep it rare. */
  readFieldMagnitudes(): Float32Array {
    if (!this.probes) throw new Error('no probe grid; call setProbes first');
    const { width, count, target } = this.probes;
    const rows = Math.ceil(count / width);
    if (this.fieldBuffer?.length !== rows * width * 4) this.fieldBuffer = new Float32Array(rows * width * 4);
    this.renderer.readRenderTargetPixels(target, 0, 0, width, rows, this.fieldBuffer);
    const magnitudes = new Float32Array(count);
    for (let k = 0; k < count; k++) magnitudes[k] = this.fieldBuffer[k * 4 + 3]!;
    return magnitudes;
  }

  // Lazy for the same reasons as the potential pass: only the field view reads it.
  private buildFieldPass(): void {
    if (!this.fieldStale) return;
    const source = generateFieldShader(this.forces);
    this.validate(this.prelude + source);
    this.fieldMaterial.dispose();
    this.fieldMaterial = this.material(source, { ...this.forceUniforms, ...this.probeUniforms });
    this.fieldStale = false;
  }

  private disposeProbes(): void {
    this.probes?.positions.dispose();
    this.probes?.target.dispose();
    this.probes = undefined;
  }

  /** Reads the current velocities (vx, vy, vz, clock per particle) without touching the ParticleSet. */
  readVelocities(): Float32Array {
    const rows = Math.ceil(this.set.count / this.width);
    const buffer = new Float32Array(rows * this.width * 4);
    if (rows > 0) this.renderer.readRenderTargetPixels(this.velocity[this.current]!, 0, 0, this.width, rows, buffer);
    return buffer;
  }

  /** Reads a single particle position without a full-texture readback. */
  readPosition(index: number): [number, number, number] {
    if (!(index >= 0 && index < this.set.count)) throw new Error(`particle index ${index} out of range [0, ${this.set.count})`);
    const texel = new Float32Array(4);
    this.renderer.readRenderTargetPixels(this.position[this.current]!, index % this.width, Math.floor(index / this.width), 1, 1, texel);
    return [texel[0]!, texel[1]!, texel[2]!];
  }

  dispose(): void {
    [...this.position, ...this.velocity, ...this.acceleration, this.potentialTarget].forEach((target) => target.dispose());
    this.programs().forEach((m) => m.dispose());
    this.disposeProbes();
    this.attributes.dispose();
    this.color.dispose();
    this.spin.dispose();
    this.quad.dispose();
  }

  private programs(): RawShaderMaterial[] {
    return [
      this.positionMaterial, this.velocityMaterial, this.accelerationMaterial, this.verletPositionMaterial,
      this.verletVelocityMaterial, this.potentialMaterial, this.fieldMaterial, this.copyMaterial,
    ];
  }

  private renderTo(material: RawShaderMaterial, target: WebGLRenderTarget): void {
    const previous = this.renderer.getRenderTarget();
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.quad.render(this.renderer);
    this.renderer.setRenderTarget(previous);
  }

  private validate(fragmentSource: string): void {
    const gl = this.renderer.getContext();
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!shader) throw new Error('WebGL refused to create a fragment shader (context lost?)');
    try {
      gl.shaderSource(shader, `#version 300 es\n${fragmentSource}`);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new ShaderCompileError(gl.getShaderInfoLog(shader) ?? 'no info log', fragmentSource);
      }
    } finally {
      gl.deleteShader(shader);
    }
  }

  private material(body: string, uniforms: Record<string, IUniform>): RawShaderMaterial {
    return new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX_SHADER,
      fragmentShader: this.prelude + body,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
  }

  private target(width = this.width): WebGLRenderTarget {
    return new WebGLRenderTarget(width, width, {
      type: FloatType,
      format: RGBAFormat,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
    });
  }

  private dataTexture(data: Float32Array, width = this.width): DataTexture {
    const texture = new DataTexture(data, width, width, RGBAFormat, FloatType);
    texture.needsUpdate = true;
    return texture;
  }
}
