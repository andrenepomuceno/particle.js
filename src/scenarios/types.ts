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
  particles: (rng: Rng) => Particle[];
  cameraDistance: number;
  particleRadius: number;
  colorMode: ColorMode;
}
