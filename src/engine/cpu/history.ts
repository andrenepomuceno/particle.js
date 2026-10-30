import { coordinateVelocity } from '../metric';
import { TEXEL, type ParticleSet, type Vec3 } from '../particles';
import { HISTORY_DEPTH_RANGE } from '../settings';

/**
 * The CPU mirror of the GPU history for retarded forces: a ring of `depth` past states (positions and
 * stored velocities, float32 like the textures) with their times. Step k = 1 is the newest stored
 * state; k = 0 means the live set at the evaluation time. Only `filled` steps are stored: older ones
 * extrapolate the oldest stored state in uniform motion, as the history began (`resetDt` per step),
 * so starting or restarting a history costs one copy, not `depth`.
 */
export interface History {
  depth: number;
  /** Particles per layer; edits that change it need a new history. */
  particles: number;
  head: number;
  filled: number;
  resetDt: number;
  positions: Float32Array[];
  velocities: Float32Array[];
  times: Float64Array;
}

/** Iterations that bisect the deepest history allowed down to one step. */
export const HISTORY_SEARCH_STEPS = Math.ceil(Math.log2(HISTORY_DEPTH_RANGE[1]));

const layer = (history: History, k: number) => (history.head - (k - 1) + history.depth) % history.depth;

/** A history whose past is the set's state at `time` moved back uniformly (step k at time − (k − 1)·dt). */
export function createHistory(set: ParticleSet, depth: number, time: number, dt: number): History {
  const size = set.count * TEXEL;
  const history: History = {
    depth, particles: set.count, head: 0, filled: 1, resetDt: dt,
    positions: Array.from({ length: depth }, () => new Float32Array(size)),
    velocities: Array.from({ length: depth }, () => new Float32Array(size)),
    times: new Float64Array(depth),
  };
  history.positions[0]!.set(set.position.subarray(0, size));
  history.velocities[0]!.set(set.velocity.subarray(0, size));
  history.times[0] = time;
  return history;
}

/** Stores the set's state at `time` as the newest step. */
export function pushHistory(history: History, set: ParticleSet, time: number): void {
  history.head = (history.head + 1) % history.depth;
  history.positions[history.head]!.set(set.position.subarray(0, history.particles * TEXEL));
  history.velocities[history.head]!.set(set.velocity.subarray(0, history.particles * TEXEL));
  history.times[history.head] = time;
  history.filled = Math.min(history.filled + 1, history.depth);
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
    const stored = Math.min(k, history.filled);
    const l = layer(history, stored);
    const positions = k === 0 ? set.position : history.positions[l]!;
    const v = coordinateVelocity((k === 0 ? set.velocity : history.velocities[l]!).subarray(o, o + 3), set.inverseLightSpeed2);
    const back = k > stored ? (k - stored) * history.resetDt : 0;
    const x: Vec3 = [positions[o]! - back * v[0], positions[o + 1]! - back * v[1], positions[o + 2]! - back * v[2]];
    const t = (k === 0 ? time : history.times[l]!) - back;
    const gap = lightSpeed * (time - t) - Math.hypot(x1[0] - x[0], x1[1] - x[1], x1[2] - x[2]);
    return { x, t, gap, v };
  };
  const now = sample(0);
  const instantaneous = (): RetardedSource => ({
    delta: [x1[0] - now.x[0], x1[1] - now.x[1], x1[2] - now.x[2]], velocity: now.v, acceleration: [0, 0, 0], delay: 0, retarded: false,
  });
  let a = now;
  let b = sample(history.depth);
  if (history.depth < 2 || b.gap < 0) return instantaneous();
  let lo = 0;
  let hi = history.depth;
  for (let step = 0; step < HISTORY_SEARCH_STEPS && hi - lo > 1; step++) {
    const mid = (lo + hi) >> 1;
    const m = sample(mid);
    if (m.gap >= 0) [hi, b] = [mid, m];
    else [lo, a] = [mid, m];
  }
  const s = a.gap / (a.gap - b.gap);
  const mix = (p: Vec3, q: Vec3): Vec3 => [p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1]), p[2] + s * (q[2] - p[2])];
  const x = mix(a.x, b.x);
  // The acceleration comes from two stored steps: the live state's velocity is the previous step's in
  // Verlet's second pass, so a bracket starting at the present uses steps 1 and 2.
  const [newer, older] = lo === 0 ? [sample(1), sample(2)] : [a, b];
  const span = newer.t - older.t;
  return {
    delta: [x1[0] - x[0], x1[1] - x[1], x1[2] - x[2]],
    velocity: mix(a.v, b.v),
    acceleration: span > 0 ? [0, 1, 2].map((c) => (newer.v[c]! - older.v[c]!) / span) as Vec3 : [0, 0, 0],
    delay: time - (a.t + s * (b.t - a.t)),
    retarded: true,
  };
}
