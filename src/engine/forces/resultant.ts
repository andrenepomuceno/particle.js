import { acts, forceScope, type CompiledForce, type PairScope } from './compile';
import type { ForceRange } from './types';

/** The pair every plot evaluates forces for (documented in the plot captions). */
export const PLOT_PAIR: Omit<PairScope, 'r'> = {
  m_i: 1, m_j: 1, q_i: 1, q_j: 1, q2_i: 0, q2_j: 0, i3_i: 0.5, i3_j: 0.5,
  sx_i: 0, sy_i: 0, sz_i: 0.5, sx_j: 0, sy_j: 0, sz_j: 0.5, ux: 1, uy: 0, uz: 0, p_i: 1, p_j: 1, n_i: 1, n_j: 1,
  cr_i: 1, cg_i: 0, cb_i: 0, cr_j: -1, cg_j: 0, cb_j: 0, t_i: 0, t_j: 0, time: 0,
};

/** What the integrator applies at true distance d: softening, then the hard cutoff (radial part for vector forces). */
export function appliedForce(force: CompiledForce, distance: number): number {
  return acts(force, distance) ? force.evaluate(forceScope(force, PLOT_PAIR, distance)) : 0;
}

/** Plot domain of one force: a little past the cutoff, or 20 softenings (at least 100) for long range. */
export function plotDistance(force: CompiledForce): number {
  const { range, cutoff, softening } = force.definition;
  return range === 'short' ? cutoff * 1.2 : Math.max(softening * 20, 100);
}

export interface PotentialCurve {
  /** Sample distances, increasing, ending at `maxDistance`. */
  points: { d: number; v: number }[];
  maxDistance: number;
  /** Names of force-mode forces whose V was integrated from F (zero at maxDistance). */
  integrated: string[];
}

/**
 * Σ V(d) of the forces of one range for PLOT_PAIR, as the integrator sees them (hard cutoff, so a
 * short-range V jumps to 0 at its cutoff). Potential-mode forces contribute V exactly; force-mode
 * ones contribute ∫_d^D F with V(D) = 0 at the right edge D, since they have no closed-form V.
 * Undefined when no force of that range is given.
 */
export function resultantPotential(forces: readonly CompiledForce[], range: ForceRange, samples = 240): PotentialCurve | undefined {
  const own = forces.filter((f) => f.definition.range === range);
  if (own.length === 0) return undefined;
  const maxDistance = Math.max(...own.map(plotDistance));
  const ds = Array.from({ length: samples }, (_, k) => (maxDistance * (k + 1)) / samples);
  const v = new Float64Array(samples);
  for (const force of own) {
    if (force.evaluatePotential) {
      ds.forEach((d, k) => {
        if (acts(force, d)) v[k] = v[k]! + force.evaluatePotential!(forceScope(force, PLOT_PAIR, d));
      });
      continue;
    }
    // Trapezoids from the right edge inwards: V(d_k) = V(d_{k+1}) + ∫_{d_k}^{d_{k+1}} F.
    const f = ds.map((d) => appliedForce(force, d));
    let integral = 0;
    for (let k = samples - 2; k >= 0; k--) {
      integral += 0.5 * (f[k]! + f[k + 1]!) * (ds[k + 1]! - ds[k]!);
      v[k] = v[k]! + integral;
    }
  }
  return {
    points: ds.map((d, k) => ({ d, v: v[k]! })),
    maxDistance,
    integrated: own.filter((f) => !f.evaluatePotential).map((f) => f.definition.name),
  };
}
