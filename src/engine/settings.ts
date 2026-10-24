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
