/**
 * Decides whether a requestAnimationFrame tick renders under an FPS cap (0 = no cap) and returns
 * the new reference time. It advances by whole intervals so 60 on a 144 Hz display averages 60
 * (not 48), resyncs after stalls, and allows half a millisecond of rAF timestamp jitter.
 */
export function limitFrame(now: number, last: number, fpsLimit: number): { render: boolean; last: number } {
  if (fpsLimit <= 0) return { render: true, last: now };
  const interval = 1000 / fpsLimit;
  if (now - last < interval - 0.5) return { render: false, last };
  return { render: true, last: now - last > 2 * interval ? now : last + interval };
}
