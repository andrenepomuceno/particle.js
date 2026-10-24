import { describe, expect, it } from 'vitest';
import { forceFromPreset } from '../src/engine/forces/presets';
import { defaultParticle } from '../src/engine/particles';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { createSnapshot, parseSnapshot } from '../src/engine/snapshot';

/** A current snapshot rewritten in the pre-v4 particle layout (scalar spin, no charge2/isospin). */
function legacy(version: number) {
  const raw = JSON.parse(JSON.stringify(snapshot()));
  raw.version = version;
  for (const p of raw.particles) {
    p.spin = p.spin[2];
    delete p.charge2;
    delete p.isospin;
  }
  return raw;
}

const snapshot = () => createSnapshot('s', 3, { ...DEFAULT_SETTINGS }, [forceFromPreset('gravity')],
  [defaultParticle({ position: [1, 2, 3], nuclearCharge: 1, color: [0, 1, 0] })]);

describe('snapshots', () => {
  it('round-trips through JSON', () => {
    const original = snapshot();
    expect(parseSnapshot(JSON.stringify(original))).toEqual(original);
  });

  it('migrates version 3 scalar spin to the z component, also inside expressions', () => {
    const v3 = JSON.parse(JSON.stringify(snapshot()));
    v3.version = 3;
    v3.particles[0].spin = 0.5;
    delete v3.particles[0].charge2;
    delete v3.particles[0].isospin;
    v3.forces[0].expression = 'k * s_i * s_j / r^4';
    v3.forces[0].params = [{ name: 'k', value: 1 }];
    const parsed = parseSnapshot(JSON.stringify(v3));
    expect(parsed.particles[0]).toMatchObject({ spin: [0, 0, 0.5], charge2: 0, isospin: 0 });
    expect(parsed.forces[0]!.expression).toBe('k * sz_i * sz_j / r^4');
  });

  it('migrates version 2 settings to the Euler integrator they ran with', () => {
    const v2 = legacy(2);
    delete v2.settings.integrator;
    expect(parseSnapshot(JSON.stringify(v2)).settings.integrator).toBe('euler');
  });

  it('migrates version 4, which had no quadratic drag or slab depth', () => {
    // Version 4 particles already have the current shape (vector spin, 2D charge, isospin).
    const v4 = { ...JSON.parse(JSON.stringify(snapshot())), version: 4 };
    delete v4.settings.quadraticDrag;
    delete v4.settings.boundaryDepth;
    const { settings } = parseSnapshot(JSON.stringify(v4));
    expect([settings.quadraticDrag, settings.boundaryDepth]).toEqual([0, 0]);
  });

  it('migrates version 1, which had no nuclear charge', () => {
    const v1 = legacy(1);
    delete v1.particles[0].nuclearCharge;
    expect(parseSnapshot(JSON.stringify(v1)).particles[0]!.nuclearCharge).toBe(0);
  });

  it.each([
    [(s: Record<string, unknown>) => (s.version = 6), /at 'version': expected one of 1, 2, 3, 4, 5, got 6/],
    [(s: Record<string, unknown>) => delete (s.settings as Record<string, unknown>).boundaryDepth, /settings.boundaryDepth': is required/],
    [(s: Record<string, unknown>) => delete (s.particles as Record<string, unknown>[])[0]!.nuclearCharge, /particles\[0\].nuclearCharge': expected a finite number/],
    [(s: Record<string, unknown>) => ((s.forces as Record<string, unknown>[])[0]!.expression = 'zz'), /forces\[0\]'.*unknown variable 'zz'/],
    [(s: Record<string, unknown>) => ((s.settings as Record<string, unknown>).timeStep = 0), /timeStep must be > 0/],
  ])('rejects broken snapshots with a path %#', (mutate, message) => {
    const raw = JSON.parse(JSON.stringify(snapshot()));
    mutate(raw);
    expect(() => parseSnapshot(JSON.stringify(raw))).toThrow(message);
  });
});
