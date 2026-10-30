export const ParticleKind = { dynamic: 1, fixed: 2 } as const;
export type ParticleKind = (typeof ParticleKind)[keyof typeof ParticleKind];

import { coordinateVelocity, properVelocity } from './metric';

export type Vec3 = [number, number, number];

export interface Particle {
  kind: ParticleKind;
  position: Vec3;
  /** Coordinate velocity dx/dt, under either metric (the set stores u = γv under Minkowski). */
  velocity: Vec3;
  time: number;
  mass: number;
  /** First component of the 2D charge (the usual electric charge); `charge2` is the second. */
  charge: number;
  charge2: number;
  /** Fixed 3D spin vector: it couples through expressions but does not precess. */
  spin: Vec3;
  /** Isospin projection I3 (u: +1/2, d: -1/2). */
  isospin: number;
  parity: number;
  /** v1's nuclear charge: couples the nuclear force through n_i·n_j. */
  nuclearCharge: number;
  color: Vec3;
}

export const TEXEL = 4;

/**
 * Struct-of-arrays layout mirroring the GPU textures one-to-one:
 * position = (x, y, z, kind), velocity = (vx, vy, vz, time),
 * attributes = (mass, charge, charge2, parity), color = (r, g, b, nuclear charge),
 * spin = (sx, sy, sz, isospin).
 * Under the Minkowski metric the velocity array holds the proper velocity u = γv, as the textures
 * do (see metric.ts); `get`, `set`, `add` and `toArray` convert, so Particle objects always carry v.
 */
export class ParticleSet {
  readonly position: Float32Array;
  readonly velocity: Float32Array;
  readonly attributes: Float32Array;
  readonly color: Float32Array;
  readonly spin: Float32Array;
  count = 0;
  /** k = 1/c² the velocity array is written for (0: Galilean, it holds v). */
  private k = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`particle capacity must be a positive integer, got ${capacity}`);
    }
    this.position = new Float32Array(capacity * TEXEL);
    this.velocity = new Float32Array(capacity * TEXEL);
    this.attributes = new Float32Array(capacity * TEXEL);
    this.color = new Float32Array(capacity * TEXEL);
    this.spin = new Float32Array(capacity * TEXEL);
  }

  get inverseLightSpeed2(): number {
    return this.k;
  }

  /**
   * Rewrites the stored velocities for a new k = 1/c², keeping every coordinate velocity v.
   * Throws without changing anything when a particle would reach the new c.
   */
  setInverseLightSpeed2(k: number): void {
    if (!(Number.isFinite(k) && k >= 0)) throw new Error(`1/c² must be finite and >= 0, got ${k}`);
    const rewritten = new Float32Array(this.count * 3);
    const tooFast: number[] = [];
    for (let index = 0; index < this.count; index++) {
      const o = index * TEXEL;
      const v = coordinateVelocity(this.velocity.subarray(o, o + 3), this.k);
      try {
        rewritten.set(properVelocity(v, k), index * 3);
      } catch {
        tooFast.push(index);
      }
    }
    if (tooFast.length > 0) {
      const fastest = Math.max(...tooFast.map((index) => Math.hypot(...coordinateVelocity(this.velocity.subarray(index * TEXEL, index * TEXEL + 3), this.k))));
      throw new Error(`${tooFast.length} particle(s) move at or above c = ${1 / Math.sqrt(k)} (fastest ${fastest}); raise c or slow them down first`);
    }
    for (let index = 0; index < this.count; index++) this.velocity.set(rewritten.subarray(index * 3, index * 3 + 3), index * TEXEL);
    this.k = k;
  }

  add(particle: Particle): number {
    if (this.count >= this.capacity) {
      throw new Error(`particle capacity exceeded: ${this.capacity} slots, all in use`);
    }
    this.assertWritable(particle, this.count);
    this.write(this.count, particle);
    return this.count++;
  }

  addAll(particles: readonly Particle[]): void {
    if (this.count + particles.length > this.capacity) {
      throw new Error(
        `cannot add ${particles.length} particles: ${this.count} in use, capacity ${this.capacity}`,
      );
    }
    particles.forEach((particle, k) => this.assertWritable(particle, k));
    particles.forEach((particle) => this.add(particle));
  }

  get(index: number): Particle {
    this.assertIndex(index);
    const o = index * TEXEL;
    const { position: p, velocity: v, attributes: a, color: c, spin: s } = this;
    return {
      kind: p[o + 3] as ParticleKind,
      position: [p[o]!, p[o + 1]!, p[o + 2]!],
      velocity: coordinateVelocity(v.subarray(o, o + 3), this.k),
      time: v[o + 3]!,
      mass: a[o]!,
      charge: a[o + 1]!,
      charge2: a[o + 2]!,
      spin: [s[o]!, s[o + 1]!, s[o + 2]!],
      isospin: s[o + 3]!,
      parity: a[o + 3]!,
      nuclearCharge: c[o + 3]!,
      color: [c[o]!, c[o + 1]!, c[o + 2]!],
    };
  }

  set(index: number, particle: Particle): void {
    this.assertIndex(index);
    this.assertWritable(particle, index);
    this.write(index, particle);
  }

  /**
   * velocity → velocity·factor + kick on the stored velocity: v when Galilean, the momentum per
   * mass u = γv under Minkowski, so no amount of scaling or kicking reaches c.
   */
  scaleVelocity(index: number, factor: number, kick: Vec3): void {
    this.assertIndex(index);
    const o = index * TEXEL;
    for (let axis = 0; axis < 3; axis++) this.velocity[o + axis] = this.velocity[o + axis]! * factor + kick[axis]!;
  }

  toArray(): Particle[] {
    return Array.from({ length: this.count }, (_, k) => this.get(k));
  }

  /** Removes the given indices, keeping the survivors in their original order. */
  remove(indices: Iterable<number>): void {
    const doomed = new Set(indices);
    for (const index of doomed) this.assertIndex(index);
    let write = 0;
    for (let read = 0; read < this.count; read++) {
      if (doomed.has(read)) continue;
      if (write !== read) this.copySlot(read, write);
      write++;
    }
    for (let k = write; k < this.count; k++) this.clearSlot(k);
    this.count = write;
  }

  clear(): void {
    for (let k = 0; k < this.count; k++) this.clearSlot(k);
    this.count = 0;
  }

  /** A valid particle whose speed stays below c, so it has a proper velocity to store. */
  private assertWritable(particle: Particle, index: number): void {
    assertValidParticle(particle, index);
    try {
      properVelocity(particle.velocity, this.k);
    } catch (error) {
      throw new Error(`particle #${index}: ${(error as Error).message}`, { cause: error });
    }
  }

  private write(index: number, particle: Particle): void {
    const o = index * TEXEL;
    this.position.set([...particle.position, particle.kind], o);
    this.velocity.set([...properVelocity(particle.velocity, this.k), particle.time], o);
    this.attributes.set([particle.mass, particle.charge, particle.charge2, particle.parity], o);
    this.spin.set([...particle.spin, particle.isospin], o);
    this.color.set([...particle.color, particle.nuclearCharge], o);
  }

  private copySlot(from: number, to: number): void {
    for (const array of this.arrays()) {
      array.copyWithin(to * TEXEL, from * TEXEL, from * TEXEL + TEXEL);
    }
  }

  private clearSlot(index: number): void {
    for (const array of this.arrays()) {
      array.fill(0, index * TEXEL, index * TEXEL + TEXEL);
    }
  }

  private arrays(): Float32Array[] {
    return [this.position, this.velocity, this.attributes, this.color, this.spin];
  }

  private assertIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw new Error(`particle index ${index} out of range [0, ${this.count})`);
    }
  }
}

export function assertValidParticle(particle: Particle, index: number): void {
  const numbers = [
    ...particle.position, ...particle.velocity, ...particle.color,
    particle.time, particle.mass, particle.charge, particle.charge2, ...particle.spin, particle.isospin, particle.parity, particle.nuclearCharge,
  ];
  if (!numbers.every(Number.isFinite)) {
    throw new Error(`particle #${index} has a non-finite field: ${JSON.stringify(particle)}`);
  }
  if (!(particle.mass > 0)) {
    throw new Error(`particle #${index} must have mass > 0, got ${particle.mass}`);
  }
  if (particle.kind !== ParticleKind.dynamic && particle.kind !== ParticleKind.fixed) {
    throw new Error(`particle #${index} has unknown kind ${String(particle.kind)}`);
  }
}

export function defaultParticle(overrides: Partial<Particle> = {}): Particle {
  return {
    kind: ParticleKind.dynamic,
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    time: 0,
    mass: 1,
    charge: 0,
    charge2: 0,
    spin: [0, 0, 0],
    isospin: 0,
    parity: 1,
    nuclearCharge: 0,
    color: [0, 0, 0],
    ...overrides,
  };
}
