import type { CompiledForce } from '../forces/compile';
import { pairScope, addPairForce } from './pairs';
import { coordinateVelocity, inverseLightSpeed2, lorentzFactor, velocityJacobian } from '../metric';
import { ParticleKind, TEXEL, type ParticleSet } from '../particles';
import { boxHalfSize, type SimulationSettings } from '../settings';

type Vec = [number, number, number];

/**
 * Carries Verlet's a(x_n) from one step to the next, as the GPU acceleration texture does.
 * Clear it (set `acceleration` to undefined) after editing particles, forces or settings,
 * exactly when the GPU would recompute it.
 */
export interface ReferenceState {
  acceleration?: Float64Array;
}

/**
 * Float64 mirror of the GPU passes for both integrators. It pins down the integrator
 * semantics in unit tests and is the reference for cross-checking GPU output. Under the
 * Minkowski metric the set's velocities are proper velocities u (see metric.ts).
 */
export function referenceStep(
  set: ParticleSet,
  forces: readonly CompiledForce[],
  settings: SimulationSettings,
  time: number,
  state: ReferenceState = {},
): void {
  const k = inverseLightSpeed2(settings);
  if (set.inverseLightSpeed2 !== k || set.lightSpeed !== settings.lightSpeed) {
    throw new Error(`the particle set is set up for 1/c² = ${set.inverseLightSpeed2} and c = ${set.lightSpeed}, but the settings give ${k} and ${settings.lightSpeed}; call setMetric first`);
  }
  // Velocity-dependent forces break Verlet's position-only assumption; the Euler step (with the
  // implicit kick for forces reading v_i) handles them.
  if (settings.integrator === 'verlet' && !forces.some((f) => f.velocity)) verletStep(set, forces, settings, time, state);
  else eulerStep(set, forces, settings, time);
}

/**
 * Δv over dt for F(v) linearized at v (Jacobian J = ∂F/∂v): the implicit midpoint step
 * (I − dt/(2m)·J)·Δv = dt/m·F. For F = v × B it is the exact Boris rotation (|v| preserved).
 */
export function implicitKick(force: Vec, jacobian: ArrayLike<number>, mass: number, dt: number): Vec {
  const explicit = force.map((c) => (dt * c) / mass) as Vec;
  if (!Array.from(jacobian).every(Number.isFinite)) return explicit;
  const h = dt / (2 * mass);
  const a = [0, 1, 2].map((k) => [0, 1, 2].map((l) => (k === l ? 1 : 0) - h * jacobian[k * 3 + l]!));
  const b = force.map((c) => (dt * c) / mass) as Vec;
  const det = (m: number[][]) => m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!)
    - m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!)
    + m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  const d = det(a);
  // Cramer's rule: 3×3, so cheaper and clearer than a general solver. A singular system (dt/2m·J
  // with an eigenvalue 1: the step is too large for that force) uses the explicit kick, as the GPU does.
  const kick = [0, 1, 2].map((col) => det(a.map((row, k) => row.map((c, l) => (l === col ? b[k]! : c)))) / d) as Vec;
  return kick.every(Number.isFinite) && d !== 0 ? kick : explicit;
}

const isFixed = (set: ParticleSet, i: number) => set.position[i * TEXEL + 3] === ParticleKind.fixed;
const read = (array: Float32Array, i: number): Vec => [array[i * TEXEL]!, array[i * TEXEL + 1]!, array[i * TEXEL + 2]!];

/**
 * x' − x of the coming drift from stored velocity u and acceleration a = F/m: v·dt + ½·a·dt² when
 * Galilean; under Minkowski the same kick-drift-kick split moves with the half-kicked u, dt·v(u + ½·a·dt).
 */
function driftDisplacement(u: Vec, a: ArrayLike<number>, dt: number, k: number): Vec {
  if (k > 0) return coordinateVelocity(halfKicked(u, a, dt), k).map((c) => dt * c) as Vec;
  return [0, 1, 2].map((c) => dt * u[c]! + 0.5 * dt * dt * a[c]!) as Vec;
}

const halfKicked = (u: Vec, a: ArrayLike<number>, dt: number): Vec => [0, 1, 2].map((c) => u[c]! + 0.5 * dt * a[c]!) as Vec;

/** ∂F/∂v (row-major, in place) → ∂F/∂u = ∂F/∂v · ∂v/∂u, for the implicit kick on u under Minkowski. */
function toProperJacobian(jacobian: Float64Array, u: Vec, k: number): void {
  const m = velocityJacobian(u, k);
  const product = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => [0, 1, 2].reduce((sum, l) => sum + jacobian[row * 3 + l]! * m[l * 3 + col]!, 0)));
  jacobian.set(product);
}

/**
 * Impulses from approaching pairs closer than collisionDistance, all from the same pre-step
 * velocities (mirrors the GLSL collisionImpulse; fixed partners act as infinite mass).
 */
function collisionImpulses(set: ParticleSet, settings: SimulationSettings): Float64Array {
  const result = new Float64Array(set.count * 3);
  const d = settings.collisionDistance;
  if (d <= 0) return result;
  const { position: x, velocity: v, attributes: a } = set;
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const oi = i * TEXEL;
    for (let j = 0; j < set.count; j++) {
      if (j === i) continue;
      const oj = j * TEXEL;
      const dx = x[oi]! - x[oj]!;
      const dy = x[oi + 1]! - x[oj + 1]!;
      const dz = x[oi + 2]! - x[oj + 2]!;
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 === 0 || r2 >= d * d) continue;
      const r = Math.sqrt(r2);
      const approach = ((v[oi]! - v[oj]!) * dx + (v[oi + 1]! - v[oj + 1]!) * dy + (v[oi + 2]! - v[oj + 2]!) * dz) / r;
      if (approach >= 0) continue;
      const share = isFixed(set, j) ? 1 : a[oj]! / (a[oi]! + a[oj]!);
      const scale = ((1 + settings.collisionRestitution) * share * approach) / r;
      result[i * 3] = result[i * 3]! - scale * dx;
      result[i * 3 + 1] = result[i * 3 + 1]! - scale * dy;
      result[i * 3 + 2] = result[i * 3 + 2]! - scale * dz;
    }
  }
  return result;
}

/** Σ_j F_ij on particle i; clocks are read advanced by `clockShifts` (Verlet evaluates before writing them). */
function totalForce(
  set: ParticleSet, i: number, forces: readonly CompiledForce[], time: number, clockShifts: Float64Array | undefined, collisionDistance: number, jacobian?: Float64Array,
): Vec {
  const pos = set.position;
  const oi = i * TEXEL;
  const force: [number, number, number] = [0, 0, 0];
  // Random numbers are hashed from the pair and `time`, the time the GPU pass sets as uTime.
  const noise = forces.some((f) => f.random);
  for (let j = 0; j < set.count; j++) {
    if (j === i) continue;
    const oj = j * TEXEL;
    const dx = pos[oi]! - pos[oj]!;
    const dy = pos[oi + 1]! - pos[oj + 1]!;
    const dz = pos[oi + 2]! - pos[oj + 2]!;
    const r2 = dx * dx + dy * dy + dz * dz;
    if (r2 === 0 || forces.length === 0) continue;
    const trueDist = Math.sqrt(r2);
    const v = set.velocity;
    const approaching = (v[oi]! - v[oj]!) * dx + (v[oi + 1]! - v[oj + 1]!) * dy + (v[oi + 2]! - v[oj + 2]!) * dz < 0;
    // Contact radius, as in the shader: approaching overlaps skip the force (the impulse replaces it),
    // other overlaps feel it evaluated at the contact distance.
    if (trueDist < collisionDistance && approaching) continue;
    const dist = Math.max(trueDist, collisionDistance);
    const pair = pairScope(set, i, j, time, noise);
    if (clockShifts) {
      pair.t_i += clockShifts[i]!;
      pair.t_j += clockShifts[j]!;
    }
    addPairForce(forces, pair, dist, force, jacobian);
  }
  return force;
}

function accelerations(set: ParticleSet, forces: readonly CompiledForce[], settings: SimulationSettings, time: number, clockShifts: Float64Array | undefined): Float64Array {
  const result = new Float64Array(set.count * 3);
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const mass = set.attributes[i * TEXEL]!;
    const force = totalForce(set, i, forces, time, clockShifts, settings.collisionDistance);
    result.set([force[0] / mass, force[1] / mass, settings.mode2D ? 0 : force[2] / mass], i * 3);
  }
  return result;
}

/**
 * Friction, 2D projection, speed clamp, then reflection if the coming drift (with `a`) would leave.
 * `v` is the stored velocity: under Minkowski, friction, drag and reflection act on u.
 */
function finishVelocity(v: Vec, pos: Vec, a: Vec, mass: number, settings: SimulationSettings): Vec {
  const dt = settings.timeStep;
  const k = inverseLightSpeed2(settings);
  if (settings.friction > 0) v.forEach((c, k) => (v[k] = c * Math.exp(-settings.friction * dt)));
  if (settings.quadraticDrag > 0) {
    const damping = 1 + (settings.quadraticDrag * dt * Math.hypot(...v)) / mass;
    v.forEach((c, k) => (v[k] = c / damping));
  }
  if (settings.mode2D) v[2] = 0;
  const speed = Math.hypot(...v);
  if (settings.maxSpeed > 0 && speed > settings.maxSpeed) v.forEach((c, k) => (v[k] = (c * settings.maxSpeed) / speed));
  const drift = k > 0 ? driftDisplacement(v, a, dt, k) : undefined;
  const next = [0, 1, 2].map((c) => (drift ? pos[c]! + drift[c]! : pos[c]! + dt * v[c]! + 0.5 * dt * dt * a[c]!)) as Vec;
  const size = settings.boundarySize;
  if (settings.boundary === 'sphere') {
    const len = Math.hypot(...next);
    if (len > size) {
      const normal = next.map((c) => c / len) as Vec;
      const outward = v[0] * normal[0] + v[1] * normal[1] + v[2] * normal[2];
      if (outward > 0) v.forEach((c, k) => (v[k] = c - (1 + settings.restitution) * outward * normal[k]!));
    }
  } else if (settings.boundary === 'box') {
    const half = boxHalfSize(settings);
    for (let k = 0; k < 3; k++) if (Math.abs(next[k]!) > half[k]! && next[k]! * v[k]! > 0) v[k] = -settings.restitution * v[k]!;
  }
  return v;
}

function confinePosition(p: Vec, settings: SimulationSettings): Vec {
  if (settings.mode2D) p[2] = 0;
  const size = settings.boundarySize;
  if (settings.boundary === 'sphere') {
    const len = Math.hypot(...p);
    if (len > size) p.forEach((c, k) => (p[k] = (c * size) / len));
  } else if (settings.boundary === 'box') {
    const half = boxHalfSize(settings);
    p.forEach((c, k) => (p[k] = Math.min(Math.max(c, -half[k]!), half[k]!)));
  }
  return p;
}

function eulerStep(set: ParticleSet, forces: readonly CompiledForce[], settings: SimulationSettings, time: number): void {
  const dt = settings.timeStep;
  const k = inverseLightSpeed2(settings);
  const nextVelocity = new Float64Array(set.count * TEXEL);
  const impulses = collisionImpulses(set, settings);
  const implicit = forces.some((f) => f.jacobian);
  for (let i = 0; i < set.count; i++) {
    const tau = set.velocity[i * TEXEL + 3]!;
    if (isFixed(set, i)) {
      nextVelocity.set([0, 0, 0, tau + dt], i * TEXEL);
      continue;
    }
    const mass = set.attributes[i * TEXEL]!;
    const jacobian = implicit ? new Float64Array(9) : undefined;
    const force = totalForce(set, i, forces, time, undefined, settings.collisionDistance, jacobian);
    if (jacobian && k > 0) toProperJacobian(jacobian, read(set.velocity, i), k);
    const kick = jacobian ? implicitKick(force, jacobian, mass, dt) : force.map((c) => (dt * c) / mass) as Vec;
    const u = read(set.velocity, i).map((c, axis) => c + kick[axis]! + impulses[i * 3 + axis]!) as Vec;
    const next = finishVelocity(u, read(set.position, i), [0, 0, 0], mass, settings);
    // The clock runs at dτ/dt = 1/γ of the velocity the drift below uses.
    nextVelocity.set([...next, tau + dt / lorentzFactor(next, k)], i * TEXEL);
  }
  set.velocity.set(nextVelocity);
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const v = coordinateVelocity(read(set.velocity, i), k);
    set.position.set(confinePosition(read(set.position, i).map((c, axis) => c + dt * v[axis]!) as Vec, settings), i * TEXEL);
  }
}

function verletStep(set: ParticleSet, forces: readonly CompiledForce[], settings: SimulationSettings, time: number, state: ReferenceState): void {
  const dt = settings.timeStep;
  if (state.acceleration && state.acceleration.length !== set.count * 3) {
    throw new Error(`stored acceleration covers ${state.acceleration.length / 3} particles but the set has ${set.count}; clear ReferenceState after edits`);
  }
  const k = inverseLightSpeed2(settings);
  const before = state.acceleration ?? accelerations(set, forces, settings, time, undefined);
  const limit = settings.maxSpeed * dt;
  // Each clock advances by dτ = dt/γ of the half-kicked u the drift moves with (dt when Galilean, or fixed).
  const clockShifts = new Float64Array(set.count);
  for (let i = 0; i < set.count; i++) {
    const a = before.subarray(i * 3, i * 3 + 3);
    const u = read(set.velocity, i);
    clockShifts[i] = dt / lorentzFactor(halfKicked(u, a, dt), k);
    if (isFixed(set, i)) continue;
    const d = driftDisplacement(u, a, dt, k);
    const length = Math.hypot(...d);
    const scale = settings.maxSpeed > 0 && length > limit ? limit / length : 1;
    const drift = read(set.position, i).map((c, axis) => c + scale * d[axis]!) as Vec;
    set.position.set(confinePosition(drift, settings), i * TEXEL);
  }
  const after = accelerations(set, forces, settings, time + dt, clockShifts);
  const impulses = collisionImpulses(set, settings);
  for (let i = 0; i < set.count; i++) {
    const tau = set.velocity[i * TEXEL + 3]!;
    if (isFixed(set, i)) {
      set.velocity.set([0, 0, 0, tau + dt], i * TEXEL);
      continue;
    }
    const v = read(set.velocity, i).map((c, axis) => c + 0.5 * dt * (before[i * 3 + axis]! + after[i * 3 + axis]!) + impulses[i * 3 + axis]!) as Vec;
    const aNext: Vec = [after[i * 3]!, after[i * 3 + 1]!, after[i * 3 + 2]!];
    set.velocity.set([...finishVelocity(v, read(set.position, i), aNext, set.attributes[i * TEXEL]!, settings), tau + clockShifts[i]!], i * TEXEL);
  }
  state.acceleration = after;
}
