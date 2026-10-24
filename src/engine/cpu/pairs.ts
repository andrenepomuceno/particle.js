import { acts, pairVariables, setForceVariables, type CompiledForce, type PairScope } from '../forces/compile';
import type { FieldProbe } from '../field';
import { TEXEL, type ParticleSet, type Vec3 } from '../particles';

type Pair = Omit<PairScope, 'r'>;
type Probe = FieldProbe & { position: Vec3 };

// These run N² times per step in the CPU references, so they read the typed arrays directly
// instead of building intermediate objects.

/** Variables of the pair (i receives, j exerts) except r, read from the ParticleSet layout. */
export function pairScope(set: ParticleSet, i: number, j: number, time: number): Pair {
  const { position: x, velocity: v, attributes: a, color: c, spin: s } = set;
  const oi = i * TEXEL;
  const oj = j * TEXEL;
  const dx = x[oi]! - x[oj]!;
  const dy = x[oi + 1]! - x[oj + 1]!;
  const dz = x[oi + 2]! - x[oj + 2]!;
  const length = Math.hypot(dx, dy, dz) || 1;
  return {
    m_i: a[oi]!, m_j: a[oj]!, q_i: a[oi + 1]!, q_j: a[oj + 1]!, q2_i: a[oi + 2]!, q2_j: a[oj + 2]!,
    p_i: a[oi + 3]!, p_j: a[oj + 3]!, n_i: c[oi + 3]!, n_j: c[oj + 3]!,
    sx_i: s[oi]!, sy_i: s[oi + 1]!, sz_i: s[oi + 2]!, sx_j: s[oj]!, sy_j: s[oj + 1]!, sz_j: s[oj + 2]!,
    i3_i: s[oi + 3]!, i3_j: s[oj + 3]!,
    ux: dx / length, uy: dy / length, uz: dz / length,
    cr_i: c[oi]!, cg_i: c[oi + 1]!, cb_i: c[oi + 2]!, cr_j: c[oj]!, cg_j: c[oj + 1]!, cb_j: c[oj + 2]!,
    t_i: v[oi + 3]!, t_j: v[oj + 3]!, time,
  };
}

/** Same as pairScope with the field's test particle (clock 0) at `probe.position` receiving the force from j. */
export function probeScope(probe: Probe, set: ParticleSet, j: number, time: number): Pair {
  const { position: x, velocity: v, attributes: a, color: c, spin: s } = set;
  const oj = j * TEXEL;
  const dx = probe.position[0] - x[oj]!;
  const dy = probe.position[1] - x[oj + 1]!;
  const dz = probe.position[2] - x[oj + 2]!;
  const length = Math.hypot(dx, dy, dz) || 1;
  return {
    m_i: probe.mass, m_j: a[oj]!, q_i: probe.charge, q_j: a[oj + 1]!, q2_i: probe.charge2, q2_j: a[oj + 2]!,
    p_i: probe.parity, p_j: a[oj + 3]!, n_i: probe.nuclearCharge, n_j: c[oj + 3]!,
    sx_i: probe.spin[0], sy_i: probe.spin[1], sz_i: probe.spin[2], sx_j: s[oj]!, sy_j: s[oj + 1]!, sz_j: s[oj + 2]!,
    i3_i: probe.isospin, i3_j: s[oj + 3]!,
    ux: dx / length, uy: dy / length, uz: dz / length,
    cr_i: probe.color[0], cg_i: probe.color[1], cb_i: probe.color[2], cr_j: c[oj]!, cg_j: c[oj + 1]!, cb_j: c[oj + 2]!,
    t_i: 0, t_j: v[oj + 3]!, time,
  };
}

/**
 * Σ over `forces` of the force on i at true distance `dist` along the pair's unit vector (ux, uy, uz):
 * central forces as magnitude·û, vector potentials as −∇V. Added into `out`.
 */
export function addPairForce(forces: readonly CompiledForce[], pair: Pair, dist: number, out: [number, number, number]): void {
  const scope = pairVariables(pair);
  let magnitude = 0;
  for (const f of forces) {
    if (!acts(f, dist)) continue;
    setForceVariables(scope, f, dist);
    if (f.evaluateVector) {
      const [x, y, z] = f.evaluateVector(scope);
      out[0] += x;
      out[1] += y;
      out[2] += z;
    } else {
      magnitude += f.evaluate(scope);
    }
  }
  out[0] += magnitude * pair.ux;
  out[1] += magnitude * pair.uy;
  out[2] += magnitude * pair.uz;
}

/** Σ over the potential-mode `forces` of V for the pair at true distance `dist`. */
export function pairPotential(forces: readonly CompiledForce[], pair: Pair, dist: number): number {
  const scope = pairVariables(pair);
  let sum = 0;
  for (const f of forces) if (f.evaluatePotential && acts(f, dist)) sum += f.evaluatePotential(setForceVariables(scope, f, dist));
  return sum;
}
