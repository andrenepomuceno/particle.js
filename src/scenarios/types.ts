import type { ForceDefinition } from '../engine/forces/types';
import type { Particle } from '../engine/particles';
import type { Rng } from '../engine/random';
import type { ColorMode } from '../engine/render/ParticlePoints';
import type { SimulationSettings } from '../engine/settings';

export interface Scenario {
  id: string;
  name: string;
  folder: string;
  description: string;
  seed: number;
  settings: Partial<SimulationSettings>;
  forces: () => ForceDefinition[];
  /** Particle total as written in the file. */
  defaultCount: number;
  /** Generates the particles, rescaled to `targetCount` at constant density when given. */
  build: (rng: Rng, targetCount?: number) => { particles: Particle[]; linearScale: number };
  cameraDistance: number;
  particleRadius: number;
  colorMode: ColorMode;
}
