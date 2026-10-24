import type { JsonReader } from './json';

export type BoundaryShape = 'none' | 'sphere' | 'box';

export interface SimulationSettings {
  timeStep: number;
  /** Linear drag coefficient: v *= exp(-friction * dt). */
  friction: number;
  /** Numerical speed clamp; 0 disables it. Not a relativistic limit. */
  maxSpeed: number;
  boundary: BoundaryShape;
  /** Sphere radius or box half-size. */
  boundarySize: number;
  /** Fraction of the normal velocity kept after bouncing off the boundary. */
  restitution: number;
  mode2D: boolean;
}

export const DEFAULT_SETTINGS: Readonly<SimulationSettings> = {
  timeStep: 1,
  friction: 0,
  maxSpeed: 0,
  boundary: 'none',
  boundarySize: 1000,
  restitution: 1,
  mode2D: false,
};

export function validateSettings(settings: SimulationSettings): string[] {
  const problems: string[] = [];
  const check = (ok: boolean, message: string) => ok || problems.push(message);
  check(Number.isFinite(settings.timeStep) && settings.timeStep > 0, `timeStep must be > 0, got ${settings.timeStep}`);
  check(Number.isFinite(settings.friction) && settings.friction >= 0, `friction must be >= 0, got ${settings.friction}`);
  check(Number.isFinite(settings.maxSpeed) && settings.maxSpeed >= 0, `maxSpeed must be >= 0, got ${settings.maxSpeed}`);
  check(['none', 'sphere', 'box'].includes(settings.boundary), `unknown boundary '${settings.boundary}'`);
  check(
    Number.isFinite(settings.boundarySize) && settings.boundarySize > 0,
    `boundarySize must be > 0, got ${settings.boundarySize}`,
  );
  check(
    Number.isFinite(settings.restitution) && settings.restitution >= 0 && settings.restitution <= 1,
    `restitution must be within [0, 1], got ${settings.restitution}`,
  );
  return problems;
}

const SETTING_KEYS = ['timeStep', 'friction', 'maxSpeed', 'boundary', 'boundarySize', 'restitution', 'mode2D'] as const;

/** Reads settings from JSON; with `base`, missing keys keep the base value (scenario files). */
export function readSettings(json: JsonReader, value: unknown, path: string, base?: SimulationSettings): SimulationSettings {
  const o = json.object(value, path);
  json.onlyKeys(o, SETTING_KEYS, path);
  const read = <T>(key: (typeof SETTING_KEYS)[number], reader: (v: unknown, p: string) => T, fallback: T | undefined): T => {
    if (o[key] === undefined) {
      if (fallback === undefined) json.fail(`${path}.${key}`, 'is required');
      return fallback;
    }
    return reader(o[key], `${path}.${key}`);
  };
  const settings: SimulationSettings = {
    timeStep: read('timeStep', (v, p) => json.finite(v, p), base?.timeStep),
    friction: read('friction', (v, p) => json.finite(v, p), base?.friction),
    maxSpeed: read('maxSpeed', (v, p) => json.finite(v, p), base?.maxSpeed),
    boundary: read('boundary', (v, p) => json.oneOf(v, ['none', 'sphere', 'box'] as const, p), base?.boundary),
    boundarySize: read('boundarySize', (v, p) => json.finite(v, p), base?.boundarySize),
    restitution: read('restitution', (v, p) => json.finite(v, p), base?.restitution),
    mode2D: read('mode2D', (v, p) => json.boolean(v, p), base?.mode2D),
  };
  const problems = validateSettings(settings);
  if (problems.length > 0) json.fail(path, problems.join('; '));
  return settings;
}
