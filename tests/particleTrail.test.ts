import { describe, expect, it } from 'vitest';
import { ParticleTrail } from '../src/engine/render/ParticleTrail';

describe('ParticleTrail', () => {
  it('keeps the newest positions, oldest first, dropping the oldest once full', () => {
    const trail = new ParticleTrail(3);
    for (let k = 0; k < 5; k++) trail.push([k, 2 * k, 0]);
    expect(trail.points()).toEqual([[2, 4, 0], [3, 6, 0], [4, 8, 0]]);
    // The geometry draws the same buffer (a copying attribute would leave the GPU at zeros).
    expect(Array.from(trail.object.geometry.attributes.position!.array.slice(0, 9))).toEqual([2, 4, 0, 3, 6, 0, 4, 8, 0]);
    expect(trail.object.geometry.drawRange.count).toBe(3);
  });

  it('fades from a dim tail to a bright head', () => {
    const trail = new ParticleTrail(4);
    for (let k = 0; k < 4; k++) trail.push([k, 0, 0]);
    const colors = trail.object.geometry.attributes.color!.array;
    const brightness = (k: number) => colors[k * 3 + 2]!;
    expect(brightness(0)).toBeLessThan(brightness(1));
    expect(brightness(2)).toBeLessThan(brightness(3));
    expect(brightness(3)).toBeCloseTo(1, 6);
  });

  it('clears to nothing drawn', () => {
    const trail = new ParticleTrail(4);
    trail.push([1, 1, 1]);
    trail.clear();
    expect([trail.length, trail.object.geometry.drawRange.count]).toEqual([0, 0]);
  });
});
