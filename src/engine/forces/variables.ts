export interface PairVariable {
  name: string;
  description: string;
  glsl: string;
  shortRangeOnly?: boolean;
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
  ...perParticle('q', 'electric charge', (k) => `attr${k}.y`),
  ...perParticle('s', 'spin', (k) => `attr${k}.z`),
  ...perParticle('p', 'parity', (k) => `attr${k}.w`),
  ...perParticle('cr', 'red color charge', (k) => `color${k}.x`),
  ...perParticle('cg', 'green color charge', (k) => `color${k}.y`),
  ...perParticle('cb', 'blue color charge', (k) => `color${k}.z`),
  { name: 'c_dot', description: 'dot product of the color charges', glsl: 'dot(color1.xyz, color2.xyz)' },
  ...perParticle('t', 'particle clock (age)', (k) => `tau${k}`),
  { name: 'time', description: 'global simulation time', glsl: 'uTime' },
];

export const PAIR_VARIABLE_NAMES = new Set(PAIR_VARIABLES.map((v) => v.name));
