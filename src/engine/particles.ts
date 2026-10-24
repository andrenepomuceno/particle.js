export const ParticleKind = { dynamic: 1, fixed: 2 } as const;
export type ParticleKind = (typeof ParticleKind)[keyof typeof ParticleKind];

export type Vec3 = [number, number, number];

export interface Particle {
  kind: ParticleKind;
  position: Vec3;
  velocity: Vec3;
  time: number;
  mass: number;
  charge: number;
  spin: number;
  parity: number;
  /** v1's nuclear charge: couples the nuclear force through n_i·n_j. */
  nuclearCharge: number;
  color: Vec3;
}

export const TEXEL = 4;

/**
 * Struct-of-arrays layout mirroring the GPU textures one-to-one:
 * position = (x, y, z, kind), velocity = (vx, vy, vz, time),
 * attributes = (mass, charge, spin, parity), color = (r, g, b, nuclear charge).
 */
export class ParticleSet {
  readonly position: Float32Array;
  readonly velocity: Float32Array;
  readonly attributes: Float32Array;
  readonly color: Float32Array;
  count = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`particle capacity must be a positive integer, got ${capacity}`);
    }
    this.position = new Float32Array(capacity * TEXEL);
    this.velocity = new Float32Array(capacity * TEXEL);
    this.attributes = new Float32Array(capacity * TEXEL);
    this.color = new Float32Array(capacity * TEXEL);
  }

  add(particle: Particle): number {
    if (this.count >= this.capacity) {
      throw new Error(`particle capacity exceeded: ${this.capacity} slots, all in use`);
    }
    assertValidParticle(particle, this.count);
    this.write(this.count, particle);
    return this.count++;
  }

  addAll(particles: readonly Particle[]): void {
    if (this.count + particles.length > this.capacity) {
      throw new Error(
        `cannot add ${particles.length} particles: ${this.count} in use, capacity ${this.capacity}`,
      );
    }
    particles.forEach((particle, k) => assertValidParticle(particle, k));
    particles.forEach((particle) => this.add(particle));
  }

  get(index: number): Particle {
    this.assertIndex(index);
    const o = index * TEXEL;
    const { position: p, velocity: v, attributes: a, color: c } = this;
    return {
      kind: p[o + 3] as ParticleKind,
      position: [p[o]!, p[o + 1]!, p[o + 2]!],
      velocity: [v[o]!, v[o + 1]!, v[o + 2]!],
      time: v[o + 3]!,
      mass: a[o]!,
      charge: a[o + 1]!,
      spin: a[o + 2]!,
      parity: a[o + 3]!,
      nuclearCharge: c[o + 3]!,
      color: [c[o]!, c[o + 1]!, c[o + 2]!],
    };
  }

  set(index: number, particle: Particle): void {
    this.assertIndex(index);
    assertValidParticle(particle, index);
    this.write(index, particle);
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

  private write(index: number, particle: Particle): void {
    const o = index * TEXEL;
    this.position.set([...particle.position, particle.kind], o);
    this.velocity.set([...particle.velocity, particle.time], o);
    this.attributes.set([particle.mass, particle.charge, particle.spin, particle.parity], o);
    this.color.set([...particle.color, particle.nuclearCharge], o);
  }

  private copySlot(from: number, to: number): void {
    for (const array of [this.position, this.velocity, this.attributes, this.color]) {
      array.copyWithin(to * TEXEL, from * TEXEL, from * TEXEL + TEXEL);
    }
  }

  private clearSlot(index: number): void {
    for (const array of [this.position, this.velocity, this.attributes, this.color]) {
      array.fill(0, index * TEXEL, index * TEXEL + TEXEL);
    }
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
    particle.time, particle.mass, particle.charge, particle.spin, particle.parity, particle.nuclearCharge,
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
    spin: 0,
    parity: 1,
    nuclearCharge: 0,
    color: [0, 0, 0],
    ...overrides,
  };
}
