import type { CompiledForce } from '../forces/compile';
import { pairScope, pairTerm } from './pairs';
import { ParticleKind, TEXEL, type ParticleSet } from '../particles';
import type { SimulationSettings } from '../settings';

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
 * semantics in unit tests and is the reference for cross-checking GPU output.
 */
export function referenceStep(
  set: ParticleSet,
  forces: readonly CompiledForce[],
  settings: SimulationSettings,
  time: number,
  state: ReferenceState = {},
): void {
  if (settings.integrator === 'verlet') verletStep(set, forces, settings, time, state);
  else eulerStep(set, forces, settings, time);
}

const isFixed = (set: ParticleSet, i: number) => set.position[i * TEXEL + 3] === ParticleKind.fixed;
const read = (array: Float32Array, i: number): Vec => [array[i * TEXEL]!, array[i * TEXEL + 1]!, array[i * TEXEL + 2]!];

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

/** Σ_j F_ij on particle i; clocks are read shifted by `clockShift` (Verlet evaluates before writing them). */
function totalForce(set: ParticleSet, i: number, forces: readonly CompiledForce[], time: number, clockShift: number, collisionDistance: number): Vec {
  const pos = set.position;
  const oi = i * TEXEL;
  let fx = 0;
  let fy = 0;
  let fz = 0;
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
    const pair = pairScope(set, i, j, time);
    pair.t_i += clockShift;
    pair.t_j += clockShift;
    let magnitude = 0;
    for (const f of forces) magnitude += pairTerm(f, f.evaluate, pair, dist * dist, dist);
    fx += (magnitude * dx) / trueDist;
    fy += (magnitude * dy) / trueDist;
    fz += (magnitude * dz) / trueDist;
  }
  return [fx, fy, fz];
}

function accelerations(set: ParticleSet, forces: readonly CompiledForce[], settings: SimulationSettings, time: number, clockShift: number): Float64Array {
  const result = new Float64Array(set.count * 3);
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const mass = set.attributes[i * TEXEL]!;
    const force = totalForce(set, i, forces, time, clockShift, settings.collisionDistance);
    result.set([force[0] / mass, force[1] / mass, settings.mode2D ? 0 : force[2] / mass], i * 3);
  }
  return result;
}

/** Friction, 2D projection, speed clamp, then reflection if the coming drift (with `a`) would leave. */
function finishVelocity(v: Vec, pos: Vec, a: Vec, settings: SimulationSettings): Vec {
  const dt = settings.timeStep;
  if (settings.friction > 0) v.forEach((c, k) => (v[k] = c * Math.exp(-settings.friction * dt)));
  if (settings.mode2D) v[2] = 0;
  const speed = Math.hypot(...v);
  if (settings.maxSpeed > 0 && speed > settings.maxSpeed) v.forEach((c, k) => (v[k] = (c * settings.maxSpeed) / speed));
  const next = [0, 1, 2].map((k) => pos[k]! + dt * v[k]! + 0.5 * dt * dt * a[k]!) as Vec;
  const size = settings.boundarySize;
  if (settings.boundary === 'sphere') {
    const len = Math.hypot(...next);
    if (len > size) {
      const normal = next.map((c) => c / len) as Vec;
      const outward = v[0] * normal[0] + v[1] * normal[1] + v[2] * normal[2];
      if (outward > 0) v.forEach((c, k) => (v[k] = c - (1 + settings.restitution) * outward * normal[k]!));
    }
  } else if (settings.boundary === 'box') {
    for (let k = 0; k < 3; k++) if (Math.abs(next[k]!) > size && next[k]! * v[k]! > 0) v[k] = -settings.restitution * v[k]!;
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
    p.forEach((c, k) => (p[k] = Math.min(Math.max(c, -size), size)));
  }
  return p;
}

function eulerStep(set: ParticleSet, forces: readonly CompiledForce[], settings: SimulationSettings, time: number): void {
  const dt = settings.timeStep;
  const nextVelocity = new Float64Array(set.count * TEXEL);
  const impulses = collisionImpulses(set, settings);
  for (let i = 0; i < set.count; i++) {
    const tau = set.velocity[i * TEXEL + 3]!;
    if (isFixed(set, i)) {
      nextVelocity.set([0, 0, 0, tau + dt], i * TEXEL);
      continue;
    }
    const mass = set.attributes[i * TEXEL]!;
    const force = totalForce(set, i, forces, time, 0, settings.collisionDistance);
    const v = read(set.velocity, i).map((c, k) => c + (dt * force[k]!) / mass + impulses[i * 3 + k]!) as Vec;
    nextVelocity.set([...finishVelocity(v, read(set.position, i), [0, 0, 0], settings), tau + dt], i * TEXEL);
  }
  set.velocity.set(nextVelocity);
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const v = read(set.velocity, i);
    set.position.set(confinePosition(read(set.position, i).map((c, k) => c + dt * v[k]!) as Vec, settings), i * TEXEL);
  }
}

function verletStep(set: ParticleSet, forces: readonly CompiledForce[], settings: SimulationSettings, time: number, state: ReferenceState): void {
  const dt = settings.timeStep;
  if (state.acceleration && state.acceleration.length !== set.count * 3) {
    throw new Error(`stored acceleration covers ${state.acceleration.length / 3} particles but the set has ${set.count}; clear ReferenceState after edits`);
  }
  const before = state.acceleration ?? accelerations(set, forces, settings, time, 0);
  const limit = settings.maxSpeed * dt;
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const v = read(set.velocity, i);
    const d = [0, 1, 2].map((k) => dt * v[k]! + 0.5 * dt * dt * before[i * 3 + k]!) as Vec;
    const length = Math.hypot(...d);
    const scale = settings.maxSpeed > 0 && length > limit ? limit / length : 1;
    const drift = read(set.position, i).map((c, k) => c + scale * d[k]!) as Vec;
    set.position.set(confinePosition(drift, settings), i * TEXEL);
  }
  const after = accelerations(set, forces, settings, time + dt, dt);
  const impulses = collisionImpulses(set, settings);
  for (let i = 0; i < set.count; i++) {
    const tau = set.velocity[i * TEXEL + 3]!;
    if (isFixed(set, i)) {
      set.velocity.set([0, 0, 0, tau + dt], i * TEXEL);
      continue;
    }
    const v = read(set.velocity, i).map((c, k) => c + 0.5 * dt * (before[i * 3 + k]! + after[i * 3 + k]!) + impulses[i * 3 + k]!) as Vec;
    const aNext: Vec = [after[i * 3]!, after[i * 3 + 1]!, after[i * 3 + 2]!];
    set.velocity.set([...finishVelocity(v, read(set.position, i), aNext, settings), tau + dt], i * TEXEL);
  }
  state.acceleration = after;
}
