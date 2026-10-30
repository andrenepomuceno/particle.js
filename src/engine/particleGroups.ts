import { TEXEL, type ParticleKind, type ParticleSet, type Vec3 } from './particles';
import { SPECIES, SPECIES_IDS, type SpeciesId } from './species';

/** The grouping key of a particle: everything but position, velocity and clock. */
export interface ParticleProperties {
  kind: ParticleKind;
  mass: number;
  charge: number;
  charge2: number;
  spin: Vec3;
  isospin: number;
  parity: number;
  nuclearCharge: number;
  color: Vec3;
}

export interface ParticleGroup extends ParticleProperties {
  count: number;
  /** The species preset whose fields this group matches, if any. */
  species: SpeciesId | undefined;
}

// Species fill mass, charge, isospin and nuclear charge, and leave charge2 at 0.
const speciesKey = (mass: number, charge: number, charge2: number, isospin: number, nuclearCharge: number): string =>
  `${mass}|${charge}|${charge2}|${isospin}|${nuclearCharge}`;

const SPECIES_BY_KEY = new Map<string, SpeciesId>(
  SPECIES_IDS.map((id) => {
    const s = SPECIES[id];
    return [speciesKey(Math.fround(s.mass), Math.fround(s.charge), 0, Math.fround(s.isospin), Math.fround(s.nuclearCharge)), id];
  }),
);

/**
 * Groups the particles by their stored properties (exact float32 equality), largest group first;
 * ties keep the order in which the groups first appear in the set. O(N).
 */
export function groupParticles(set: ParticleSet): ParticleGroup[] {
  const { position, attributes, color, spin } = set;
  const groups = new Map<string, ParticleGroup>();
  for (let k = 0; k < set.count; k++) {
    const o = k * TEXEL;
    const key = [
      position[o + 3], attributes[o], attributes[o + 1], attributes[o + 2], attributes[o + 3],
      color[o], color[o + 1], color[o + 2], color[o + 3], spin[o], spin[o + 1], spin[o + 2], spin[o + 3],
    ].join('|');
    const found = groups.get(key);
    if (found) {
      found.count++;
      continue;
    }
    const mass = attributes[o]!;
    const charge = attributes[o + 1]!;
    const charge2 = attributes[o + 2]!;
    const isospin = spin[o + 3]!;
    const nuclearCharge = color[o + 3]!;
    groups.set(key, {
      count: 1,
      kind: position[o + 3] as ParticleKind,
      mass,
      charge,
      charge2,
      spin: [spin[o]!, spin[o + 1]!, spin[o + 2]!],
      isospin,
      parity: attributes[o + 3]!,
      nuclearCharge,
      color: [color[o]!, color[o + 1]!, color[o + 2]!],
      species: SPECIES_BY_KEY.get(speciesKey(mass, charge, charge2, isospin, nuclearCharge)),
    });
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
