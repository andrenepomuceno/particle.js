import { migrateScalarSpin } from './forces/migrate';
import { readForce } from './forces/readForce';
import type { ForceDefinition } from './forces/types';
import { JsonReader } from './json';
import type { Particle, ParticleKind } from './particles';
import { readSettings, type SimulationSettings } from './settings';

export const SNAPSHOT_FORMAT = 'particle.js-v2/snapshot';
export const SNAPSHOT_VERSION = 4;

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

const json = new JsonReader('snapshot');

function parseParticle(value: unknown, index: number, version: number): Particle {
  const path = `particles[${index}]`;
  const o = json.object(value, path);
  return {
    kind: json.oneOf(o.kind, [1, 2] as const, `${path}.kind`) as ParticleKind,
    position: json.vec3(o.position, `${path}.position`),
    velocity: json.vec3(o.velocity, `${path}.velocity`),
    time: json.finite(o.time, `${path}.time`),
    mass: json.finite(o.mass, `${path}.mass`),
    charge: json.finite(o.charge, `${path}.charge`),
    // Versions 1-3 had a scalar spin (now the z component) and no second charge or isospin.
    charge2: version < 4 ? 0 : json.finite(o.charge2, `${path}.charge2`),
    spin: version < 4 ? [0, 0, json.finite(o.spin, `${path}.spin`)] : json.vec3(o.spin, `${path}.spin`),
    isospin: version < 4 ? 0 : json.finite(o.isospin, `${path}.isospin`),
    parity: json.finite(o.parity, `${path}.parity`),
    // Version 1 predates nuclear charge; those particles had none.
    nuclearCharge: version === 1 ? 0 : json.finite(o.nuclearCharge, `${path}.nuclearCharge`),
    color: json.vec3(o.color, `${path}.color`),
  };
}

const migrateForce = (force: unknown, version: number) => (version >= 4 ? force : migrateScalarSpin(force));

// Versions 1 and 2 predate the integrator choice and always ran semi-implicit Euler.
function migrateSettings(settings: unknown, version: number): unknown {
  if (version >= 3 || typeof settings !== 'object' || settings === null) return settings;
  return { integrator: 'euler', ...settings };
}

export function parseSnapshot(text: string): Snapshot {
  return readSnapshot(json.parse(text));
}

/** Validates an already-parsed JSON value. */
export function readSnapshot(value: unknown): Snapshot {
  const o = json.object(value, '$');
  if (o.format !== SNAPSHOT_FORMAT) json.fail('format', `expected '${SNAPSHOT_FORMAT}', got ${JSON.stringify(o.format)}`);
  const version = json.oneOf(o.version, [1, 2, 3, SNAPSHOT_VERSION] as const, 'version');
  return createSnapshot(
    json.string(o.name, 'name'),
    json.finite(o.time, 'time'),
    readSettings(json, migrateSettings(o.settings, version), 'settings'),
    json.array(o.forces, 'forces').map((f, k) => readForce(json, migrateForce(f, version), `forces[${k}]`, true)),
    json.array(o.particles, 'particles').map((p, k) => parseParticle(p, k, version)),
  );
}
