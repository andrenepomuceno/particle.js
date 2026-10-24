import { forceScope, type CompiledForce, type PairScope } from '../forces/compile';
import { ParticleKind, TEXEL, type ParticleSet } from '../particles';

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
    missing: forces.filter((f) => !f.potential).map((f) => f.definition.name),
    meanSpeed: dynamic ? speedSum / dynamic : 0,
    maxSpeed,
    temperature: dynamic ? kinetic / dynamic / (mode2D ? 1 : 1.5) : 0,
  };
}

/** Float64 mirror of the GPU potential pass: Σ_j V(r_ij) per particle. */
export function referencePotentials(set: ParticleSet, forces: readonly CompiledForce[], time: number): Float32Array {
  const { position: pos, velocity: vel, attributes: attr, color } = set;
  const result = new Float32Array(set.count);
  for (let i = 0; i < set.count; i++) {
    const oi = i * TEXEL;
    let sum = 0;
    for (let j = 0; j < set.count; j++) {
      if (j === i) continue;
      const oj = j * TEXEL;
      const r2 = (pos[oi]! - pos[oj]!) ** 2 + (pos[oi + 1]! - pos[oj + 1]!) ** 2 + (pos[oi + 2]! - pos[oj + 2]!) ** 2;
      if (r2 === 0) continue;
      const dist = Math.sqrt(r2);
      const pair: Omit<PairScope, 'r'> = {
        m_i: attr[oi]!, m_j: attr[oj]!, q_i: attr[oi + 1]!, q_j: attr[oj + 1]!,
        s_i: attr[oi + 2]!, s_j: attr[oj + 2]!, p_i: attr[oi + 3]!, p_j: attr[oj + 3]!,
        n_i: color[oi + 3]!, n_j: color[oj + 3]!,
        cr_i: color[oi]!, cg_i: color[oi + 1]!, cb_i: color[oi + 2]!,
        cr_j: color[oj]!, cg_j: color[oj + 1]!, cb_j: color[oj + 2]!,
        t_i: vel[oi + 3]!, t_j: vel[oj + 3]!, time,
      };
      for (const f of forces) {
        if (!f.evaluatePotential) continue;
        if (f.definition.range === 'short' && !(dist < f.definition.cutoff)) continue;
        sum += f.evaluatePotential(forceScope(f, { ...pair, r: Math.sqrt(r2 + f.definition.softening ** 2) }));
      }
    }
    result[i] = sum;
  }
  return result;
}
