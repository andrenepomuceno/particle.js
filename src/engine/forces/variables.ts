export interface PairVariable {
  name: string;
  description: string;
  glsl: string;
  shortRangeOnly?: boolean;
  /** Depends on the pair's direction: reading one makes a potential a vector potential (F = −∇V). */
  directional?: boolean;
  /** Depends on velocities: force mode only (F = −dV/dr needs a position-only V). */
  velocity?: boolean;
  /** A vector or a shorthand expanded by lowerVectors; it never reaches a backend (`glsl` unused). */
  lowered?: boolean;
  /** Random (hashed from the pair and the time, see noise.ts): force mode only; probes and plots use the mean. */
  random?: boolean;
  /** A component of a vector variable (randv's): bound for the backends, not written in expressions. */
  internal?: boolean;
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
  // Library variables of vector potentials (never bound in central GLSL; force mode rejects them).
  { name: 'dx', description: 'relative position x_i − x_j, x component (in a potential: F = −∇V)', glsl: 'delta.x', directional: true },
  { name: 'dy', description: 'relative position, y component', glsl: 'delta.y', directional: true },
  { name: 'dz', description: 'relative position, z component', glsl: 'delta.z', directional: true },
  { name: 'd', description: 'relative position vector x_i − x_j', glsl: '', directional: true, lowered: true },
  { name: 'rhat', description: 'unit vector d / |d|, from j to i', glsl: '', directional: true, lowered: true },
  ...perParticle('m', 'mass', (k) => `attr${k}.x`),
  ...perParticle('q', 'charge, first component (electric charge)', (k) => `attr${k}.y`),
  ...perParticle('q2', 'charge, second component', (k) => `attr${k}.z`),
  { name: 'q_dot', description: '2D charge product q_i·q_j = q_i q_j + q2_i q2_j', glsl: 'dot(attr1.yz, attr2.yz)' },
  ...perParticle('sx', 'spin vector, x', (k) => `spin${k}.x`),
  ...perParticle('sy', 'spin vector, y', (k) => `spin${k}.y`),
  ...perParticle('sz', 'spin vector, z', (k) => `spin${k}.z`),
  ...perParticle('i3', 'isospin projection I3', (k) => `spin${k}.w`),
  { name: 's_i', description: 'spin vector of the particle receiving the force', glsl: '', lowered: true },
  { name: 's_j', description: 'spin vector of the particle exerting the force', glsl: '', lowered: true },
  ...perParticle('vx', 'velocity, x', (k) => `vel${k}.x`).map((v) => ({ ...v, velocity: true })),
  ...perParticle('vy', 'velocity, y', (k) => `vel${k}.y`).map((v) => ({ ...v, velocity: true })),
  ...perParticle('vz', 'velocity, z', (k) => `vel${k}.z`).map((v) => ({ ...v, velocity: true })),
  { name: 'v_i', description: 'velocity vector of the particle receiving the force', glsl: '', velocity: true, lowered: true },
  { name: 'v_j', description: 'velocity vector of the particle exerting the force', glsl: '', velocity: true, lowered: true },
  { name: 'v_dot', description: '(v_i − v_j)·r̂: separation speed (negative while approaching)', glsl: '', velocity: true, lowered: true },
  { name: 'v_rel', description: '|v_i − v_j|, relative speed', glsl: '', velocity: true, lowered: true },
  { name: 'vv_dot', description: 'v_i·v_j (parallel currents attract magnetically)', glsl: '', velocity: true, lowered: true },
  { name: 's_dot', description: 'spin alignment s_i·s_j', glsl: 'dot(spin1.xyz, spin2.xyz)' },
  { name: 'si_r', description: 's_i·r̂, r̂ pointing from j to i (in a potential, F = −∇V follows its direction)', glsl: 'dot(spin1.xyz, dir)', directional: true },
  { name: 'sj_r', description: 's_j·r̂, r̂ pointing from j to i', glsl: 'dot(spin2.xyz, dir)', directional: true },
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
  { name: 'c_light', description: 'speed of light c (Spacetime dialog); it has its value under either metric', glsl: 'uLightSpeed' },
  { name: 'rand', description: 'uniform random number in [0, 1), the same for both particles of the pair (probes and plots: ½)', glsl: 'noise.x', random: true },
  { name: 'randn', description: 'standard normal random number, the same for both particles of the pair (probes and plots: 0)', glsl: 'noise.y', random: true },
  { name: 'a_j', description: 'acceleration of the particle exerting the force at the retarded time (a retarded force under Minkowski; otherwise 0)', glsl: '', lowered: true },
  { name: 'ax_j', description: 'a_j, x component', glsl: 'acc2.x' },
  { name: 'ay_j', description: 'a_j, y component', glsl: 'acc2.y' },
  { name: 'az_j', description: 'a_j, z component', glsl: 'acc2.z' },
  { name: 't_ret', description: 'light delay t − t_r of a retarded force: how long ago j emitted what i feels now (otherwise 0)', glsl: 'delay' },
  { name: 'randv', description: 'vector of three independent standard normals, the same for both particles of the pair (probes and plots: 0)', glsl: '', random: true, lowered: true },
  { name: 'randvx', description: 'randv, x component', glsl: 'noiseVec.x', random: true, internal: true },
  { name: 'randvy', description: 'randv, y component', glsl: 'noiseVec.y', random: true, internal: true },
  { name: 'randvz', description: 'randv, z component', glsl: 'noiseVec.z', random: true, internal: true },
];

export const PAIR_VARIABLE_NAMES = new Set(PAIR_VARIABLES.map((v) => v.name));
