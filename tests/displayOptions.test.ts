import { describe, expect, it } from 'vitest';
import { readDisplayOptions } from '../src/app/displayOptions';

describe('display options', () => {
  it('reads every option, the test particle over the default', () => {
    expect(readDisplayOptions({
      particleStyle: 'flat', colorMode: 'speed', particleRadius: 2, background: '#101820', axes: true, boundary: false,
      field: { enabled: true, columns: 64, logScale: true, lockScale: false, probe: { charge: -1 } },
      trail: { particle: 3 }, follow: { particle: 3 }, camera: { position: [0, 0, 500], target: [0, 0, 0] },
    })).toEqual({
      particleStyle: 'flat', colorMode: 'speed', particleRadius: 2, background: '#101820', axes: true, boundary: false,
      // Only the given fields: the others keep the scenario's test particle.
      field: { enabled: true, columns: 64, logScale: true, lockScale: false, probe: { charge: -1 } },
      trail: { particle: 3 }, follow: { particle: 3 }, camera: { position: [0, 0, 500], target: [0, 0, 0] },
    });
    expect(readDisplayOptions({})).toEqual({});
  });

  it.each([
    [{ colour: 'speed' }, /unknown key/],
    [{ colorMode: 'rainbow' }, /at 'colorMode'/],
    [{ background: 'black' }, /at 'background': expected a #rrggbb colour/],
    [{ particleRadius: 0 }, /at 'particleRadius': must be > 0/],
    [{ field: { columns: 1 } }, /at 'field.enabled'/],
    [{ field: { enabled: true, columns: 1 } }, /at 'field.columns': field grid columns must be an integer/],
    [{ field: { enabled: true, probe: { mass: 0 } } }, /at 'field.probe': test particle mass must be > 0/],
    [{ trail: { particle: -1 } }, /at 'trail.particle': must be a particle index/],
    [{ trail: { particle: 3 }, follow: { particle: 0 } }, /at 'trail.particle': must be the followed particle \(follow.particle = 0\), got 3/],
    [{ camera: { position: [0, 0] } }, /at 'camera.position'/],
  ])('rejects %j with its path', (value, message) => {
    expect(() => readDisplayOptions(value, 'test.json')).toThrow(message);
  });
});
