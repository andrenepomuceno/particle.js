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
  /** The file it was read from (library or imported file name), as error messages name it. */
  file: string;
  /** The file's text as read; Information → JSON shows and edits it. */
  text: string;
  folder: string;
  /** When the scenario joined the library (ISO 8601); orders the "newest" view. */
  added: string | undefined;
  description: string;
  /** Fixed seed of the random layout, when the file asks for one; otherwise every start draws its own. */
  seed: number | undefined;
  settings: Partial<SimulationSettings>;
  forces: () => ForceDefinition[];
  /** Particle total as written in the file. */
  defaultCount: number;
  /** Generates the particles, rescaled to `targetCount` at constant density when given. */
  build: (rng: Rng, targetCount?: number) => { particles: Particle[]; linearScale: number };
  cameraDistance: number;
  particleRadius: number;
  colorMode: ColorMode;
  /** Draws particles ∛(mass) times the radius while the scenario runs (until the user changes it). */
  sizeByMass: boolean;
  /** Glow and depth fog while the scenario runs, 0 (off) to 1 (until the user changes them). */
  glow: number;
  fog: number;
  /** Shows the force field when the scenario starts (until a scenario without one). */
  field: ScenarioField | undefined;
  /** Scripted events in time order (v1's actions); empty for unscripted scenarios. */
  timeline: TimelineEvent[];
}
