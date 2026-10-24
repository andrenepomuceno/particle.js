import { GLSL_COLOR_HELPERS } from '../colorCharge';
import { GLSL_POWER_HELPERS } from '../expr/glsl';
import { collectVariables, type Expr } from '../expr/ast';
import { forceToGlsl, forceUniformName, type CompiledForce } from '../forces/compile';

export const BOUNDARY_CODE = { none: 0, sphere: 1, box: 2 } as const;

const COMMON_UNIFORMS = /* glsl */ `
uniform sampler2D uAttributes;
uniform sampler2D uColor;
uniform sampler2D uSpin;
uniform int uCount;
uniform float uTimeStep;
uniform float uTime;
uniform float uFriction;
uniform float uMaxSpeed;
uniform int uBoundary;
uniform float uBoundarySize;
uniform float uRestitution;
uniform bool uMode2D;
uniform sampler2D uAcceleration;
uniform sampler2D uAccelerationNext;
uniform float uClockShift;

#define KIND_FIXED 2.0
`;

function forceUniforms(force: CompiledForce, index: number): string {
  return ['cutoff', 'soft2', ...force.definition.params.map((p) => p.name)]
    .map((name) => `uniform float ${forceUniformName(index, name)};`)
    .join('\n');
}

const PAIR_ARGS = 'float r, vec4 attr1, vec4 attr2, vec4 color1, vec4 color2, vec4 spin1, vec4 spin2, vec3 dir, float tau1, float tau2';
const PAIR_CALL_ARGS = 'attr1, attr2, color1, color2, spin1, spin2, dir, tau1, tau2';
const SPIN_J_VARIABLES = ['sx_j', 'sy_j', 'sz_j', 's_dot', 'sj_r', 'i3_j'];

/** The other particle's spin is fetched only when an expression reads it, like its clock. */
const readsSpinJ = (exprs: Expr[]) => exprs.some((e) => SPIN_J_VARIABLES.some((v) => collectVariables(e).has(v)));

function forceFunction(force: CompiledForce, index: number): string {
  return `${forceUniforms(force, index)}
float force${index}(${PAIR_ARGS}) {
  return ${forceToGlsl(force, index)};
}`;
}

function forceAccumulation(force: CompiledForce, index: number): string {
  const call = `force${index}(sqrt(r2 + ${forceUniformName(index, 'soft2')}), ${PAIR_CALL_ARGS})`;
  if (force.definition.range === 'short') {
    return `if (dist < ${forceUniformName(index, 'cutoff')}) magnitude += ${call};`;
  }
  return `magnitude += ${call};`;
}

const VELOCITY_HELPERS = /* glsl */ `
// Friction, 2D projection, speed clamp, then reflection if the coming drift would leave the
// boundary. The drift is predicted with the acceleration it will use (zero for Euler).
vec3 finishVelocity(vec3 vel, vec3 pos, vec3 acceleration) {
  if (uFriction > 0.0) vel *= exp(-uFriction * uTimeStep);
  if (uMode2D) vel.z = 0.0;
  float speed = length(vel);
  if (uMaxSpeed > 0.0 && speed > uMaxSpeed) vel *= uMaxSpeed / speed;
  vec3 next = pos + uTimeStep * vel + 0.5 * uTimeStep * uTimeStep * acceleration;
  if (uBoundary == ${BOUNDARY_CODE.sphere}) {
    float len = length(next);
    if (len > uBoundarySize) {
      vec3 normal = next / len;
      float outward = dot(vel, normal);
      if (outward > 0.0) vel -= (1.0 + uRestitution) * outward * normal;
    }
  } else if (uBoundary == ${BOUNDARY_CODE.box}) {
    for (int axis = 0; axis < 3; axis++) {
      if (abs(next[axis]) > uBoundarySize && next[axis] * vel[axis] > 0.0) vel[axis] = -uRestitution * vel[axis];
    }
  }
  return vel;
}
`;

const POSITION_HELPERS = /* glsl */ `
// The speed clamp bounds the step length too, so Verlet's ½·a·dt² cannot overshoot it.
vec3 limitDisplacement(vec3 displacement) {
  float limit = uMaxSpeed * uTimeStep;
  float length2 = dot(displacement, displacement);
  if (uMaxSpeed > 0.0 && length2 > limit * limit) displacement *= limit / sqrt(length2);
  return displacement;
}

vec3 confinePosition(vec3 pos) {
  if (uMode2D) pos.z = 0.0;
  if (uBoundary == ${BOUNDARY_CODE.sphere}) {
    float len = length(pos);
    if (len > uBoundarySize) pos *= uBoundarySize / len;
  } else if (uBoundary == ${BOUNDARY_CODE.box}) {
    pos = clamp(pos, vec3(-uBoundarySize), vec3(uBoundarySize));
  }
  return pos;
}
`;

/**
 * Σ_j F_ij on particle index1. Clocks are read from textureVelocity and shifted by uClockShift,
 * because Verlet evaluates forces after positions advanced but before clocks are written.
 */
function totalForceFunction(forces: readonly CompiledForce[]): string {
  const needsTau2 = forces.some((f) => collectVariables(f.magnitude).has('t_j'));
  const fetchTau2 = needsTau2 ? 'texelFetch(textureVelocity, coord2, 0).w + uClockShift' : '0.0';
  const fetchSpin2 = readsSpinJ(forces.map((f) => f.magnitude)) ? 'texelFetch(uSpin, coord2, 0)' : 'vec4(0.0)';
  return `${GLSL_POWER_HELPERS}
${GLSL_COLOR_HELPERS}
${forces.map(forceFunction).join('\n')}

vec3 totalForce(int index1, vec3 pos1, vec4 attr1, vec4 color1, vec4 spin1, float tau1) {
  int width = TEXTURE_WIDTH;
  vec3 force = vec3(0.0);
  for (int index2 = 0; index2 < uCount; index2++) {
    if (index2 == index1) continue;
    ivec2 coord2 = ivec2(index2 % width, index2 / width);
    vec3 delta = pos1 - texelFetch(texturePosition, coord2, 0).xyz;
    float r2 = dot(delta, delta);
    if (r2 == 0.0) continue;
    float dist = sqrt(r2);
    vec4 attr2 = texelFetch(uAttributes, coord2, 0);
    vec4 color2 = texelFetch(uColor, coord2, 0);
    float tau2 = ${fetchTau2};
    vec4 spin2 = ${fetchSpin2};
    vec3 dir = delta / dist;
    float magnitude = 0.0;
    ${forces.map(forceAccumulation).join('\n    ')}
    force += magnitude * dir;
  }
  return force;
}`;
}

const PARTICLE_HEADER = /* glsl */ `
  ivec2 coord1 = ivec2(gl_FragCoord.xy);
  int index1 = coord1.y * TEXTURE_WIDTH + coord1.x;
  vec4 positionTexel = texelFetch(texturePosition, coord1, 0);
  vec4 velocityTexel = texelFetch(textureVelocity, coord1, 0);
  bool inactive = index1 >= uCount;
  bool fixedParticle = positionTexel.w == KIND_FIXED;
`;

/** Semi-implicit Euler, velocity half: v += F/m·dt, using positions x_n. */
export function generateVelocityShader(forces: readonly CompiledForce[]): string {
  return `${COMMON_UNIFORMS}
${VELOCITY_HELPERS}
${totalForceFunction(forces)}

void main() {
${PARTICLE_HEADER}
  if (inactive) {
    gl_FragColor = velocityTexel;
    return;
  }
  float tau1 = velocityTexel.w;
  if (fixedParticle) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, tau1 + uTimeStep);
    return;
  }
  vec4 attr1 = texelFetch(uAttributes, coord1, 0);
  vec3 force = totalForce(index1, positionTexel.xyz, attr1, texelFetch(uColor, coord1, 0), texelFetch(uSpin, coord1, 0), tau1);
  vec3 vel = velocityTexel.xyz + uTimeStep * force / attr1.x;
  gl_FragColor = vec4(finishVelocity(vel, positionTexel.xyz, vec3(0.0)), tau1 + uTimeStep);
}
`;
}

/** Velocity Verlet, force half: a(x) = F(x)/m at the current positions, clocks shifted by uClockShift. */
export function generateAccelerationShader(forces: readonly CompiledForce[]): string {
  return `${COMMON_UNIFORMS}
${totalForceFunction(forces)}

void main() {
${PARTICLE_HEADER}
  if (inactive || fixedParticle) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec4 attr1 = texelFetch(uAttributes, coord1, 0);
  vec3 force = totalForce(index1, positionTexel.xyz, attr1, texelFetch(uColor, coord1, 0), texelFetch(uSpin, coord1, 0), velocityTexel.w + uClockShift);
  vec3 acceleration = force / attr1.x;
  if (uMode2D) acceleration.z = 0.0;
  gl_FragColor = vec4(acceleration, 0.0);
}
`;
}

/** Velocity Verlet, drift: x' = x + v·dt + ½·a·dt². */
export const VERLET_POSITION_SHADER = `${COMMON_UNIFORMS}
${POSITION_HELPERS}
void main() {
${PARTICLE_HEADER}
  if (inactive || fixedParticle) {
    gl_FragColor = positionTexel;
    return;
  }
  vec3 acceleration = texelFetch(uAcceleration, coord1, 0).xyz;
  vec3 displacement = uTimeStep * velocityTexel.xyz + 0.5 * uTimeStep * uTimeStep * acceleration;
  gl_FragColor = vec4(confinePosition(positionTexel.xyz + limitDisplacement(displacement)), positionTexel.w);
}
`;

/** Velocity Verlet, kick: v' = v + ½(a + a')·dt, with texturePosition already at x'. */
export const VERLET_VELOCITY_SHADER = `${COMMON_UNIFORMS}
${VELOCITY_HELPERS}
void main() {
${PARTICLE_HEADER}
  if (inactive) {
    gl_FragColor = velocityTexel;
    return;
  }
  float tau1 = velocityTexel.w;
  if (fixedParticle) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, tau1 + uTimeStep);
    return;
  }
  vec3 accelerationNext = texelFetch(uAccelerationNext, coord1, 0).xyz;
  vec3 vel = velocityTexel.xyz + 0.5 * uTimeStep * (texelFetch(uAcceleration, coord1, 0).xyz + accelerationNext);
  gl_FragColor = vec4(finishVelocity(vel, positionTexel.xyz, accelerationNext), tau1 + uTimeStep);
}
`;

function potentialTerm(force: CompiledForce, index: number): string {
  if (!force.potential) return '';
  const call = `potential${index}(sqrt(r2 + ${forceUniformName(index, 'soft2')}), ${PAIR_CALL_ARGS})`;
  return force.definition.range === 'short'
    ? `if (dist < ${forceUniformName(index, 'cutoff')}) energy += ${call};`
    : `energy += ${call};`;
}

/**
 * Per-particle potential energy Σ_j V(r_ij) for the potential-mode forces, written to .x.
 * Run on demand for the stats dialog; the total energy is half the sum over particles.
 */
export function generatePotentialShader(forces: readonly CompiledForce[]): string {
  const needsTau2 = forces.some((f) => f.potential && collectVariables(f.potential).has('t_j'));
  const fetchSpin2 = readsSpinJ(forces.flatMap((f) => (f.potential ? [f.potential] : []))) ? 'texelFetch(uSpin, coord2, 0)' : 'vec4(0.0)';
  return `${COMMON_UNIFORMS}
${GLSL_POWER_HELPERS}
${GLSL_COLOR_HELPERS}
${forces.map((force, index) => `${forceUniforms(force, index)}${force.potential ? `
float potential${index}(${PAIR_ARGS}) {
  return ${forceToGlsl(force, index, force.potential)};
}` : ''}`).join('\n')}

void main() {
  ivec2 coord1 = ivec2(gl_FragCoord.xy);
  int width = TEXTURE_WIDTH;
  int index1 = coord1.y * width + coord1.x;
  if (index1 >= uCount) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 pos1 = texelFetch(texturePosition, coord1, 0).xyz;
  float tau1 = texelFetch(textureVelocity, coord1, 0).w;
  vec4 attr1 = texelFetch(uAttributes, coord1, 0);
  vec4 color1 = texelFetch(uColor, coord1, 0);
  vec4 spin1 = texelFetch(uSpin, coord1, 0);
  float energy = 0.0;
  for (int index2 = 0; index2 < uCount; index2++) {
    if (index2 == index1) continue;
    ivec2 coord2 = ivec2(index2 % width, index2 / width);
    vec3 delta = pos1 - texelFetch(texturePosition, coord2, 0).xyz;
    float r2 = dot(delta, delta);
    if (r2 == 0.0) continue;
    float dist = sqrt(r2);
    vec4 attr2 = texelFetch(uAttributes, coord2, 0);
    vec4 color2 = texelFetch(uColor, coord2, 0);
    float tau2 = ${needsTau2 ? 'texelFetch(textureVelocity, coord2, 0).w' : '0.0'};
    vec4 spin2 = ${fetchSpin2};
    vec3 dir = delta / dist;
    ${forces.map(potentialTerm).filter(Boolean).join('\n    ')}
  }
  gl_FragColor = vec4(energy, 0.0, 0.0, 0.0);
}
`;
}

/**
 * Field probes: the net force on a test particle (uniform attributes, clock 0) at each probe
 * position, written as (F, |F|). Calls the same generated totalForce with index1 = -1, so it
 * matches no real particle; probes never enter the particle textures.
 */
export function generateFieldShader(forces: readonly CompiledForce[]): string {
  return `${COMMON_UNIFORMS}
uniform sampler2D uProbePositions;
uniform int uProbeWidth;
uniform int uProbeCount;
uniform vec4 uProbeAttributes;
uniform vec4 uProbeColor;
uniform vec4 uProbeSpin;
${totalForceFunction(forces)}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  if (coord.y * uProbeWidth + coord.x >= uProbeCount) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 pos = texelFetch(uProbePositions, coord, 0).xyz;
  vec3 force = totalForce(-1, pos, uProbeAttributes, uProbeColor, uProbeSpin, 0.0);
  gl_FragColor = vec4(force, length(force));
}
`;
}

/** Semi-implicit Euler, drift: x += v'·dt with the already-updated velocity. */
export const POSITION_SHADER = `${COMMON_UNIFORMS}
${POSITION_HELPERS}
void main() {
${PARTICLE_HEADER}
  if (inactive || fixedParticle) {
    gl_FragColor = positionTexel;
    return;
  }
  gl_FragColor = vec4(confinePosition(positionTexel.xyz + uTimeStep * velocityTexel.xyz), positionTexel.w);
}
`;
