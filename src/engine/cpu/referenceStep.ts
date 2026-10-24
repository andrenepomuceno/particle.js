import type { CompiledForce } from '../forces/compile';
import { pairScope, pairTerm } from './pairs';
import { ParticleKind, TEXEL, type ParticleSet } from '../particles';
import type { SimulationSettings } from '../settings';

type Vec = [number, number, number];

/** Carries Verlet's a(x_n) from one step to the next, as the GPU acceleration texture does. */
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

/** Σ_j F_ij on particle i; clocks are read shifted by `clockShift` (Verlet evaluates before writing them). */
function totalForce(set: ParticleSet, i: number, forces: readonly CompiledForce[], time: number, clockShift: number): Vec {
  const pi = read(set.position, i);
  const force: Vec = [0, 0, 0];
  for (let j = 0; j < set.count; j++) {
    if (j === i) continue;
    const pj = read(set.position, j);
    const delta: Vec = [pi[0] - pj[0], pi[1] - pj[1], pi[2] - pj[2]];
    const r2 = delta[0] ** 2 + delta[1] ** 2 + delta[2] ** 2;
    if (r2 === 0) continue;
    const dist = Math.sqrt(r2);
    const pair = pairScope(set, i, j, time);
    pair.t_i += clockShift;
    pair.t_j += clockShift;
    let magnitude = 0;
    for (const f of forces) magnitude += pairTerm(f, f.evaluate, pair, r2, dist);
    for (let k = 0; k < 3; k++) force[k] = force[k]! + (magnitude * delta[k]!) / dist;
  }
  return force;
}

function accelerations(set: ParticleSet, forces: readonly CompiledForce[], settings: SimulationSettings, time: number, clockShift: number): Float64Array {
  const result = new Float64Array(set.count * 3);
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const mass = set.attributes[i * TEXEL]!;
    const force = totalForce(set, i, forces, time, clockShift);
    result.set([force[0] / mass, force[1] / mass, settings.mode2D ? 0 : force[2] / mass], i * 3);
  }
  return result;
}

/** Friction, 2D projection, speed clamp, then reflection if the coming drift would leave. */
function finishVelocity(v: Vec, pos: Vec, settings: SimulationSettings): Vec {
  const dt = settings.timeStep;
  if (settings.friction > 0) v.forEach((c, k) => (v[k] = c * Math.exp(-settings.friction * dt)));
  if (settings.mode2D) v[2] = 0;
  const speed = Math.hypot(...v);
  if (settings.maxSpeed > 0 && speed > settings.maxSpeed) v.forEach((c, k) => (v[k] = (c * settings.maxSpeed) / speed));
  const next: Vec = [pos[0] + dt * v[0], pos[1] + dt * v[1], pos[2] + dt * v[2]];
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
  for (let i = 0; i < set.count; i++) {
    const tau = set.velocity[i * TEXEL + 3]!;
    if (isFixed(set, i)) {
      nextVelocity.set([0, 0, 0, tau + dt], i * TEXEL);
      continue;
    }
    const mass = set.attributes[i * TEXEL]!;
    const force = totalForce(set, i, forces, time, 0);
    const v = read(set.velocity, i).map((c, k) => c + (dt * force[k]!) / mass) as Vec;
    nextVelocity.set([...finishVelocity(v, read(set.position, i), settings), tau + dt], i * TEXEL);
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
  const before = state.acceleration?.length === set.count * 3 ? state.acceleration : accelerations(set, forces, settings, time, 0);
  for (let i = 0; i < set.count; i++) {
    if (isFixed(set, i)) continue;
    const v = read(set.velocity, i);
    const drift = read(set.position, i).map((c, k) => c + dt * v[k]! + 0.5 * dt * dt * before[i * 3 + k]!) as Vec;
    set.position.set(confinePosition(drift, settings), i * TEXEL);
  }
  const after = accelerations(set, forces, settings, time + dt, dt);
  for (let i = 0; i < set.count; i++) {
    const tau = set.velocity[i * TEXEL + 3]!;
    if (isFixed(set, i)) {
      set.velocity.set([0, 0, 0, tau + dt], i * TEXEL);
      continue;
    }
    const v = read(set.velocity, i).map((c, k) => c + 0.5 * dt * (before[i * 3 + k]! + after[i * 3 + k]!)) as Vec;
    set.velocity.set([...finishVelocity(v, read(set.position, i), settings), tau + dt], i * TEXEL);
  }
  state.acceleration = after;
}
