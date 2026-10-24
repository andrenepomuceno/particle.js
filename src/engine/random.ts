import type { Vec3 } from './particles';

export type Rng = () => number;

/** mulberry32: tiny, fast and deterministic for a given seed. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const uniform = (rng: Rng, min: number, max: number) => min + (max - min) * rng();

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('cannot pick from an empty list');
  return items[Math.floor(rng() * items.length)]!;
}

export function inSphere(rng: Rng, radius: number): Vec3 {
  const direction = onSphere(rng);
  const r = radius * Math.cbrt(rng());
  return [direction[0] * r, direction[1] * r, direction[2] * r];
}

export function onSphere(rng: Rng): Vec3 {
  const z = uniform(rng, -1, 1);
  const phi = uniform(rng, 0, 2 * Math.PI);
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(phi), s * Math.sin(phi), z];
}

export function inDisk(rng: Rng, radius: number): Vec3 {
  const r = radius * Math.sqrt(rng());
  const phi = uniform(rng, 0, 2 * Math.PI);
  return [r * Math.cos(phi), r * Math.sin(phi), 0];
}
