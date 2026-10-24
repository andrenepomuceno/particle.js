export interface PairVariable {
  name: string;
  description: string;
  glsl: string;
  shortRangeOnly?: boolean;
  /** Depends on the pair's direction, so it has no place in a V(r) differentiated along r only. */
  directional?: boolean;
}

const perParticle = (
  base: string,
  label: string,
  glslOf: (side: 1 | 2) => string,
): PairVariable[] => [
  { name: `${base}_i`, description: `${label} of the particle receiving the force`, glsl: glslOf(1) },
  { name: `${base}_j`, description: `${label} of the particle exerting the force`, glsl: glslOf(2) },
];

export const PAIR_VARIABLES: readonly PairVariable[] = [
  { name: 'r', description: 'distance between the pair (softened)', glsl: 'r' },
  { name: 'x', description: 'r / cutoff, normalized distance', glsl: '(r / CUTOFF)', shortRangeOnly: true },
  { name: 'cutoff', description: 'interaction range of this force', glsl: 'CUTOFF', shortRangeOnly: true },
  ...perParticle('m', 'mass', (k) => `attr${k}.x`),
  ...perParticle('q', 'charge, first component (electric charge)', (k) => `attr${k}.y`),
  ...perParticle('q2', 'charge, second component', (k) => `attr${k}.z`),
  { name: 'q_dot', description: '2D charge product q_i·q_j = q_i q_j + q2_i q2_j', glsl: 'dot(attr1.yz, attr2.yz)' },
  ...perParticle('sx', 'spin vector, x', (k) => `spin${k}.x`),
  ...perParticle('sy', 'spin vector, y', (k) => `spin${k}.y`),
  ...perParticle('sz', 'spin vector, z', (k) => `spin${k}.z`),
  ...perParticle('i3', 'isospin projection I3', (k) => `spin${k}.w`),
  { name: 's_dot', description: 'spin alignment s_i·s_j', glsl: 'dot(spin1.xyz, spin2.xyz)' },
  { name: 'si_r', description: 's_i·r̂, r̂ pointing from j to i (force mode only)', glsl: 'dot(spin1.xyz, dir)', directional: true },
  { name: 'sj_r', description: 's_j·r̂, r̂ pointing from j to i (force mode only)', glsl: 'dot(spin2.xyz, dir)', directional: true },
  ...perParticle('p', 'parity', (k) => `attr${k}.w`),
  ...perParticle('n', 'nuclear charge', (k) => `color${k}.w`),
  ...perParticle('cr', 'red color charge', (k) => `color${k}.x`),
  ...perParticle('cg', 'green color charge', (k) => `color${k}.y`),
  ...perParticle('cb', 'blue color charge', (k) => `color${k}.z`),
  ...perParticle('cx', 'color vector, x in the 120° weight plane', (k) => `colorPlane(color${k}).x`),
  ...perParticle('cy', 'color vector, y in the 120° weight plane', (k) => `colorPlane(color${k}).y`),
  { name: 'c_dot', description: 'color factor C_i·C_j: same +1, different −½, anticolor −1', glsl: 'colorDot(color1, color2)' },
  ...perParticle('t', 'particle clock (age)', (k) => `tau${k}`),
  { name: 'time', description: 'global simulation time', glsl: 'uTime' },
];

export const PAIR_VARIABLE_NAMES = new Set(PAIR_VARIABLES.map((v) => v.name));
