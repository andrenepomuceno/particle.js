import type { CompiledForce } from '../forces/compile';
import { kineticEnergy, lorentzFactor } from '../metric';
import { ParticleKind, TEXEL, type ParticleSet, type Vec3 } from '../particles';
import { pairPotential, pairScope } from './pairs';

export interface EnergySample {
  /** Σ (γ − 1)·m·c², which is Σ ½·m·v² when Galilean. */
  kinetic: number;
  /** Only forces written as potentials contribute; see `missing`. */
  potential: number;
  /** Enabled forces written as F(r), whose energy is unknown. */
  missing: string[];
  /** Coordinate speeds |v| = |u|/γ (below c under Minkowski). */
  meanSpeed: number;
  maxSpeed: number;
  /** Equipartition temperature with k_B = 1: <KE> = (d/2)·T for d = 2 or 3. */
  temperature: number;
}

/**
 * Combines velocities (stored ones, as read back: u under Minkowski) and per-particle potential sums
 * into the stats dialog's physics sample.
 */
export function summarizeEnergy(
  set: ParticleSet,
  velocity: Float32Array,
  potentials: Float32Array,
  forces: readonly CompiledForce[],
  mode2D: boolean,
): EnergySample {
  let kinetic = 0;
  let speedSum = 0;
  let maxSpeed = 0;
  let dynamic = 0;
  const inverseC2 = set.inverseLightSpeed2;
  for (let k = 0; k < set.count; k++) {
    if (set.position[k * TEXEL + 3] === ParticleKind.fixed) continue;
    const o = k * TEXEL;
    const u = velocity.subarray(o, o + 3);
    kinetic += kineticEnergy(set.attributes[o]!, u, inverseC2);
    const speed = Math.hypot(u[0]!, u[1]!, u[2]!) / lorentzFactor(u, inverseC2);
    speedSum += speed;
    maxSpeed = Math.max(maxSpeed, speed);
    dynamic++;
  }
  let pairSum = 0;
  for (let k = 0; k < set.count; k++) pairSum += potentials[k]!;
  return {
    kinetic,
    potential: 0.5 * pairSum,
    missing: forces.filter((f) => !f.evaluatePotential).map((f) => f.definition.name),
    meanSpeed: dynamic ? speedSum / dynamic : 0,
    maxSpeed,
    temperature: dynamic ? kinetic / dynamic / (mode2D ? 1 : 1.5) : 0,
  };
}

/** Total momentum and angular momentum of the dynamic particles (fixed ones are outside the system). */
export interface MomentumSample {
  /** P = Σ m·u: the relativistic momentum γmv under Minkowski, m·v when Galilean. */
  momentum: Vec3;
  /** L = Σ m·(r × u) about the origin; about a point Q it is L − Q × P (see angularMomentumAbout). */
  angularMomentum: Vec3;
  /** Σ m·|u| and Σ m·|r|·|u|: the sizes P and L could reach, the scale their changes are judged against. */
  momentumScale: number;
  angularScale: number;
}

/** Sums P and L from positions and stored velocities laid out as the textures (four floats per particle). */
export function summarizeMomentum(set: ParticleSet, position: Float32Array, velocity: Float32Array): MomentumSample {
  let px = 0, py = 0, pz = 0, lx = 0, ly = 0, lz = 0, momentumScale = 0, angularScale = 0;
  for (let k = 0; k < set.count; k++) {
    const o = k * TEXEL;
    if (set.position[o + 3] === ParticleKind.fixed) continue;
    const m = set.attributes[o]!;
    const x = position[o]!, y = position[o + 1]!, z = position[o + 2]!;
    const ux = m * velocity[o]!, uy = m * velocity[o + 1]!, uz = m * velocity[o + 2]!;
    px += ux;
    py += uy;
    pz += uz;
    lx += y * uz - z * uy;
    ly += z * ux - x * uz;
    lz += x * uy - y * ux;
    const size = Math.hypot(ux, uy, uz);
    momentumScale += size;
    angularScale += size * Math.hypot(x, y, z);
  }
  return { momentum: [px, py, pz], angularMomentum: [lx, ly, lz], momentumScale, angularScale };
}

/** Angular momentum about `point` from the one about the origin: L_Q = L_O − Q × P. */
export function angularMomentumAbout(sample: MomentumSample, point: Vec3): Vec3 {
  const [p, l, q] = [sample.momentum, sample.angularMomentum, point];
  return [l[0] - (q[1] * p[2] - q[2] * p[1]), l[1] - (q[2] * p[0] - q[0] * p[2]), l[2] - (q[0] * p[1] - q[1] * p[0])];
}

export interface SpacetimeSample {
  /** Largest Lorentz factor among the dynamic particles (1 when Galilean). */
  maxGamma: number;
  /** Earliest and latest particle clocks: proper times under Minkowski, ages when Galilean. */
  clockMin: number;
  clockMax: number;
}

/** Lorentz factors and the clock spread from read-back (stored) velocities. */
export function summarizeSpacetime(set: ParticleSet, velocity: Float32Array): SpacetimeSample {
  let maxGamma = 1;
  let clockMin = Infinity;
  let clockMax = -Infinity;
  for (let k = 0; k < set.count; k++) {
    const o = k * TEXEL;
    clockMin = Math.min(clockMin, velocity[o + 3]!);
    clockMax = Math.max(clockMax, velocity[o + 3]!);
    if (set.position[o + 3] !== ParticleKind.fixed) maxGamma = Math.max(maxGamma, lorentzFactor(velocity.subarray(o, o + 3), set.inverseLightSpeed2));
  }
  return set.count > 0 ? { maxGamma, clockMin, clockMax } : { maxGamma, clockMin: 0, clockMax: 0 };
}

/** Float64 mirror of the GPU potential pass: Σ_j V(r_ij) per particle. */
export function referencePotentials(set: ParticleSet, forces: readonly CompiledForce[], time: number, lightSpeed: number): Float32Array {
  const pos = set.position;
  const result = new Float32Array(set.count);
  for (let i = 0; i < set.count; i++) {
    let sum = 0;
    for (let j = 0; j < set.count; j++) {
      if (j === i) continue;
      const r2 = [0, 1, 2].reduce((acc, k) => acc + (pos[i * TEXEL + k]! - pos[j * TEXEL + k]!) ** 2, 0);
      if (r2 === 0) continue;
      // Potentials cannot read random numbers (compileForce refuses them).
      const pair = pairScope(set, i, j, time, false, lightSpeed);
      sum += pairPotential(forces, pair, Math.sqrt(r2));
    }
    result[i] = sum;
  }
  return result;
}
