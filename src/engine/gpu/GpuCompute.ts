import {
  ClampToEdgeWrapping, DataTexture, FloatType, GLSL3, NearestFilter, RawShaderMaterial, RGBAFormat,
  Vector4, WebGLArrayRenderTarget, WebGLRenderTarget, type IUniform, type Texture, type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { forceUniformName, type CompiledForce } from '../forces/compile';
import type { FieldProbe } from '../field';
import type { ParticleSet } from '../particles';
import { inverseLightSpeed2 } from '../metric';
import { DEFAULT_SETTINGS, type SimulationSettings } from '../settings';
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

/** The GPU cannot hold the history retarded forces asked for (layers or memory); it is freed. */
export class HistoryAllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoryAllocationError';
  }
}

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
 * Past states for retarded forces: `depth` layers of positions and stored velocities, a ring whose
 * newest layer is `head`, and each layer's time in a depth×1 texture. See cpu/history.ts, its mirror.
 */
interface History {
  depth: number;
  /** Texture rows the particles occupy: layers hold only these, so the cost follows the particle count. */
  rows: number;
  head: number;
  /** Stored steps; older ones extrapolate the oldest stored state by `resetDt` per step (a restart costs one copy). */
  filled: number;
  resetDt: number;
  /** Times are stored as offsets from `base` (float32 keeps their differences); `exact` keeps them for rebasing. */
  base: number;
  exact: Float64Array;
  position: WebGLArrayRenderTarget;
  velocity: WebGLArrayRenderTarget;
  times: DataTexture;
}

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
  private history: History | undefined;
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
      uHistoryPosition: { value: null },
      uHistoryVelocity: { value: null },
      uHistoryTimes: { value: null },
      uHistoryHead: { value: 0 },
      uHistoryCount: { value: 0 },
      uHistoryFilled: { value: 0 },
      uHistoryResetDt: { value: 0 },
      uHistoryNow: { value: 0 },
      uInverseLightSpeed2: { value: 0 },
      uLightSpeed: { value: DEFAULT_SETTINGS.lightSpeed },
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
    // The stored velocities must be rewritten with it (ParticleSet.setMetric, then upload).
    u.uInverseLightSpeed2!.value = inverseLightSpeed2(settings);
    // c is an input of forces that read c_light, like their parameters: Verlet's stored a(x) goes stale.
    if (u.uLightSpeed!.value !== settings.lightSpeed) this.accelerationValid = false;
    u.uLightSpeed!.value = settings.lightSpeed;
    this.integrator = settings.integrator;
  }

  /** Copies the ParticleSet to the GPU; a history restarts from it, extrapolated back from `time`. */
  upload(time: number): void {
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
    // Edits can renumber particles: the past is rebuilt from the new present, in layers sized for them.
    if (this.history && this.history.rows !== this.historyRows()) this.setHistoryDepth(this.history.depth, time);
    else this.resetHistory(time);
  }

  step(time: number): void {
    // Velocity-dependent forces need the implicit velocity update, which only the Euler pass has.
    if (this.integrator === 'verlet' && !this.velocityDependent) this.stepVerlet(time);
    else this.stepEuler(time);
    if (this.history) this.pushHistory(time + (this.sharedUniforms.uTimeStep!.value as number));
  }

  /**
   * Keeps `depth` past states for retarded forces (0 frees them). A new history is extrapolated back
   * from the present at `time`, as if every particle had moved uniformly before.
   */
  setHistoryDepth(depth: number, time: number): void {
    const rows = this.historyRows();
    if ((this.history?.depth ?? 0) === depth && (depth === 0 || this.history!.rows === rows)) return;
    if (depth > this.maxHistoryDepth) {
      this.disposeHistory();
      this.bindHistory();
      throw new HistoryAllocationError(`a history of ${depth} steps exceeds this GPU's ${this.maxHistoryDepth} texture array layers`);
    }
    this.disposeHistory();
    if (depth > 0) {
      const options = { type: FloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false };
      this.history = {
        depth, rows, head: 0, filled: 1, resetDt: 0, base: time, exact: new Float64Array(depth),
        position: new WebGLArrayRenderTarget(this.width, rows, depth, options),
        velocity: new WebGLArrayRenderTarget(this.width, rows, depth, options),
        times: new DataTexture(new Float32Array(depth * 4), depth, 1, RGBAFormat, FloatType),
      };
      const gl = this.renderer.getContext();
      while (gl.getError() !== gl.NO_ERROR);
      this.resetHistory(time);
      if (gl.getError() === gl.OUT_OF_MEMORY) {
        const megabytes = this.historyBytes(depth) / 2 ** 20;
        this.disposeHistory();
        this.bindHistory();
        throw new HistoryAllocationError(`the GPU ran out of memory allocating a history of ${depth} steps (${megabytes.toFixed(0)} MB)`);
      }
    }
    this.bindHistory();
  }

  /** Most history steps this GPU holds: texture array layers, and the width of the times texture. */
  get maxHistoryDepth(): number {
    // The app requires WebGL2 (main.tsx checks it before creating the renderer).
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    return Math.min(gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
  }

  /** Bytes a history of `depth` steps takes for the current particles: positions and velocities, RGBA floats. */
  historyBytes(depth: number): number {
    return 2 * depth * this.width * this.historyRows() * 16;
  }

  private historyRows(): number {
    return Math.max(1, Math.ceil(this.set.count / this.width));
  }

  // Step k (1 = newest) lives in layer head − (k − 1) of the ring. A restart stores only the present; the
  // shader extrapolates the steps before it (cpu/history.ts does the same).
  private resetHistory(time: number): void {
    const history = this.history;
    if (!history) return;
    history.head = 0;
    history.filled = 1;
    history.resetDt = this.sharedUniforms.uTimeStep!.value as number;
    history.base = time;
    this.storeHistoryStep(time);
  }

  private pushHistory(time: number): void {
    const history = this.history!;
    history.head = (history.head + 1) % history.depth;
    history.filled = Math.min(history.filled + 1, history.depth);
    // Offsets stay small: past 4096 time units from the base, every stored time moves to a new one.
    if (time - history.base > 4096) history.base = time;
    this.storeHistoryStep(time);
  }

  /** Copies the present into the head layer and rewrites the time offsets. */
  private storeHistoryStep(time: number): void {
    const history = this.history!;
    this.copyMaterial.uniforms.uSource!.value = this.position[this.current]!.texture;
    this.renderTo(this.copyMaterial, history.position, history.head);
    this.copyMaterial.uniforms.uSource!.value = this.velocity[this.current]!.texture;
    this.renderTo(this.copyMaterial, history.velocity, history.head);
    history.exact[history.head] = time;
    const times = history.times.image.data as Float32Array;
    for (let layer = 0; layer < history.depth; layer++) times[layer * 4] = history.exact[layer]! - history.base;
    history.times.needsUpdate = true;
    this.bindHistory();
  }

  /** Sets the evaluation time of the coming passes (and its offset in the history's frame). */
  private setTime(time: number): void {
    this.sharedUniforms.uTime!.value = time;
    this.sharedUniforms.uHistoryNow!.value = time - (this.history?.base ?? 0);
  }

  private bindHistory(): void {
    const u = this.sharedUniforms;
    u.uHistoryPosition!.value = this.history?.position.texture ?? null;
    u.uHistoryVelocity!.value = this.history?.velocity.texture ?? null;
    u.uHistoryTimes!.value = this.history?.times ?? null;
    u.uHistoryHead!.value = this.history?.head ?? 0;
    u.uHistoryCount!.value = this.history?.depth ?? 0;
    u.uHistoryFilled!.value = this.history?.filled ?? 0;
    u.uHistoryResetDt!.value = this.history?.resetDt ?? 0;
  }

  private disposeHistory(): void {
    this.history?.position.dispose();
    this.history?.velocity.dispose();
    this.history?.times.dispose();
    this.history = undefined;
  }

  private stepEuler(time: number): void {
    const next = 1 - this.current;
    const u = this.sharedUniforms;
    this.setTime(time);
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
      this.setTime(time);
      u.uClockShift!.value = 0;
      u.texturePosition!.value = this.position[now]!.texture;
      u.textureVelocity!.value = this.velocity[now]!.texture;
      // The pass samples uAcceleration (shiftedClock; unread while uClockShift is 0). After an odd
      // number of Euler steps it can still be the target texture, a feedback loop WebGL refuses.
      u.uAcceleration!.value = this.acceleration[next]!.texture;
      this.renderTo(this.accelerationMaterial, this.acceleration[now]!);
      this.accelerationValid = true;
    }
    u.texturePosition!.value = this.position[now]!.texture;
    u.textureVelocity!.value = this.velocity[now]!.texture;
    u.uAcceleration!.value = this.acceleration[now]!.texture;
    this.renderTo(this.verletPositionMaterial, this.position[next]!);

    this.setTime(time + dt);
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
    this.setTime(time);
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
    this.setTime(time);
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

  /** Reads the stored velocities (vx, vy, vz, clock per particle; u = γv under Minkowski) without touching the ParticleSet. */
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
    this.disposeHistory();
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

  private renderTo(material: RawShaderMaterial, target: WebGLRenderTarget, layer = 0): void {
    const previous = this.renderer.getRenderTarget();
    this.quad.material = material;
    this.renderer.setRenderTarget(target, layer);
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
