import { compileForce } from './forces/compile';
import type { ForceDefinition } from './forces/types';
import type { Particle, ParticleKind, Vec3 } from './particles';
import { validateSettings, type SimulationSettings } from './settings';

export const SNAPSHOT_FORMAT = 'particle.js-v2/snapshot';
export const SNAPSHOT_VERSION = 1;

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: typeof SNAPSHOT_VERSION;
  name: string;
  time: number;
  settings: SimulationSettings;
  forces: ForceDefinition[];
  particles: Particle[];
}

export function createSnapshot(
  name: string, time: number, settings: SimulationSettings, forces: ForceDefinition[], particles: Particle[],
): Snapshot {
  return { format: SNAPSHOT_FORMAT, version: SNAPSHOT_VERSION, name, time, settings, forces, particles };
}

class SnapshotError extends Error {
  constructor(path: string, message: string) {
    super(`invalid snapshot at '${path}': ${message}`);
    this.name = 'SnapshotError';
  }
}

type Json = unknown;

function object(value: Json, path: string): Record<string, Json> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new SnapshotError(path, 'expected an object');
  return value as Record<string, Json>;
}

function array(value: Json, path: string): Json[] {
  if (!Array.isArray(value)) throw new SnapshotError(path, 'expected an array');
  return value;
}

function finite(value: Json, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new SnapshotError(path, `expected a finite number, got ${JSON.stringify(value)}`);
  return value;
}

function string(value: Json, path: string): string {
  if (typeof value !== 'string') throw new SnapshotError(path, `expected a string, got ${JSON.stringify(value)}`);
  return value;
}

function oneOf<T extends string | number | boolean>(value: Json, options: readonly T[], path: string): T {
  if (!options.includes(value as T)) throw new SnapshotError(path, `expected one of ${options.join(', ')}, got ${JSON.stringify(value)}`);
  return value as T;
}

function vec3(value: Json, path: string): Vec3 {
  const items = array(value, path);
  if (items.length !== 3) throw new SnapshotError(path, `expected 3 components, got ${items.length}`);
  return [finite(items[0], `${path}[0]`), finite(items[1], `${path}[1]`), finite(items[2], `${path}[2]`)];
}

function parseSettings(value: Json): SimulationSettings {
  const o = object(value, 'settings');
  const settings: SimulationSettings = {
    timeStep: finite(o.timeStep, 'settings.timeStep'),
    friction: finite(o.friction, 'settings.friction'),
    maxSpeed: finite(o.maxSpeed, 'settings.maxSpeed'),
    boundary: oneOf(o.boundary, ['none', 'sphere', 'box'] as const, 'settings.boundary'),
    boundarySize: finite(o.boundarySize, 'settings.boundarySize'),
    restitution: finite(o.restitution, 'settings.restitution'),
    mode2D: oneOf(o.mode2D, [true, false], 'settings.mode2D'),
  };
  const problems = validateSettings(settings);
  if (problems.length > 0) throw new SnapshotError('settings', problems.join('; '));
  return settings;
}

function parseForce(value: Json, index: number): ForceDefinition {
  const path = `forces[${index}]`;
  const o = object(value, path);
  const force: ForceDefinition = {
    id: string(o.id, `${path}.id`),
    name: string(o.name, `${path}.name`),
    enabled: oneOf(o.enabled, [true, false], `${path}.enabled`),
    mode: oneOf(o.mode, ['force', 'potential'] as const, `${path}.mode`),
    expression: string(o.expression, `${path}.expression`),
    range: oneOf(o.range, ['long', 'short'] as const, `${path}.range`),
    cutoff: finite(o.cutoff, `${path}.cutoff`),
    softening: finite(o.softening, `${path}.softening`),
    params: array(o.params, `${path}.params`).map((p, k) => {
      const param = object(p, `${path}.params[${k}]`);
      return { name: string(param.name, `${path}.params[${k}].name`), value: finite(param.value, `${path}.params[${k}].value`) };
    }),
  };
  try {
    compileForce(force);
  } catch (error) {
    throw new SnapshotError(path, (error as Error).message);
  }
  return force;
}

function parseParticle(value: Json, index: number): Particle {
  const path = `particles[${index}]`;
  const o = object(value, path);
  return {
    kind: oneOf(o.kind, [1, 2] as const, `${path}.kind`) as ParticleKind,
    position: vec3(o.position, `${path}.position`),
    velocity: vec3(o.velocity, `${path}.velocity`),
    time: finite(o.time, `${path}.time`),
    mass: finite(o.mass, `${path}.mass`),
    charge: finite(o.charge, `${path}.charge`),
    spin: finite(o.spin, `${path}.spin`),
    parity: finite(o.parity, `${path}.parity`),
    color: vec3(o.color, `${path}.color`),
  };
}

export function parseSnapshot(text: string): Snapshot {
  let raw: Json;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new SnapshotError('$', `not valid JSON (${(error as Error).message})`);
  }
  const o = object(raw, '$');
  if (o.format !== SNAPSHOT_FORMAT) throw new SnapshotError('format', `expected '${SNAPSHOT_FORMAT}', got ${JSON.stringify(o.format)}`);
  if (o.version !== SNAPSHOT_VERSION) throw new SnapshotError('version', `unsupported version ${JSON.stringify(o.version)}, expected ${SNAPSHOT_VERSION}`);
  return createSnapshot(
    string(o.name, 'name'),
    finite(o.time, 'time'),
    parseSettings(o.settings),
    array(o.forces, 'forces').map(parseForce),
    array(o.particles, 'particles').map(parseParticle),
  );
}
