import { readForce } from './forces/readForce';
import type { ForceDefinition } from './forces/types';
import { JsonReader } from './json';
import type { Particle, ParticleKind } from './particles';
import { readSettings, type SimulationSettings } from './settings';

export const SNAPSHOT_FORMAT = 'particle.js-v2/snapshot';
export const SNAPSHOT_VERSION = 2;

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: number;
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
    spin: json.finite(o.spin, `${path}.spin`),
    parity: json.finite(o.parity, `${path}.parity`),
    // Version 1 predates nuclear charge; those particles had none.
    nuclearCharge: version === 1 ? 0 : json.finite(o.nuclearCharge, `${path}.nuclearCharge`),
    color: json.vec3(o.color, `${path}.color`),
  };
}

export function parseSnapshot(text: string): Snapshot {
  return readSnapshot(json.parse(text));
}

/** Validates an already-parsed JSON value. */
export function readSnapshot(value: unknown): Snapshot {
  const o = json.object(value, '$');
  if (o.format !== SNAPSHOT_FORMAT) json.fail('format', `expected '${SNAPSHOT_FORMAT}', got ${JSON.stringify(o.format)}`);
  const version = json.oneOf(o.version, [1, SNAPSHOT_VERSION] as const, 'version');
  return createSnapshot(
    json.string(o.name, 'name'),
    json.finite(o.time, 'time'),
    readSettings(json, o.settings, 'settings'),
    json.array(o.forces, 'forces').map((f, k) => readForce(json, f, `forces[${k}]`, true)),
    json.array(o.particles, 'particles').map((p, k) => parseParticle(p, k, version)),
  );
}
