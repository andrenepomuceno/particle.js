import type { FieldProbe } from '../field';
import { acts, forceScope, type CompiledForce, type PairScope } from './compile';
import type { ForceRange } from './types';

type Pair = Omit<PairScope, 'r'>;

/** The plotted pair's particles (same attributes as the field's test particle); r̂ runs along x from j to i. */
export interface PlotParticles {
  i: FieldProbe;
  j: FieldProbe;
}

export const DEFAULT_PLOT_PARTICLES: PlotParticles = {
  i: { mass: 1, charge: 1, charge2: 0, spin: [0, 0, 0.5], isospin: 0.5, parity: 1, nuclearCharge: 1, color: [1, 0, 0] },
  j: { mass: 1, charge: 1, charge2: 0, spin: [0, 0, 0.5], isospin: 0.5, parity: 1, nuclearCharge: 1, color: [-1, 0, 0] },
};

export function plotPair({ i, j }: PlotParticles): Pair {
  return {
    m_i: i.mass, m_j: j.mass, q_i: i.charge, q_j: j.charge, q2_i: i.charge2, q2_j: j.charge2, i3_i: i.isospin, i3_j: j.isospin,
    sx_i: i.spin[0], sy_i: i.spin[1], sz_i: i.spin[2], sx_j: j.spin[0], sy_j: j.spin[1], sz_j: j.spin[2],
    ux: 1, uy: 0, uz: 0, p_i: i.parity, p_j: j.parity, n_i: i.nuclearCharge, n_j: j.nuclearCharge,
    cr_i: i.color[0], cg_i: i.color[1], cb_i: i.color[2], cr_j: j.color[0], cg_j: j.color[1], cb_j: j.color[2],
    t_i: 0, t_j: 0, time: 0,
    vx_i: 0, vy_i: 0, vz_i: 0, vx_j: 0, vy_j: 0, vz_j: 0,
  };
}

/** The pair the per-force plots use (documented in their caption). */
export const PLOT_PAIR: Pair = plotPair(DEFAULT_PLOT_PARTICLES);

/** What the integrator applies at true distance d: softening, then the hard cutoff (radial part for vector forces). */
export function appliedForce(force: CompiledForce, distance: number, pair: Pair = PLOT_PAIR): number {
  return acts(force, distance) ? force.evaluate(forceScope(force, pair, distance)) : 0;
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
  /** Force-mode forces, whose V was integrated from the applied F (zero at the right edge). */
  integrated: string[];
}

export interface ResultantOptions {
  pair?: Pair;
  /** Right edge of the plot; default the largest plotDistance of the range's forces. */
  maxDistance?: number;
  samples?: number;
}

/**
 * Σ V(d) of the forces of one range for the pair (default PLOT_PAIR), as the integrator sees them:
 * the potential whose −dV/dd is the applied force. Potential-mode forces contribute V(r_soft(d))
 * exactly (their force is its d-gradient; a short-range one jumps to 0 at its cutoff). Force-mode
 * ones have no closed-form V and are integrated from the applied F, with V = 0 at the right edge.
 * Undefined when no force of that range is given.
 */
export function resultantPotential(forces: readonly CompiledForce[], range: ForceRange, options: ResultantOptions = {}): PotentialCurve | undefined {
  const { pair = PLOT_PAIR, samples = 240 } = options;
  const own = forces.filter((f) => f.definition.range === range);
  if (own.length === 0) return undefined;
  const maxDistance = options.maxDistance ?? Math.max(...own.map(plotDistance));
  if (!(maxDistance > 0)) throw new Error(`plot distance must be > 0, got ${maxDistance}`);
  const ds = Array.from({ length: samples }, (_, k) => (maxDistance * (k + 1)) / samples);
  const v = new Float64Array(samples);
  for (const force of own) {
    if (force.evaluatePotential) {
      ds.forEach((d, k) => {
        if (acts(force, d)) v[k] = v[k]! + force.evaluatePotential!(forceScope(force, pair, d));
      });
      continue;
    }
    // Trapezoids from the right edge inwards: V(d_k) = V(d_{k+1}) + ∫_{d_k}^{d_{k+1}} F.
    const f = ds.map((d) => appliedForce(force, d, pair));
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
