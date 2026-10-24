import { forceScope, type CompiledForce, type PairScope } from '../forces/compile';
import type { FieldProbe } from '../field';
import { TEXEL, type ParticleSet, type Vec3 } from '../particles';

type Pair = Omit<PairScope, 'r'>;
interface Side { m: number; q: number; q2: number; i3: number; spin: Vec3; p: number; n: number; color: Vec3; t: number; position: Vec3 }

function particleSide(set: ParticleSet, k: number): Side {
  const o = k * TEXEL;
  const { position: pos, velocity: vel, attributes: attr, color, spin } = set;
  return {
    m: attr[o]!, q: attr[o + 1]!, q2: attr[o + 2]!, i3: spin[o + 3]!, p: attr[o + 3]!, n: color[o + 3]!, t: vel[o + 3]!,
    spin: [spin[o]!, spin[o + 1]!, spin[o + 2]!],
    color: [color[o]!, color[o + 1]!, color[o + 2]!],
    position: [pos[o]!, pos[o + 1]!, pos[o + 2]!],
  };
}

function combine(i: Side, j: Side, time: number): Pair {
  const d = [i.position[0] - j.position[0], i.position[1] - j.position[1], i.position[2] - j.position[2]];
  const length = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
  return {
    m_i: i.m, m_j: j.m, q_i: i.q, q_j: j.q, q2_i: i.q2, q2_j: j.q2, i3_i: i.i3, i3_j: j.i3, p_i: i.p, p_j: j.p, n_i: i.n, n_j: j.n,
    sx_i: i.spin[0], sy_i: i.spin[1], sz_i: i.spin[2], sx_j: j.spin[0], sy_j: j.spin[1], sz_j: j.spin[2],
    ux: d[0]! / length, uy: d[1]! / length, uz: d[2]! / length,
    cr_i: i.color[0], cg_i: i.color[1], cb_i: i.color[2], cr_j: j.color[0], cg_j: j.color[1], cb_j: j.color[2],
    t_i: i.t, t_j: j.t, time,
  };
}

/** Variables of the pair (i receives, j exerts) except r, read from the ParticleSet layout. */
export function pairScope(set: ParticleSet, i: number, j: number, time: number): Pair {
  return combine(particleSide(set, i), particleSide(set, j), time);
}

/** Same as pairScope with the field's test particle (clock 0) at `position` receiving the force from j. */
export function probeScope(probe: FieldProbe, position: Vec3, set: ParticleSet, j: number, time: number): Pair {
  const { mass, charge, charge2, spin, isospin, parity, nuclearCharge, color } = probe;
  return combine({ m: mass, q: charge, q2: charge2, i3: isospin, spin, p: parity, n: nuclearCharge, color, t: 0, position }, particleSide(set, j), time);
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
