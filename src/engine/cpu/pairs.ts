import { forceScope, type CompiledForce, type PairScope } from '../forces/compile';
import type { FieldProbe } from '../field';
import { TEXEL, type ParticleSet } from '../particles';

type Pair = Omit<PairScope, 'r'>;
type Side = [m: number, q: number, s: number, p: number, n: number, cr: number, cg: number, cb: number, t: number];

function particleSide(set: ParticleSet, k: number): Side {
  const o = k * TEXEL;
  const { velocity: vel, attributes: attr, color } = set;
  return [attr[o]!, attr[o + 1]!, attr[o + 2]!, attr[o + 3]!, color[o + 3]!, color[o]!, color[o + 1]!, color[o + 2]!, vel[o + 3]!];
}

function combine([m_i, q_i, s_i, p_i, n_i, cr_i, cg_i, cb_i, t_i]: Side, [m_j, q_j, s_j, p_j, n_j, cr_j, cg_j, cb_j, t_j]: Side, time: number): Pair {
  return { m_i, m_j, q_i, q_j, s_i, s_j, p_i, p_j, n_i, n_j, cr_i, cg_i, cb_i, cr_j, cg_j, cb_j, t_i, t_j, time };
}

/** Variables of the pair (i receives, j exerts) except r, read from the ParticleSet layout. */
export function pairScope(set: ParticleSet, i: number, j: number, time: number): Pair {
  return combine(particleSide(set, i), particleSide(set, j), time);
}

/** Same as pairScope with the field's test particle (clock 0) receiving the force from particle j. */
export function probeScope(probe: FieldProbe, set: ParticleSet, j: number, time: number): Pair {
  const { mass, charge, spin, parity, nuclearCharge, color } = probe;
  return combine([mass, charge, spin, parity, nuclearCharge, color[0], color[1], color[2], 0], particleSide(set, j), time);
}

/**
 * One force's contribution at true distance `dist`, with the same cutoff and softening rules
 * as the shaders: `fn` is the compiled F(r) or V(r).
 */
export function pairTerm(
  force: CompiledForce, fn: (scope: Record<string, number>) => number, pair: Pair, r2: number, dist: number,
): number {
  if (force.definition.range === 'short' && !(dist < force.definition.cutoff)) return 0;
  return fn(forceScope(force, { ...pair, r: Math.sqrt(r2 + force.definition.softening ** 2) }));
}
