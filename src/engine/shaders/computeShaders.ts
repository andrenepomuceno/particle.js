import { GLSL_COLOR_HELPERS } from '../colorCharge';
import { forceUniformName, type CompiledForce } from '../forces/compile';
import { PAIR_VARIABLES } from '../forces/variables';
import { HISTORY_SEARCH_STEPS } from '../cpu/history';
import { GLSL_METRIC } from '../metric';
import { GLSL_NOISE_HELPERS, MEAN_NOISE, NOISE_STREAMS, type PairNoise } from '../noise';
import { glslFloat } from '../glsl';

export const BOUNDARY_CODE = { none: 0, sphere: 1, box: 2 } as const;

const COMMON_UNIFORMS = /* glsl */ `
uniform sampler2D uAttributes;
uniform sampler2D uColor;
uniform sampler2D uSpin;
uniform int uCount;
uniform float uTimeStep;
uniform float uTime;
uniform float uFriction;
uniform float uQuadraticDrag;
uniform float uMaxSpeed;
uniform int uBoundary;
uniform float uBoundarySize;
uniform float uBoundaryDepth;
uniform float uRestitution;
uniform float uCollisionDistance;
uniform float uCollisionRestitution;
uniform bool uMode2D;
uniform sampler2D uAcceleration;
uniform sampler2D uAccelerationNext;
uniform float uClockShift;
uniform float uLightSpeed;
// Past states for retarded forces (see GpuCompute's history): a ring of uHistoryCount layers of positions
// and stored velocities, the newest at uHistoryHead, uHistoryFilled of them stored (older steps extrapolate
// the oldest stored one by uHistoryResetDt each). Times are offsets from a base, as is uHistoryNow (the
// evaluation time), so their difference keeps float32 resolution. uHistoryCount is 0 without a history.
uniform highp sampler2DArray uHistoryPosition;
uniform highp sampler2DArray uHistoryVelocity;
uniform highp sampler2D uHistoryTimes;
uniform int uHistoryHead;
uniform int uHistoryCount;
uniform int uHistoryFilled;
uniform float uHistoryResetDt;
uniform float uHistoryNow;

#define KIND_FIXED 2.0

// Box half-sizes: boundarySize in x and y, boundaryDepth (a slab) in z when set.
vec3 boxHalfSize() {
  return vec3(uBoundarySize, uBoundarySize, uBoundaryDepth > 0.0 ? uBoundaryDepth : uBoundarySize);
}
${GLSL_METRIC}
// Proper time dτ = dt/γ of one step for a particle moving with stored velocity u; dt when Galilean.
float properTimeStep(vec3 u) {
  return uTimeStep / lorentzFactor(u);
}

// x' − x of the coming drift from stored velocity u and acceleration a = F/m: v·dt + ½·a·dt² when
// Galilean; under Minkowski the same kick-drift-kick split moves with the half-kicked u, dt·v(u + ½·a·dt).
vec3 driftDisplacement(vec3 vel, vec3 acceleration) {
  if (uInverseLightSpeed2 > 0.0) return uTimeStep * coordinateVelocity(vel + 0.5 * uTimeStep * acceleration);
  return uTimeStep * vel + 0.5 * uTimeStep * uTimeStep * acceleration;
}

// A clock after Verlet's drift, which the force pass reads before the velocity pass writes it:
// + uClockShift (dt) times dτ/dt = 1/γ of the half-kicked u the drift used. uClockShift is 0 outside Verlet.
float shiftedClock(ivec2 coord, vec4 velocityTexel) {
  if (uClockShift == 0.0 || uInverseLightSpeed2 == 0.0) return velocityTexel.w + uClockShift;
  vec3 halfKicked = velocityTexel.xyz + 0.5 * uTimeStep * texelFetch(uAcceleration, coord, 0).xyz;
  return velocityTexel.w + uClockShift / lorentzFactor(halfKicked);
}
`;

function forceUniforms(force: CompiledForce, index: number): string {
  return ['cutoff', 'soft2', ...force.definition.params.map((p) => p.name)]
    .map((name) => `uniform float ${forceUniformName(index, name)};`)
    .join('\n');
}

const PAIR_ARGS = 'vec4 attr1, vec4 attr2, vec4 color1, vec4 color2, vec4 spin1, vec4 spin2, vec3 dir, float tau1, float tau2, vec3 delta, vec3 vel1, vec3 vel2, vec2 noise, vec3 noiseVec, vec3 acc2, float delay';
const PAIR_CALL_ARGS = 'attr1, attr2, color1, color2, spin1, spin2, dir, tau1, tau2, contact, vel1, vel2, noise, noiseVec, acc2, delay';
/** The same pair seen on the light cone: j's retarded geometry, velocity, acceleration and delay. */
const RETARDED_CALL_ARGS = 'attr1, attr2, color1, color2, spin1, spin2, dirR, tau1, tau2, contactR, vel1, vel2R, noise, noiseVec, acc2R, delayR';

/**
 * j on the past light cone of pos1, c·(t − t_r) = |pos1 − x_j(t_r)| (mirrors cpu/history.ts). The gap
 * g(k) = c·(t − t_k) − |pos1 − x_j(t_k)| grows into the past for |v| < c: bisect the history steps for
 * the interval holding the root, then interpolate linearly. Step 0 is the live state at uTime, step k ≥ 1
 * the k-th newest layer. Beyond the history the oldest step moves back in uniform motion to the cone.
 * Returns false when the event does not come from the stored steps: without a history (Galilean, or no
 * retarded force) delta and vel2 stay as given (the present); beyond it they are extrapolated.
 */
const GLSL_RETARDED = /* glsl */ `
int historyLayer(int k) {
  return (uHistoryHead - min(k, uHistoryFilled) + 1 + uHistoryCount) % uHistoryCount;
}

// Step k ≥ 1 of j: stored, or for k beyond the stored ones the oldest stored state moved back uniformly.
void historyStep(ivec2 coord2, int k, out vec3 pos2, out vec3 vel2, out float time2) {
  int layer = historyLayer(k);
  pos2 = texelFetch(uHistoryPosition, ivec3(coord2, layer), 0).xyz;
  vel2 = coordinateVelocity(texelFetch(uHistoryVelocity, ivec3(coord2, layer), 0).xyz);
  time2 = texelFetch(uHistoryTimes, ivec2(layer, 0), 0).x;
  float back = float(max(k - uHistoryFilled, 0)) * uHistoryResetDt;
  pos2 -= back * vel2;
  time2 -= back;
}

float coneGap(vec3 pos1, vec3 pos2, float time2) {
  return uLightSpeed * (uHistoryNow - time2) - length(pos1 - pos2);
}

bool retardedSource(ivec2 coord2, vec3 pos1, inout vec3 delta, inout vec3 vel2, out vec3 acc2, out float delay) {
  acc2 = vec3(0.0);
  delay = 0.0;
  if (uInverseLightSpeed2 == 0.0 || uHistoryCount < 2) return false;
  // Step 0 is the live state at the evaluation time.
  vec3 pLo = pos1 - delta;
  vec3 vLo = vel2;
  float tLo = uHistoryNow;
  float gLo = coneGap(pos1, pLo, tLo);
  vec3 pHi;
  vec3 vHi;
  float tHi;
  historyStep(coord2, uHistoryCount, pHi, vHi, tHi);
  float gHi = coneGap(pos1, pHi, tHi);
  if (gHi < 0.0) {
    // Beyond the history: the oldest step moved back in uniform motion meets the cone (cpu/history.ts,
    // uniformConeOffset: the positive root of (c² − v²)s² + 2(c²D − w·v)s + c²D² − |w|² = 0).
    vec3 w = pos1 - pHi;
    float far = uHistoryNow - tHi;
    float c2 = uLightSpeed * uLightSpeed;
    float qa = c2 - dot(vHi, vHi);
    float qb = 2.0 * (c2 * far - dot(w, vHi));
    float qc = c2 * far * far - dot(w, w);
    float root = sqrt(qb * qb - 4.0 * qa * qc);
    float back = qb >= 0.0 ? -2.0 * qc / (qb + root) : (root - qb) / (2.0 * qa);
    delta = w + back * vHi;
    vel2 = vHi;
    delay = far + back;
    return false;
  }
  int lo = 0;
  int hi = uHistoryCount;
  for (int iteration = 0; iteration < ${HISTORY_SEARCH_STEPS}; iteration++) {
    if (hi - lo <= 1) break;
    int mid = (lo + hi) / 2;
    vec3 pMid;
    vec3 vMid;
    float tMid;
    historyStep(coord2, mid, pMid, vMid, tMid);
    float gMid = coneGap(pos1, pMid, tMid);
    if (gMid >= 0.0) {
      hi = mid; pHi = pMid; vHi = vMid; tHi = tMid; gHi = gMid;
    } else {
      lo = mid; pLo = pMid; vLo = vMid; tLo = tMid; gLo = gMid;
    }
  }
  float s = gLo / (gLo - gHi);
  delta = pos1 - mix(pLo, pHi, s);
  vel2 = mix(vLo, vHi, s);
  delay = uHistoryNow - mix(tLo, tHi, s);
  // The acceleration comes from two stored steps: the live velocity is the previous step's in Verlet's
  // second pass, so a bracket starting at the present uses steps 1 and 2.
  vec3 vNewer = vLo;
  float tNewer = tLo;
  vec3 vOlder = vHi;
  float tOlder = tHi;
  if (lo == 0) {
    vec3 unused;
    historyStep(coord2, 1, unused, vNewer, tNewer);
    historyStep(coord2, 2, unused, vOlder, tOlder);
  }
  acc2 = tNewer > tOlder ? (vNewer - vOlder) / (tNewer - tOlder) : vec3(0.0);
  return true;
}
`;
/** Variables whose GLSL reads the other particle's texel; derived so new variables cannot be missed. */
const readersOf = (glslName: string) => PAIR_VARIABLES.filter((v) => v.glsl.includes(glslName)).map((v) => v.name);
const SPIN_J_VARIABLES = readersOf('spin2');
const TAU_J_VARIABLES = readersOf('tau2');
const VELOCITY_J_VARIABLES = readersOf('vel2');

/** The other particle's spin and clock are fetched only when an expression reads them. */
function reads(forces: readonly CompiledForce[], names: readonly string[]): boolean {
  return forces.some((f) => names.some((name) => f.reads.has(name)));
}

function readsPotential(forces: readonly CompiledForce[], names: readonly string[]): boolean {
  return forces.some((f) => names.some((name) => f.potentialReads.has(name)));
}


/** The pair's random numbers (`noise` = (rand, randn), `noiseVec` = randv) at their means. */
const MEAN_NOISE_DECLARATIONS = `vec2 noise = vec2(${glslFloat(MEAN_NOISE.rand)}, ${glslFloat(MEAN_NOISE.randn)});
    vec3 noiseVec = vec3(${glslFloat(MEAN_NOISE.randvx)}, ${glslFloat(MEAN_NOISE.randvy)}, ${glslFloat(MEAN_NOISE.randvz)});`;

/**
 * Hashes the random numbers the forces read (each value on its own, see NOISE_STREAMS) from the pair
 * and uTime, only for pairs inside the range of a force that reads them. Empty when none does.
 */
function noiseSampling(forces: readonly CompiledForce[]): string {
  const readers = forces.flatMap((f, index) => (f.random ? [{ f, index }] : []));
  if (readers.length === 0) return '';
  const assignments = PAIR_VARIABLES.filter((v) => v.random && !v.lowered && reads(forces, [v.name])).map((v) => {
    if (!(v.name in NOISE_STREAMS)) throw new Error(`no hash stream for random variable '${v.name}'`);
    const { stream, normal } = NOISE_STREAMS[v.name as keyof PairNoise];
    return `${v.glsl} = ${normal ? 'hashNormal' : 'hashUniform'}(seed, ${stream}u);`;
  });
  const inRange = readers.some(({ f }) => f.definition.range === 'long')
    ? ''
    : `if (${readers.map(({ index }) => `dist < ${forceUniformName(index, 'cutoff')}`).join(' || ')}) `;
  return `${inRange}{
      uint seed = pairSeed(uint(min(index1, index2)), uint(max(index1, index2)), floatBitsToUint(uTime));
      ${assignments.join('\n      ')}
    }`;
}

const FINITE3 = `bool finite3(vec3 v) {
  return !any(isnan(v)) && !any(isinf(v));
}`;

// GLSL pow() is undefined for negative bases; the emitted code calls spow, which matches Math.pow.
const SIGNED_POW = `float spow(float b, float e) {
  if (b >= 0.0 || fract(e) != 0.0) return pow(b, e);
  float m = pow(-b, e);
  return mod(e, 2.0) == 0.0 ? m : -m;
}`;

function forceFunction(force: CompiledForce, index: number): string {
  // Vector forces take v_i as the library variable, so the softened r comes in as an argument.
  return `${forceUniforms(force, index)}
${force.glsl(`force${index}`, force.kind === 'vector' ? `float r, ${PAIR_ARGS}` : PAIR_ARGS, index)}`;
}

function forceAccumulation(force: CompiledForce, index: number): string {
  // A retarded force reads the pair on the light cone (the R variables); the others, the present.
  const [args, r2, dist, magnitude] = force.retarded ? [RETARDED_CALL_ARGS, 'r2R', 'distR', 'magnitudeR'] : [PAIR_CALL_ARGS, 'r2', 'dist', 'magnitude'];
  const soft = `sqrt(${r2} + ${forceUniformName(index, 'soft2')})`;
  // Gradient forces return −∇V at Δx (`contact`, the possibly clamped Δx); vector forces take v_i and
  // the softened r, and the ones that read v_i also add their Jacobian ∂F/∂v_i.
  const term = force.kind === 'gradient' ? `force += force${index}(contact, ${args});`
    : force.kind === 'vector' && force.jacobian
      // A non-finite ∂F/∂v (e.g. of |v| at v = 0) is dropped for this pair only: its force is then stepped explicitly.
      ? `{ vec3 f; mat3 j; force${index}(vel1, ${soft}, ${args}, f, j); force += f; if (finite3(j[0]) && finite3(j[1]) && finite3(j[2])) jacobian += j; }`
      : force.kind === 'vector' ? `force += force${index}(vel1, ${soft}, ${args});`
        : `${magnitude} += force${index}(${soft}, ${args});`;
  // A retarded source at the very point i is skipped, as coincident particles are (and as the CPU does).
  const conditions = [...(force.retarded ? ['distR > 0.0'] : []), ...(force.definition.range === 'short' ? [`${dist} < ${forceUniformName(index, 'cutoff')}`] : [])];
  return conditions.length > 0 ? `if (${conditions.join(' && ')}) ${term}` : term;
}

const VELOCITY_HELPERS = /* glsl */ `
// Friction, 2D projection, speed clamp, then reflection if the coming drift would leave the
// boundary. The drift is predicted with the acceleration it will use (zero for Euler). vel is the
// stored velocity: under Minkowski, friction, drag and reflection act on u.
vec3 finishVelocity(vec3 vel, vec3 pos, vec3 acceleration, float mass) {
  if (uFriction > 0.0) vel *= exp(-uFriction * uTimeStep);
  if (uQuadraticDrag > 0.0) vel /= 1.0 + uQuadraticDrag * uTimeStep * length(vel) / mass;
  if (uMode2D) vel.z = 0.0;
  float speed = length(vel);
  if (uMaxSpeed > 0.0 && speed > uMaxSpeed) vel *= uMaxSpeed / speed;
  vec3 next = uInverseLightSpeed2 > 0.0 ? pos + driftDisplacement(vel, acceleration)
    : pos + uTimeStep * vel + 0.5 * uTimeStep * uTimeStep * acceleration;
  if (uBoundary == ${BOUNDARY_CODE.sphere}) {
    float len = length(next);
    if (len > uBoundarySize) {
      vec3 normal = next / len;
      float outward = dot(vel, normal);
      if (outward > 0.0) vel -= (1.0 + uRestitution) * outward * normal;
    }
  } else if (uBoundary == ${BOUNDARY_CODE.box}) {
    vec3 half_ = boxHalfSize();
    for (int axis = 0; axis < 3; axis++) {
      if (abs(next[axis]) > half_[axis] && next[axis] * vel[axis] > 0.0) vel[axis] = -uRestitution * vel[axis];
    }
  }
  return vel;
}
`;

/**
 * Impulse on particle index1 from every pair closer than uCollisionDistance that is still
 * approaching: Δv = -(1 + e)·m_j/(m_i + m_j)·((v_i − v_j)·n)·n, with n pointing from j to i; a fixed
 * partner acts as infinite mass, Δv = -(1 + e)·((v_i − v_j)·n)·n. All pairs use the pre-step
 * velocities: an isolated pair conserves momentum (and kinetic energy for e = 1) exactly, while
 * simultaneous multi-particle contacts are resolved pairwise and only approximately (as in v1).
 */
const COLLISION_HELPERS = /* glsl */ `
vec3 collisionImpulse(int index1, vec3 pos1, vec3 vel1, float mass1) {
  vec3 dv = vec3(0.0);
  if (uCollisionDistance <= 0.0) return dv;
  int width = TEXTURE_WIDTH;
  for (int index2 = 0; index2 < uCount; index2++) {
    if (index2 == index1) continue;
    ivec2 coord2 = ivec2(index2 % width, index2 / width);
    vec3 delta = pos1 - texelFetch(texturePosition, coord2, 0).xyz;
    float r2 = dot(delta, delta);
    if (r2 == 0.0 || r2 >= uCollisionDistance * uCollisionDistance) continue;
    vec3 n = delta / sqrt(r2);
    float approach = dot(vel1 - texelFetch(textureVelocity, coord2, 0).xyz, n);
    if (approach >= 0.0) continue;
    bool fixedPartner = texelFetch(texturePosition, coord2, 0).w == KIND_FIXED;
    float mass2 = texelFetch(uAttributes, coord2, 0).x;
    float share = fixedPartner ? 1.0 : mass2 / (mass1 + mass2);
    dv -= (1.0 + uCollisionRestitution) * share * approach * n;
  }
  return dv;
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
    pos = clamp(pos, -boxHalfSize(), boxHalfSize());
  }
  return pos;
}
`;

/**
 * Σ_j F_ij on particle index1. Clocks are read from textureVelocity and shifted by uClockShift,
 * because Verlet evaluates forces after positions advanced but before clocks are written. Random
 * numbers are hashed per pair ('sampled'), or kept at their means for the field's test particle ('mean').
 */
function totalForceFunction(forces: readonly CompiledForce[], noise: 'sampled' | 'mean'): string {
  const fetchTau2 = reads(forces, TAU_J_VARIABLES) ? 'shiftedClock(coord2, texelFetch(textureVelocity, coord2, 0))' : '0.0';
  const fetchSpin2 = reads(forces, SPIN_J_VARIABLES) ? 'texelFetch(uSpin, coord2, 0)' : 'vec4(0.0)';
  const fetchVel2 = reads(forces, VELOCITY_J_VARIABLES) ? 'coordinateVelocity(texelFetch(textureVelocity, coord2, 0).xyz)' : 'vec3(0.0)';
  const sampling = noise === 'sampled' ? noiseSampling(forces) : '';
  const retarded = forces.some((f) => f.retarded);
  return `${SIGNED_POW}
${FINITE3}
${GLSL_COLOR_HELPERS}${sampling ? GLSL_NOISE_HELPERS : ''}${retarded ? GLSL_RETARDED : ''}
${forces.map(forceFunction).join('\n')}

vec3 totalForce(int index1, vec3 pos1, vec3 stored1, vec4 attr1, vec4 color1, vec4 spin1, float tau1, float collisionDistance, out mat3 jacobian) {
  int width = TEXTURE_WIDTH;
  // Expressions see coordinate velocities; the contact test compares stored ones, as collisionImpulse does.
  vec3 vel1 = coordinateVelocity(stored1);
  vec3 force = vec3(0.0);
  jacobian = mat3(0.0);
  for (int index2 = 0; index2 < uCount; index2++) {
    if (index2 == index1) continue;
    ivec2 coord2 = ivec2(index2 % width, index2 / width);
    vec3 delta = pos1 - texelFetch(texturePosition, coord2, 0).xyz;
    float r2 = dot(delta, delta);
    if (r2 == 0.0) continue;
    float dist = sqrt(r2);
    // collisionDistance is a contact radius: an approaching pair inside it exchanges momentum in
    // collisionImpulse instead, and a resting or separating overlap feels the force evaluated at the
    // contact distance, so repulsion separates it while attraction stays bounded (no 1/r^2 blow-up).
    if (dist < collisionDistance) {
      if (dot(stored1 - texelFetch(textureVelocity, coord2, 0).xyz, delta) < 0.0) continue;
      r2 = collisionDistance * collisionDistance;
      dist = collisionDistance;
    }
    vec4 attr2 = texelFetch(uAttributes, coord2, 0);
    vec4 color2 = texelFetch(uColor, coord2, 0);
    float tau2 = ${fetchTau2};
    vec4 spin2 = ${fetchSpin2};
    vec3 dir = normalize(delta);
    // Δx at the (possibly contact-clamped) distance: what direction-aware forces are evaluated at.
    vec3 contact = dir * dist;
    vec3 vel2 = ${fetchVel2};
    ${MEAN_NOISE_DECLARATIONS}${sampling ? `
    ${sampling}` : ''}
    vec3 acc2 = vec3(0.0);
    float delay = 0.0;${retarded ? `
    // Retarded forces: j as pos1 sees it now, on its past light cone.
    vec3 deltaR = delta;
    vec3 vel2R = coordinateVelocity(texelFetch(textureVelocity, coord2, 0).xyz);
    vec3 acc2R;
    float delayR;
    retardedSource(coord2, pos1, deltaR, vel2R, acc2R, delayR);
    float r2R = dot(deltaR, deltaR);
    float distR = sqrt(r2R);
    vec3 dirR = r2R > 0.0 ? deltaR / distR : dir;
    // The contact radius bounds retarded forces as it does the others: an overlap is felt at its edge.
    if (distR > 0.0 && distR < collisionDistance) {
      distR = collisionDistance;
      r2R = distR * distR;
    }
    vec3 contactR = dirR * distR;
    float magnitudeR = 0.0;` : ''}
    float magnitude = 0.0;
    ${forces.map(forceAccumulation).join('\n    ')}
    force += magnitude * dir;${retarded ? `
    force += magnitudeR * dirR;` : ''}
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
${COLLISION_HELPERS}
${totalForceFunction(forces, 'sampled')}

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
  mat3 jacobian;
  vec3 force = totalForce(index1, positionTexel.xyz, velocityTexel.xyz, attr1, texelFetch(uColor, coord1, 0), texelFetch(uSpin, coord1, 0), tau1, uCollisionDistance, jacobian);
  vec3 kick = uTimeStep * force / attr1.x;${forces.some((f) => f.jacobian) ? `
  // Implicit midpoint for velocity-dependent forces: (I − dt/2m·J)·Δv = dt/m·F (Boris for v × B).
  // Under Minkowski the unknown is Δu, so J = ∂F/∂v becomes ∂F/∂u = ∂F/∂v·∂v/∂u.
  // A singular solve (dt/2m·J with an eigenvalue 1: the time step is too large for that force)
  // falls back to the explicit kick for this step, as the CPU reference does.
  if (uInverseLightSpeed2 > 0.0) jacobian = jacobian * velocityJacobian(velocityTexel.xyz);
  vec3 implicitKick = inverse(mat3(1.0) - (0.5 * uTimeStep / attr1.x) * jacobian) * kick;
  if (finite3(implicitKick)) kick = implicitKick;` : ''}
  vec3 vel = velocityTexel.xyz + kick + collisionImpulse(index1, positionTexel.xyz, velocityTexel.xyz, attr1.x);
  vel = finishVelocity(vel, positionTexel.xyz, vec3(0.0), attr1.x);
  // The clock runs at dτ/dt = 1/γ of the velocity the drift uses.
  gl_FragColor = vec4(vel, tau1 + properTimeStep(vel));
}
`;
}

/** Velocity Verlet, force half: a(x) = F(x)/m at the current positions, clocks shifted by uClockShift. */
export function generateAccelerationShader(forces: readonly CompiledForce[]): string {
  return `${COMMON_UNIFORMS}
${totalForceFunction(forces, 'sampled')}

void main() {
${PARTICLE_HEADER}
  if (inactive || fixedParticle) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec4 attr1 = texelFetch(uAttributes, coord1, 0);
  mat3 jacobian;
  vec3 force = totalForce(index1, positionTexel.xyz, velocityTexel.xyz, attr1, texelFetch(uColor, coord1, 0), texelFetch(uSpin, coord1, 0), shiftedClock(coord1, velocityTexel), uCollisionDistance, jacobian);
  vec3 acceleration = force / attr1.x;
  if (uMode2D) acceleration.z = 0.0;
  gl_FragColor = vec4(acceleration, 0.0);
}
`;
}

/** Velocity Verlet, drift: x' = x + v·dt + ½·a·dt² (Minkowski: dt·v(u + ½·a·dt)). */
export const VERLET_POSITION_SHADER = `${COMMON_UNIFORMS}
${POSITION_HELPERS}
void main() {
${PARTICLE_HEADER}
  if (inactive || fixedParticle) {
    gl_FragColor = positionTexel;
    return;
  }
  vec3 displacement = driftDisplacement(velocityTexel.xyz, texelFetch(uAcceleration, coord1, 0).xyz);
  gl_FragColor = vec4(confinePosition(positionTexel.xyz + limitDisplacement(displacement)), positionTexel.w);
}
`;

/** Velocity Verlet, kick: v' = v + ½(a + a')·dt, with texturePosition already at x'. */
export const VERLET_VELOCITY_SHADER = `${COMMON_UNIFORMS}
${VELOCITY_HELPERS}
${COLLISION_HELPERS}
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
  vec3 acceleration = texelFetch(uAcceleration, coord1, 0).xyz;
  vec3 accelerationNext = texelFetch(uAccelerationNext, coord1, 0).xyz;
  vec3 vel = velocityTexel.xyz + 0.5 * uTimeStep * (acceleration + accelerationNext)
    + collisionImpulse(index1, positionTexel.xyz, velocityTexel.xyz, texelFetch(uAttributes, coord1, 0).x);
  // dτ of the half-kicked u the drift moved with, as shiftedClock assumed.
  float clock = tau1 + properTimeStep(velocityTexel.xyz + 0.5 * uTimeStep * acceleration);
  gl_FragColor = vec4(finishVelocity(vel, positionTexel.xyz, accelerationNext, texelFetch(uAttributes, coord1, 0).x), clock);
}
`;

function potentialTerm(force: CompiledForce, index: number): string {
  if (!force.evaluatePotential) return '';
  const call = force.vector
    ? `potential${index}(delta, ${PAIR_CALL_ARGS})`
    : `potential${index}(sqrt(r2 + ${forceUniformName(index, 'soft2')}), ${PAIR_CALL_ARGS})`;
  return force.definition.range === 'short'
    ? `if (dist < ${forceUniformName(index, 'cutoff')}) energy += ${call};`
    : `energy += ${call};`;
}

/**
 * Per-particle potential energy Σ_j V(r_ij) for the potential-mode forces, written to .x.
 * Run on demand for the stats dialog; the total energy is half the sum over particles.
 */
export function generatePotentialShader(forces: readonly CompiledForce[]): string {
  const potentials = forces.filter((f) => f.evaluatePotential);
  const needsTau2 = readsPotential(potentials, TAU_J_VARIABLES);
  const fetchSpin2 = readsPotential(potentials, SPIN_J_VARIABLES) ? 'texelFetch(uSpin, coord2, 0)' : 'vec4(0.0)';
  return `${COMMON_UNIFORMS}
${SIGNED_POW}
${GLSL_COLOR_HELPERS}
${forces.map((force, index) => `${forceUniforms(force, index)}${force.evaluatePotential ? `
${force.glsl(`potential${index}`, PAIR_ARGS, index, 'potential')}` : ''}`).join('\n')}

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
    // Potentials read no velocity or random numbers; these satisfy the shared pair signature.
    vec3 contact = delta;
    vec3 vel1 = vec3(0.0);
    vec3 vel2 = vec3(0.0);
    vec3 acc2 = vec3(0.0);
    float delay = 0.0;
    ${MEAN_NOISE_DECLARATIONS}
    ${forces.map(potentialTerm).filter(Boolean).join('\n    ')}
  }
  gl_FragColor = vec4(energy, 0.0, 0.0, 0.0);
}
`;
}

/**
 * Field probes: the net force on a test particle (uniform attributes, clock 0, random numbers at
 * their means) at each probe position, written as (F, |F|). Calls the same generated totalForce
 * with index1 = -1, so it matches no real particle; probes never enter the particle textures.
 */
export function generateFieldShader(forces: readonly CompiledForce[]): string {
  return `${COMMON_UNIFORMS}
uniform sampler2D uProbePositions;
uniform int uProbeWidth;
uniform int uProbeCount;
uniform vec4 uProbeAttributes;
uniform vec4 uProbeColor;
uniform vec4 uProbeSpin;
${totalForceFunction(forces, 'mean')}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  if (coord.y * uProbeWidth + coord.x >= uProbeCount) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 pos = texelFetch(uProbePositions, coord, 0).xyz;
  // Probes do not collide: the field shows every force, including inside the collision distance.
  // The test particle is at rest, so velocity-dependent forces on it vanish (jacobian unused).
  mat3 jacobian;
  vec3 force = totalForce(-1, pos, vec3(0.0), uProbeAttributes, uProbeColor, uProbeSpin, 0.0, 0.0, jacobian);
  gl_FragColor = vec4(force, length(force));
}
`;
}

/** Semi-implicit Euler, drift: x += v'·dt with the already-updated velocity (v = u/γ under Minkowski). */
export const POSITION_SHADER = `${COMMON_UNIFORMS}
${POSITION_HELPERS}
void main() {
${PARTICLE_HEADER}
  if (inactive || fixedParticle) {
    gl_FragColor = positionTexel;
    return;
  }
  gl_FragColor = vec4(confinePosition(positionTexel.xyz + uTimeStep * coordinateVelocity(velocityTexel.xyz)), positionTexel.w);
}
`;
