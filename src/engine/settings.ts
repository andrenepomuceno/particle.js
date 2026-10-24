import type { JsonReader } from './json';

export type BoundaryShape = 'none' | 'sphere' | 'box';
export const INTEGRATORS = ['verlet', 'euler'] as const;
export type Integrator = (typeof INTEGRATORS)[number];

export interface SimulationSettings {
  timeStep: number;
  /** Linear drag coefficient: v *= exp(-friction * dt). */
  friction: number;
  /** v1's quadratic, mass-scaled drag: v /= 1 + quadraticDrag·dt·|v|/m; 0 disables it. */
  quadraticDrag: number;
  /** Numerical speed clamp; 0 disables it. Not a relativistic limit. */
  maxSpeed: number;
  boundary: BoundaryShape;
  /** Sphere radius or box half-size. */
  boundarySize: number;
  /** Box half-size along z (a slab when smaller than boundarySize); 0 = boundarySize. */
  boundaryDepth: number;
  /** Fraction of the normal velocity kept after bouncing off the boundary. */
  restitution: number;
  /** Pairs closer than this collide (v1's minimum distance); 0 disables collisions. */
  collisionDistance: number;
  /** 1 = elastic, 0 = perfectly inelastic; applied along the line of centers. */
  collisionRestitution: number;
  mode2D: boolean;
  /** Velocity Verlet (2nd order, time-reversible) or semi-implicit Euler (1st order). */
  integrator: Integrator;
}

export const DEFAULT_SETTINGS: Readonly<SimulationSettings> = {
  timeStep: 1,
  friction: 0,
  quadraticDrag: 0,
  maxSpeed: 0,
  boundary: 'none',
  boundarySize: 1000,
  boundaryDepth: 0,
  restitution: 1,
  collisionDistance: 0,
  collisionRestitution: 1,
  mode2D: false,
  integrator: 'verlet',
};

export function validateSettings(settings: SimulationSettings): string[] {
  const problems: string[] = [];
  const check = (ok: boolean, message: string) => ok || problems.push(message);
  check(Number.isFinite(settings.timeStep) && settings.timeStep > 0, `timeStep must be > 0, got ${settings.timeStep}`);
  check(Number.isFinite(settings.friction) && settings.friction >= 0, `friction must be >= 0, got ${settings.friction}`);
  check(Number.isFinite(settings.quadraticDrag) && settings.quadraticDrag >= 0, `quadraticDrag must be >= 0, got ${settings.quadraticDrag}`);
  check(Number.isFinite(settings.maxSpeed) && settings.maxSpeed >= 0, `maxSpeed must be >= 0, got ${settings.maxSpeed}`);
  check(['none', 'sphere', 'box'].includes(settings.boundary), `unknown boundary '${settings.boundary}'`);
  check(INTEGRATORS.includes(settings.integrator), `unknown integrator '${settings.integrator}'`);
  check(
    Number.isFinite(settings.boundarySize) && settings.boundarySize > 0,
    `boundarySize must be > 0, got ${settings.boundarySize}`,
  );
  check(Number.isFinite(settings.boundaryDepth) && settings.boundaryDepth >= 0, `boundaryDepth must be >= 0 (0 = boundarySize), got ${settings.boundaryDepth}`);
  check(settings.boundary === 'box' || settings.boundaryDepth === 0, `boundaryDepth applies to box boundaries only (boundary is '${settings.boundary}'), got ${settings.boundaryDepth}`);
  check(
    Number.isFinite(settings.restitution) && settings.restitution >= 0 && settings.restitution <= 1,
    `restitution must be within [0, 1], got ${settings.restitution}`,
  );
  check(
    Number.isFinite(settings.collisionDistance) && settings.collisionDistance >= 0,
    `collisionDistance must be >= 0, got ${settings.collisionDistance}`,
  );
  check(
    Number.isFinite(settings.collisionRestitution) && settings.collisionRestitution >= 0 && settings.collisionRestitution <= 1,
    `collisionRestitution must be within [0, 1], got ${settings.collisionRestitution}`,
  );
  return problems;
}

const SETTING_KEYS = ['timeStep', 'friction', 'quadraticDrag', 'maxSpeed', 'boundary', 'boundarySize', 'boundaryDepth', 'restitution', 'collisionDistance', 'collisionRestitution', 'mode2D', 'integrator'] as const;

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
    quadraticDrag: read('quadraticDrag', (v, p) => json.finite(v, p), base?.quadraticDrag),
    maxSpeed: read('maxSpeed', (v, p) => json.finite(v, p), base?.maxSpeed),
    boundary: read('boundary', (v, p) => json.oneOf(v, ['none', 'sphere', 'box'] as const, p), base?.boundary),
    boundarySize: read('boundarySize', (v, p) => json.finite(v, p), base?.boundarySize),
    boundaryDepth: read('boundaryDepth', (v, p) => json.finite(v, p), base?.boundaryDepth),
    restitution: read('restitution', (v, p) => json.finite(v, p), base?.restitution),
    collisionDistance: read('collisionDistance', (v, p) => json.finite(v, p), base?.collisionDistance),
    collisionRestitution: read('collisionRestitution', (v, p) => json.finite(v, p), base?.collisionRestitution),
    mode2D: read('mode2D', (v, p) => json.boolean(v, p), base?.mode2D),
    integrator: read('integrator', (v, p) => json.oneOf(v, INTEGRATORS, p), base?.integrator),
  };
  const problems = validateSettings(settings);
  if (problems.length > 0) json.fail(path, problems.join('; '));
  return settings;
}

/** Box half-sizes per axis: boundarySize in x and y, boundaryDepth (or boundarySize when 0) in z. */
export function boxHalfSize(settings: Pick<SimulationSettings, 'boundarySize' | 'boundaryDepth'>): [number, number, number] {
  const { boundarySize: size, boundaryDepth: depth } = settings;
  return [size, size, depth > 0 ? depth : size];
}

/**
 * Scenes that only extend in a plane: 2D mode, or a slab box (boundaryDepth set). Their particle
 * count scales in x and y only; a slab's thickness belongs to the physics (a few diameters), not to N.
 */
export function isPlanar(settings: Pick<SimulationSettings, 'mode2D' | 'boundary' | 'boundaryDepth'>): boolean {
  return settings.mode2D || (settings.boundary === 'box' && settings.boundaryDepth > 0);
}
