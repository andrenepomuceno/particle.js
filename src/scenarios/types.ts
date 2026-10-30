import type { TimelineEvent } from './timeline';
import type { FieldProbe } from '../engine/field';
import type { ForceDefinition } from '../engine/forces/types';
import type { Particle } from '../engine/particles';
import type { Rng } from '../engine/random';
import type { ColorMode } from '../engine/render/ParticlePoints';
import type { SimulationSettings } from '../engine/settings';

/** `view.field`: show the force field on load; unset options take the defaults. */
export interface ScenarioField {
  columns?: number;
  logScale?: boolean;
  probe?: FieldProbe;
}

export interface Scenario {
  id: string;
  name: string;
  folder: string;
  /** When the scenario joined the library (ISO 8601); orders the "newest" view. */
  added: string | undefined;
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
  /** Shows the force field when the scenario starts (until a scenario without one). */
  field: ScenarioField | undefined;
  /** Scripted events in time order (v1's actions); empty for unscripted scenarios. */
  timeline: TimelineEvent[];
}
