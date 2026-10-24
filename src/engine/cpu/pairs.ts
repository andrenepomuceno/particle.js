import { forceScope, type CompiledForce, type PairScope } from '../forces/compile';
import { TEXEL, type ParticleSet } from '../particles';

/** Variables of the pair (i receives, j exerts) except r, read from the ParticleSet layout. */
export function pairScope(set: ParticleSet, i: number, j: number, time: number): Omit<PairScope, 'r'> {
  const { velocity: vel, attributes: attr, color } = set;
  const oi = i * TEXEL;
  const oj = j * TEXEL;
  return {
    m_i: attr[oi]!, m_j: attr[oj]!,
    q_i: attr[oi + 1]!, q_j: attr[oj + 1]!,
    s_i: attr[oi + 2]!, s_j: attr[oj + 2]!,
    p_i: attr[oi + 3]!, p_j: attr[oj + 3]!,
    n_i: color[oi + 3]!, n_j: color[oj + 3]!,
    cr_i: color[oi]!, cg_i: color[oi + 1]!, cb_i: color[oi + 2]!,
    cr_j: color[oj]!, cg_j: color[oj + 1]!, cb_j: color[oj + 2]!,
    t_i: vel[oi + 3]!, t_j: vel[oj + 3]!,
    time,
  };
}

/**
 * One force's contribution at true distance `dist`, with the same cutoff and softening rules
 * as the shaders: `fn` is the compiled F(r) or V(r).
 */
export function pairTerm(
  force: CompiledForce, fn: (scope: Record<string, number>) => number, pair: Omit<PairScope, 'r'>, r2: number, dist: number,
): number {
  if (force.definition.range === 'short' && !(dist < force.definition.cutoff)) return 0;
  return fn(forceScope(force, { ...pair, r: Math.sqrt(r2 + force.definition.softening ** 2) }));
}
