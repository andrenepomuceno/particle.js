import { collectVariables } from '../expr/ast';
import { TEXEL, type ParticleSet } from '../particles';
import type { CompiledForce } from './compile';

interface Coupling {
  label: string;
  variables: readonly string[];
  isZero: (set: ParticleSet, index: number) => boolean;
}

const at = (array: Float32Array, index: number, lane: number) => array[index * TEXEL + lane]!;

const COUPLINGS: readonly Coupling[] = [
  { label: 'charge', variables: ['q_i', 'q_j'], isZero: (s, k) => at(s.attributes, k, 1) === 0 },
  { label: 'second charge component', variables: ['q2_i', 'q2_j'], isZero: (s, k) => at(s.attributes, k, 2) === 0 },
  {
    label: 'charge', variables: ['q_dot'],
    isZero: (s, k) => at(s.attributes, k, 1) === 0 && at(s.attributes, k, 2) === 0,
  },
  {
    label: 'spin', variables: ['sx_i', 'sx_j', 'sy_i', 'sy_j', 'sz_i', 'sz_j', 's_dot', 'si_r', 'sj_r'],
    isZero: (s, k) => at(s.spin, k, 0) === 0 && at(s.spin, k, 1) === 0 && at(s.spin, k, 2) === 0,
  },
  { label: 'isospin', variables: ['i3_i', 'i3_j'], isZero: (s, k) => at(s.spin, k, 3) === 0 },
  { label: 'parity', variables: ['p_i', 'p_j'], isZero: (s, k) => at(s.attributes, k, 3) === 0 },
  { label: 'nuclear charge', variables: ['n_i', 'n_j'], isZero: (s, k) => at(s.color, k, 3) === 0 },
  {
    label: 'color charge',
    variables: ['cr_i', 'cr_j', 'cg_i', 'cg_j', 'cb_i', 'cb_j', 'cx_i', 'cx_j', 'cy_i', 'cy_j', 'c_dot'],
    isZero: (s, k) => at(s.color, k, 0) === 0 && at(s.color, k, 1) === 0 && at(s.color, k, 2) === 0,
  },
];

/**
 * Names the particle attributes a force reads that are zero on every particle, so a force
 * that silently evaluates to nothing (e.g. the nuclear preset on particles without nuclear
 * charge) is reported instead of looking broken.
 */
export function inactiveCouplings(force: CompiledForce, set: ParticleSet): string[] {
  if (set.count === 0) return [];
  const used = collectVariables(force.magnitude);
  return COUPLINGS.filter((c) => c.variables.some((v) => used.has(v)))
    .filter((c) => Array.from({ length: set.count }, (_, k) => k).every((k) => c.isZero(set, k)))
    .map((c) => `reads ${c.label}, but every particle has ${c.label} 0, so the terms using it vanish`);
}
