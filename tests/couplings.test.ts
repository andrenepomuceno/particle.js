import { describe, expect, it } from 'vitest';
import { inactiveCouplings } from '../src/engine/forces/couplings';
import { compileForce } from '../src/engine/forces/compile';
import { forceFromPreset } from '../src/engine/forces/presets';
import { defaultParticle, ParticleSet, type Particle } from '../src/engine/particles';

const setOf = (...particles: Particle[]) => {
  const set = new ParticleSet(4);
  set.addAll(particles);
  return set;
};

describe('inactiveCouplings', () => {
  it('reports the nuclear preset on particles without nuclear charge', () => {
    const nuclear = compileForce(forceFromPreset('nuclear'));
    expect(inactiveCouplings(nuclear, setOf(defaultParticle(), defaultParticle()))).toEqual([
      'reads nuclear charge, but every particle has nuclear charge 0, so the terms using it vanish',
    ]);
    expect(inactiveCouplings(nuclear, setOf(defaultParticle(), defaultParticle({ nuclearCharge: 1 })))).toEqual([]);
  });

  it('reports color forces in a colorless world and stays quiet for mass', () => {
    expect(inactiveCouplings(compileForce(forceFromPreset('color')), setOf(defaultParticle()))).toHaveLength(1);
    expect(inactiveCouplings(compileForce(forceFromPreset('gravity')), setOf(defaultParticle()))).toEqual([]);
  });

  it('says nothing for an empty world', () => {
    expect(inactiveCouplings(compileForce(forceFromPreset('coulomb')), new ParticleSet(1))).toEqual([]);
  });
});
