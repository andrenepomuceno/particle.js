import { describe, expect, it } from 'vitest';
import { limitFrame } from '../src/app/frameLimiter';

/** Renders over `seconds` of rAF ticks at `displayHz` with the given cap, returning frames per second. */
function measure(displayHz: number, fpsLimit: number, seconds = 10, jitterMs = 0.3): number {
  let last = 0;
  let frames = 0;
  const ticks = Math.round(seconds * displayHz);
  for (let k = 1; k <= ticks; k++) {
    const now = (k * 1000) / displayHz + (k % 2 === 0 ? jitterMs : -jitterMs);
    const tick = limitFrame(now, last, fpsLimit);
    last = tick.last;
    if (tick.render) frames++;
  }
  return frames / seconds;
}

describe('limitFrame', () => {
  it.each([
    [60, 60, 60], [60, 30, 30], [144, 60, 60], [144, 30, 30], [75, 60, 60], [120, 30, 30],
  ])('a %d Hz display capped at %d renders %d fps', (hz, cap, expected) => {
    expect(measure(hz, cap)).toBeCloseTo(expected, 0);
  });

  it('renders every tick without a cap', () => {
    expect(measure(144, 0)).toBeCloseTo(144, 0);
  });

  it('resyncs after a stall instead of bursting to catch up', () => {
    const afterStall = limitFrame(5000, 1000, 60);
    expect(afterStall).toEqual({ render: true, last: 5000 });
    expect(limitFrame(5005, afterStall.last, 60).render).toBe(false);
  });
});
