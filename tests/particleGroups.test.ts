import { describe, expect, it } from 'vitest';
import { groupParticles } from '../src/engine/particleGroups';
import { defaultParticle, ParticleKind, ParticleSet, type Particle } from '../src/engine/particles';
import { SPECIES } from '../src/engine/species';

const make = (particles: Particle[]) => {
  const set = new ParticleSet(Math.max(particles.length, 1));
  set.addAll(particles);
  return set;
};

describe('groupParticles', () => {
  it('returns nothing for an empty set', () => {
    expect(groupParticles(new ParticleSet(2))).toEqual([]);
  });

  it('ignores position, velocity and clock', () => {
    const groups = groupParticles(make([
      defaultParticle({ position: [1, 2, 3], velocity: [1, 0, 0], time: 5 }),
      defaultParticle({ position: [4, 5, 6], velocity: [0, 1, 0], time: 9 }),
    ]));
    expect(groups).toHaveLength(1);
    expect(groups[0]!.count).toBe(2);
  });

  it('separates groups on every grouped property', () => {
    const variants: Partial<Particle>[] = [
      { kind: ParticleKind.fixed }, { mass: 2 }, { charge: -1 }, { charge2: 1 }, { spin: [0, 0, 1] },
      { isospin: 0.5 }, { parity: -1 }, { nuclearCharge: 1 }, { color: [1, 0, 0] },
    ];
    const groups = groupParticles(make([defaultParticle(), ...variants.map((v) => defaultParticle(v))]));
    expect(groups).toHaveLength(variants.length + 1);
  });

  it('sorts by count descending with ties in first-seen order', () => {
    const [a, b, c] = [1, 2, 3].map((mass) => defaultParticle({ mass }));
    const groups = groupParticles(make([a!, b!, c!, c!, b!, c!]));
    expect(groups.map((g) => [g.mass, g.count])).toEqual([[3, 3], [2, 2], [1, 1]]);
    const ties = groupParticles(make([b!, a!, b!, a!]));
    expect(ties.map((g) => g.mass)).toEqual([2, 1]);
  });

  it('names the species a group matches', () => {
    const fields = (s: { mass: number; charge: number; isospin: number; nuclearCharge: number }) =>
      defaultParticle({ mass: s.mass, charge: s.charge, isospin: s.isospin, nuclearCharge: s.nuclearCharge });
    const groups = groupParticles(make([fields(SPECIES.p), fields(SPECIES.u), defaultParticle({ mass: 7 })]));
    expect(groups.map((g) => g.species).sort()).toEqual(['p', 'u', undefined]);
  });

  it('does not name a species for a particle with a second charge component', () => {
    const { mass, charge, isospin, nuclearCharge } = SPECIES.p;
    const groups = groupParticles(make([defaultParticle({ mass, charge, isospin, nuclearCharge, charge2: 0.5 })]));
    expect(groups[0]!.species).toBeUndefined();
  });
});
