import {
  ClampToEdgeWrapping, DataTexture, FloatType, GLSL3, NearestFilter, RawShaderMaterial, RGBAFormat,
  WebGLRenderTarget, type IUniform, type Texture, type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { forceUniformName, type CompiledForce } from '../forces/compile';
import type { ParticleSet } from '../particles';
import type { SimulationSettings } from '../settings';
import { BOUNDARY_CODE, generateVelocityShader, POSITION_SHADER } from '../shaders/computeShaders';

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
  private current = 0;
  private readonly attributes: DataTexture;
  private readonly color: DataTexture;
  private readonly quad = new FullScreenQuad();
  private readonly sharedUniforms: Record<string, IUniform>;
  private velocityMaterial: RawShaderMaterial;
  private readonly positionMaterial: RawShaderMaterial;
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
    this.attributes = this.dataTexture(set.attributes);
    this.color = this.dataTexture(set.color);
    this.sharedUniforms = {
      texturePosition: { value: null },
      textureVelocity: { value: null },
      uAttributes: { value: this.attributes },
      uColor: { value: this.color },
      uCount: { value: 0 },
      uTimeStep: { value: 1 },
      uTime: { value: 0 },
      uFriction: { value: 0 },
      uMaxSpeed: { value: 0 },
      uBoundary: { value: 0 },
      uBoundarySize: { value: 1 },
      uRestitution: { value: 1 },
      uMode2D: { value: false },
    };
    this.positionMaterial = this.material(POSITION_SHADER, this.sharedUniforms);
    this.velocityMaterial = this.material(generateVelocityShader([]), this.sharedUniforms);
    this.copyMaterial = this.material(COPY_SHADER, { uSource: { value: null } });
    for (const material of [this.positionMaterial, this.velocityMaterial, this.copyMaterial]) {
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

  /** Recompiles the velocity pass. On failure the previous forces stay active. */
  setForces(forces: readonly CompiledForce[]): void {
    const source = generateVelocityShader(forces);
    this.validate(this.prelude + source);
    const uniforms: Record<string, IUniform> = { ...this.sharedUniforms };
    forces.forEach((_, index) => {
      for (const name of ['cutoff', 'soft2', ...forces[index]!.definition.params.map((p) => p.name)]) {
        uniforms[forceUniformName(index, name)] = { value: 0 };
      }
    });
    const material = this.material(source, uniforms);
    this.velocityMaterial.dispose();
    this.velocityMaterial = material;
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
  }

  setSettings(settings: SimulationSettings): void {
    const u = this.sharedUniforms;
    u.uTimeStep!.value = settings.timeStep;
    u.uFriction!.value = settings.friction;
    u.uMaxSpeed!.value = settings.maxSpeed;
    u.uBoundary!.value = BOUNDARY_CODE[settings.boundary];
    u.uBoundarySize!.value = settings.boundarySize;
    u.uRestitution!.value = settings.restitution;
    u.uMode2D!.value = settings.mode2D;
  }

  upload(): void {
    this.attributes.needsUpdate = true;
    this.color.needsUpdate = true;
    this.sharedUniforms.uCount!.value = this.set.count;
    for (const [targets, data] of [[this.position, this.set.position], [this.velocity, this.set.velocity]] as const) {
      const source = this.dataTexture(data);
      this.copyMaterial.uniforms.uSource!.value = source;
      this.renderTo(this.copyMaterial, targets[this.current]!);
      source.dispose();
    }
  }

  step(time: number): void {
    const next = 1 - this.current;
    const u = this.sharedUniforms;
    u.uTime!.value = time;
    u.texturePosition!.value = this.position[this.current]!.texture;
    u.textureVelocity!.value = this.velocity[this.current]!.texture;
    this.renderTo(this.velocityMaterial, this.velocity[next]!);
    u.textureVelocity!.value = this.velocity[next]!.texture;
    this.renderTo(this.positionMaterial, this.position[next]!);
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

  /** Reads a single particle position without a full-texture readback. */
  readPosition(index: number): [number, number, number] {
    if (!(index >= 0 && index < this.set.count)) throw new Error(`particle index ${index} out of range [0, ${this.set.count})`);
    const texel = new Float32Array(4);
    this.renderer.readRenderTargetPixels(this.position[this.current]!, index % this.width, Math.floor(index / this.width), 1, 1, texel);
    return [texel[0]!, texel[1]!, texel[2]!];
  }

  dispose(): void {
    [...this.position, ...this.velocity].forEach((target) => target.dispose());
    [this.velocityMaterial, this.positionMaterial, this.copyMaterial].forEach((m) => m.dispose());
    this.attributes.dispose();
    this.color.dispose();
    this.quad.dispose();
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

  private target(): WebGLRenderTarget {
    return new WebGLRenderTarget(this.width, this.width, {
      type: FloatType,
      format: RGBAFormat,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
    });
  }

  private dataTexture(data: Float32Array): DataTexture {
    const texture = new DataTexture(data, this.width, this.width, RGBAFormat, FloatType);
    texture.needsUpdate = true;
    return texture;
  }
}
