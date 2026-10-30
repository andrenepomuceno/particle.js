import { coordinateVelocity } from '../metric';
import { TEXEL, type ParticleSet, type Vec3 } from '../particles';

/**
 * The CPU mirror of the GPU history for retarded forces: `depth` past states (positions and stored
 * velocities, float32 like the textures) with their times. Step k = 1 is the newest stored state,
 * k = depth the oldest; k = 0 means the live set at the evaluation time.
 */
export interface History {
  depth: number;
  /** Particles per layer; edits that change it need a new history. */
  particles: number;
  head: number;
  positions: Float32Array[];
  velocities: Float32Array[];
  times: Float64Array;
}

/** Iterations that bisect any depth up to 256 (2⁸) layers. */
export const HISTORY_SEARCH_STEPS = 9;

const layer = (history: History, k: number) => (history.head - (k - 1) + history.depth) % history.depth;

/**
 * History extrapolated back in uniform motion from the set's state at `time`: step k holds
 * x − (k − 1)·dt·v at time − (k − 1)·dt (v = u/γ under the metric of k = 1/c²).
 */
export function createHistory(set: ParticleSet, depth: number, time: number, dt: number): History {
  const size = set.count * TEXEL;
  const history: History = {
    depth, particles: set.count, head: 0,
    positions: Array.from({ length: depth }, () => new Float32Array(size)),
    velocities: Array.from({ length: depth }, () => new Float32Array(size)),
    times: new Float64Array(depth),
  };
  for (let k = 1; k <= depth; k++) {
    const l = layer(history, k);
    const back = (k - 1) * dt;
    history.times[l] = time - back;
    history.velocities[l]!.set(set.velocity.subarray(0, size));
    const positions = history.positions[l]!;
    for (let i = 0; i < set.count; i++) {
      const o = i * TEXEL;
      const v = coordinateVelocity(set.velocity.subarray(o, o + 3), set.inverseLightSpeed2);
      for (let c = 0; c < 3; c++) positions[o + c] = set.position[o + c]! - back * v[c]!;
      positions[o + 3] = set.position[o + 3]!;
    }
  }
  return history;
}

/** Stores the set's state at `time` as the newest step. */
export function pushHistory(history: History, set: ParticleSet, time: number): void {
  history.head = (history.head + 1) % history.depth;
  history.positions[history.head]!.set(set.position.subarray(0, history.particles * TEXEL));
  history.velocities[history.head]!.set(set.velocity.subarray(0, history.particles * TEXEL));
  history.times[history.head] = time;
}

export interface RetardedSource {
  /** x₁ − x_j(t_r) */
  delta: Vec3;
  /** Coordinate velocity and acceleration of j at t_r. */
  velocity: Vec3;
  acceleration: Vec3;
  /** t − t_r */
  delay: number;
  /** False when the light cone lies beyond the history: the source is then read as it is now. */
  retarded: boolean;
}

/**
 * Particle j as the point x1 sees it at `time`: on x1's past light cone, c·(t − t_r) = |x1 − x_j(t_r)|.
 * The gap g(k) = c·(t − t_k) − |x1 − x_j(t_k)| grows into the past for |v| < c, so a bisection over
 * the steps finds the interval holding the root, and a linear interpolation finds t_r in it. Mirrors
 * the GLSL `retardedSource`.
 */
export function retardedSource(set: ParticleSet, history: History, j: number, x1: Vec3, time: number, lightSpeed: number): RetardedSource {
  const o = j * TEXEL;
  const sample = (k: number) => {
    const positions = k === 0 ? set.position : history.positions[layer(history, k)]!;
    const velocities = k === 0 ? set.velocity : history.velocities[layer(history, k)]!;
    const t = k === 0 ? time : history.times[layer(history, k)]!;
    const x: Vec3 = [positions[o]!, positions[o + 1]!, positions[o + 2]!];
    const gap = lightSpeed * (time - t) - Math.hypot(x1[0] - x[0], x1[1] - x[1], x1[2] - x[2]);
    return { x, t, gap, v: coordinateVelocity(velocities.subarray(o, o + 3), set.inverseLightSpeed2) };
  };
  const now = sample(0);
  const instantaneous = (): RetardedSource => ({
    delta: [x1[0] - now.x[0], x1[1] - now.x[1], x1[2] - now.x[2]], velocity: now.v, acceleration: [0, 0, 0], delay: 0, retarded: false,
  });
  if (history.depth < 2 || sample(history.depth).gap < 0) return instantaneous();
  let lo = 0;
  let hi = history.depth;
  for (let step = 0; step < HISTORY_SEARCH_STEPS && hi - lo > 1; step++) {
    const mid = (lo + hi) >> 1;
    if (sample(mid).gap >= 0) hi = mid;
    else lo = mid;
  }
  const a = sample(lo);
  const b = sample(hi);
  const s = a.gap / (a.gap - b.gap);
  const mix = (p: Vec3, q: Vec3): Vec3 => [p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1]), p[2] + s * (q[2] - p[2])];
  const x = mix(a.x, b.x);
  const span = a.t - b.t;
  return {
    delta: [x1[0] - x[0], x1[1] - x[1], x1[2] - x[2]],
    velocity: mix(a.v, b.v),
    acceleration: span > 0 ? [0, 1, 2].map((c) => (a.v[c]! - b.v[c]!) / span) as Vec3 : [0, 0, 0],
    delay: time - (a.t + s * (b.t - a.t)),
    retarded: true,
  };
}
