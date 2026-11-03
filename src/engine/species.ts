/**
 * Particle species as attribute presets, in the project's relative units: a light quark has
 * mass 1 (a constituent quark, about a third of a nucleon) and nuclear charge 1/3 (baryon number).
 * Species only fill attributes; nothing in the engine knows about them afterwards. Their display names
 * are in the interface catalogs (src/i18n).
 */
export interface Species {
  mass: number;
  charge: number;
  isospin: number;
  nuclearCharge: number;
}

const ELECTRON_MASS = 3 / 1836;

export const SPECIES = {
  u: { mass: 1, charge: 2 / 3, isospin: 0.5, nuclearCharge: 1 / 3 },
  d: { mass: 1, charge: -1 / 3, isospin: -0.5, nuclearCharge: 1 / 3 },
  ubar: { mass: 1, charge: -2 / 3, isospin: -0.5, nuclearCharge: -1 / 3 },
  dbar: { mass: 1, charge: 1 / 3, isospin: 0.5, nuclearCharge: -1 / 3 },
  p: { mass: 3, charge: 1, isospin: 0.5, nuclearCharge: 1 },
  n: { mass: 3, charge: 0, isospin: -0.5, nuclearCharge: 1 },
  e: { mass: ELECTRON_MASS, charge: -1, isospin: 0, nuclearCharge: 0 },
  positron: { mass: ELECTRON_MASS, charge: 1, isospin: 0, nuclearCharge: 0 },
} as const satisfies Record<string, Species>;

export type SpeciesId = keyof typeof SPECIES;
export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];
