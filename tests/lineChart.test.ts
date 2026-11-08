import { describe, expect, it } from 'vitest';
import { valueRange } from '../src/ui/components/LineChart';

describe('chart value range', () => {
  it('spans the values, from zero when zero-based', () => {
    expect(valueRange([2, 5, 3], false, 0)).toEqual([2, 5]);
    expect(valueRange([2, 5, 3], true, 0)).toEqual([0, 5]);
  });

  it('widens a nearly constant series to the minimum span around its middle, even at zero', () => {
    // float32 noise around a conserved value draws flat instead of filling the chart.
    expect(valueRange([654.0601, 654.0599], false, 10)).toEqual([649.06, 659.06]);
    const [lo, hi] = valueRange([1e-7, -1e-7], false, 3);
    expect([lo, hi]).toEqual([-1.5, 1.5]);
  });

  it('keeps a real change wider than the minimum span as it is', () => {
    expect(valueRange([-58, 22], false, 3)).toEqual([-58, 22]);
  });

  it('gives a constant series a unit span when no minimum is set', () => {
    expect(valueRange([4, 4], false, 0)).toEqual([3, 5]);
  });
});
