import { describe, expect, it } from 'vitest';
import { forceFromPreset } from '../src/engine/forces/presets';
import { defaultParticle } from '../src/engine/particles';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { createSnapshot, parseSnapshot } from '../src/engine/snapshot';

const snapshot = () => createSnapshot('s', 3, { ...DEFAULT_SETTINGS }, [forceFromPreset('gravity')],
  [defaultParticle({ position: [1, 2, 3], nuclearCharge: 1, color: [0, 1, 0] })]);

describe('snapshots', () => {
  it('round-trips through JSON', () => {
    const original = snapshot();
    expect(parseSnapshot(JSON.stringify(original))).toEqual(original);
  });

  it('migrates version 1, which had no nuclear charge', () => {
    const v1 = JSON.parse(JSON.stringify(snapshot()));
    v1.version = 1;
    delete v1.particles[0].nuclearCharge;
    expect(parseSnapshot(JSON.stringify(v1)).particles[0]!.nuclearCharge).toBe(0);
  });

  it.each([
    [(s: Record<string, unknown>) => (s.version = 3), /at 'version': expected one of 1, 2, got 3/],
    [(s: Record<string, unknown>) => delete (s.particles as Record<string, unknown>[])[0]!.nuclearCharge, /particles\[0\].nuclearCharge': expected a finite number/],
    [(s: Record<string, unknown>) => ((s.forces as Record<string, unknown>[])[0]!.expression = 'zz'), /forces\[0\]'.*unknown variable 'zz'/],
    [(s: Record<string, unknown>) => ((s.settings as Record<string, unknown>).timeStep = 0), /timeStep must be > 0/],
  ])('rejects broken snapshots with a path %#', (mutate, message) => {
    const raw = JSON.parse(JSON.stringify(snapshot()));
    mutate(raw);
    expect(() => parseSnapshot(JSON.stringify(raw))).toThrow(message);
  });
});
