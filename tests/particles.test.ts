import { describe, expect, it } from 'vitest';
import { defaultParticle, ParticleKind, ParticleSet } from '../src/engine/particles';
import { DEFAULT_SETTINGS, validateSettings } from '../src/engine/settings';

describe('ParticleSet', () => {
  it('round-trips every field', () => {
    const set = new ParticleSet(4);
    const particle = defaultParticle({
      kind: ParticleKind.fixed, position: [1, 2, 3], velocity: [4, 5, 6], time: 7,
      mass: 8, charge: -1, spin: 0.5, parity: -1, color: [1, 0, 0],
    });
    expect(set.add(particle)).toBe(0);
    expect(set.get(0)).toEqual(particle);
  });

  it('removes indices preserving order and clearing freed slots', () => {
    const set = new ParticleSet(4);
    set.addAll([0, 1, 2, 3].map((x) => defaultParticle({ position: [x, 0, 0] })));
    set.remove([0, 2]);
    expect(set.toArray().map((p) => p.position[0])).toEqual([1, 3]);
    expect(Array.from(set.position.slice(8))).toEqual(new Array(8).fill(0));
  });

  it('replaces a particle in place', () => {
    const set = new ParticleSet(1);
    set.add(defaultParticle());
    set.set(0, defaultParticle({ mass: 3 }));
    expect(set.get(0).mass).toBe(3);
    set.clear();
    expect(set.count).toBe(0);
  });

  it.each([
    [() => new ParticleSet(0), /capacity must be a positive integer, got 0/],
    [() => new ParticleSet(1).get(0), /index 0 out of range \[0, 0\)/],
    [() => new ParticleSet(1).add(defaultParticle({ mass: 0 })), /mass > 0, got 0/],
    [() => new ParticleSet(1).add(defaultParticle({ charge: NaN })), /non-finite/],
    [() => new ParticleSet(1).add(defaultParticle({ kind: 7 as ParticleKind })), /unknown kind 7/],
    [() => new ParticleSet(1).addAll([defaultParticle(), defaultParticle()]), /cannot add 2 particles: 0 in use, capacity 1/],
  ])('fails loudly %#', (action, message) => {
    expect(action).toThrow(message);
  });

  it('refuses overflow on single add', () => {
    const set = new ParticleSet(1);
    set.add(defaultParticle());
    expect(() => set.add(defaultParticle())).toThrow(/capacity exceeded: 1 slots/);
  });

  it('validates the whole batch before writing any of it', () => {
    const set = new ParticleSet(4);
    expect(() => set.addAll([defaultParticle(), defaultParticle({ mass: -1 })])).toThrow(/#1/);
    expect(set.count).toBe(0);
  });
});

describe('validateSettings', () => {
  it('accepts the defaults', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS })).toEqual([]);
  });

  it('lists every invalid field', () => {
    const problems = validateSettings({
      ...DEFAULT_SETTINGS, timeStep: 0, friction: -1, maxSpeed: -1,
      boundary: 'cone' as never, boundarySize: 0, restitution: 2,
    });
    expect(problems).toHaveLength(6);
  });
});
