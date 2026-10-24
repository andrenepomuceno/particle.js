import type { CompiledForce } from '../forces/compile';
import { ParticleKind, TEXEL, type ParticleSet } from '../particles';
import { pairScope, pairTerm } from './pairs';

export interface EnergySample {
  kinetic: number;
  /** Only forces written as potentials contribute; see `missing`. */
  potential: number;
  /** Enabled forces written as F(r), whose energy is unknown. */
  missing: string[];
  meanSpeed: number;
  maxSpeed: number;
  /** Equipartition temperature with k_B = 1: <KE> = (d/2)·T for d = 2 or 3. */
  temperature: number;
}

/** Combines velocities and per-particle potential sums into the stats dialog's physics sample. */
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
  for (let k = 0; k < set.count; k++) {
    if (set.position[k * TEXEL + 3] === ParticleKind.fixed) continue;
    const o = k * TEXEL;
    const speed2 = velocity[o]! ** 2 + velocity[o + 1]! ** 2 + velocity[o + 2]! ** 2;
    kinetic += 0.5 * set.attributes[o]! * speed2;
    const speed = Math.sqrt(speed2);
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

/** Float64 mirror of the GPU potential pass: Σ_j V(r_ij) per particle. */
export function referencePotentials(set: ParticleSet, forces: readonly CompiledForce[], time: number): Float32Array {
  const pos = set.position;
  const result = new Float32Array(set.count);
  for (let i = 0; i < set.count; i++) {
    let sum = 0;
    for (let j = 0; j < set.count; j++) {
      if (j === i) continue;
      const r2 = [0, 1, 2].reduce((acc, k) => acc + (pos[i * TEXEL + k]! - pos[j * TEXEL + k]!) ** 2, 0);
      if (r2 === 0) continue;
      const pair = pairScope(set, i, j, time);
      for (const f of forces) if (f.evaluatePotential) sum += pairTerm(f, f.evaluatePotential, pair, Math.sqrt(r2));
    }
    result[i] = sum;
  }
  return result;
}
