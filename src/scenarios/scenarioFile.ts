import { newForceId } from '../engine/forces/presets';
import { migrateScalarSpin } from '../engine/forces/migrate';
import { readForce } from '../engine/forces/readForce';
import { SPECIES, SPECIES_IDS, type SpeciesId } from '../engine/species';
import { add, cross } from '../engine/vec3';
import { scaleGroups } from './scaling';
import type { ForceDefinition } from '../engine/forces/types';
import { JsonReader } from '../engine/json';
import { ParticleKind, type Particle, type Vec3 } from '../engine/particles';
import { inDisk, inSphere, onSphere, pick, uniform, type Rng } from '../engine/random';
import { COLOR_MODES } from '../engine/render/ParticlePoints';
import { DEFAULT_SETTINGS, readSettings } from '../engine/settings';
import type { Scenario } from './types';

export const SCENARIO_FORMAT = 'particle.js-v2/scenario';
export const SCENARIO_VERSION = 2;

/** A number or vector that is either fixed or drawn per particle. */
export type Sampled<T> = T | { min: number; max: number } | { choice: T[] } | { cycle: T[] };

export type Shape =
  | { type: 'point'; center: Vec3 }
  | { type: 'sphere'; radius: number; center: Vec3 }
  | { type: 'shell'; radius: number; center: Vec3 }
  | { type: 'disk'; radius: number; innerRadius: number; thickness: number; center: Vec3 }
  | { type: 'box'; size: Vec3; center: Vec3 }
  | { type: 'grid'; spacing: number; columns: number; rows: number; layers: number; center: Vec3 };

export type VelocitySpec =
  | { type: 'still' }
  | { type: 'constant'; value: Vec3 }
  | { type: 'random'; speed: Sampled<number> }
  | { type: 'orbit'; centralMass: number; G: number; center: Vec3 };

export interface ParticleGroup {
  count: number;
  /** False pins the count when the user changes the particle total (e.g. a galaxy core). */
  scale: boolean;
  /**
   * Every `size` consecutive particles share one center drawn from the shape and sit evenly
   * spaced on a circle of `radius` around it, randomly rotated (a triplet is an equilateral
   * triangle), so bound groups start near equilibrium instead of overlapping.
   */
  cluster: { size: number; radius: number } | undefined;
  kind: 'dynamic' | 'fixed';
  shape: Shape;
  velocity: VelocitySpec;
  /** Fills mass, charge, isospin and nuclear charge per particle; explicit keys win. */
  species: Sampled<SpeciesId> | undefined;
  mass: Sampled<number> | undefined;
  charge: Sampled<number> | undefined;
  charge2: Sampled<number>;
  /** A number is the z component (the scalar spin of earlier versions). */
  spin: Sampled<number | Vec3>;
  isospin: Sampled<number> | undefined;
  parity: Sampled<number>;
  nuclearCharge: Sampled<number> | undefined;
  color: Sampled<Vec3>;
}

const ORIGIN: Vec3 = [0, 0, 0];
const TOP_KEYS = ['$schema', 'format', 'version', 'id', 'name', 'folder', 'description', 'seed', 'view', 'settings', 'forces', 'groups'] as const;
const GROUP_KEYS = ['count', 'scale', 'cluster', 'kind', 'shape', 'velocity', 'species', 'mass', 'charge', 'charge2', 'spin', 'isospin', 'parity', 'nuclearCharge', 'color'] as const;

class ScenarioReader extends JsonReader {
  sampledNumber(value: unknown, path: string): Sampled<number> {
    if (typeof value === 'number') return this.finite(value, path);
    const o = this.object(value, path);
    if ('min' in o || 'max' in o) {
      this.onlyKeys(o, ['min', 'max'], path);
      const min = this.finite(o.min, `${path}.min`);
      const max = this.finite(o.max, `${path}.max`);
      if (min > max) this.fail(path, `min ${min} is greater than max ${max}`);
      return { min, max };
    }
    return this.listSpec(o, path, (v, p) => this.finite(v, p));
  }

  sampledSpin(value: unknown, path: string): Sampled<number | Vec3> {
    if (typeof value === 'number') return this.finite(value, path);
    if (Array.isArray(value)) return this.vec3(value, path);
    const o = this.object(value, path);
    if ('min' in o || 'max' in o) return this.sampledNumber(value, path);
    return this.listSpec(o, path, (v, p) => (Array.isArray(v) ? this.vec3(v, p) : this.finite(v, p)));
  }

  sampledSpecies(value: unknown, path: string): Sampled<SpeciesId> {
    if (typeof value === 'string') return this.oneOf(value, SPECIES_IDS, path);
    return this.listSpec(this.object(value, path), path, (v, p) => this.oneOf(v, SPECIES_IDS, p), 'a species id, {choice: [...]} or {cycle: [...]}');
  }

  sampledVec3(value: unknown, path: string): Sampled<Vec3> {
    if (Array.isArray(value)) return this.vec3(value, path);
    return this.listSpec(this.object(value, path), path, (v, p) => this.vec3(v, p));
  }

  listSpec<T>(
    o: Record<string, unknown>, path: string, item: (v: unknown, p: string) => T,
    forms = 'a value, {min, max}, {choice: [...]} or {cycle: [...]}',
  ): { choice: T[] } | { cycle: T[] } {
    const key = 'choice' in o ? 'choice' : 'cycle' in o ? 'cycle' : undefined;
    if (!key) this.fail(path, `expected ${forms}`);
    this.onlyKeys(o, [key], path);
    const items = this.array(o[key], `${path}.${key}`).map((v, k) => item(v, `${path}.${key}[${k}]`));
    if (items.length === 0) this.fail(`${path}.${key}`, 'must not be empty');
    return key === 'choice' ? { choice: items } : { cycle: items };
  }

  positive(value: unknown, path: string): number {
    const n = this.finite(value, path);
    if (!(n > 0)) this.fail(path, `must be > 0, got ${n}`);
    return n;
  }

  count(value: unknown, path: string): number {
    const n = this.finite(value, path);
    if (!Number.isInteger(n) || n < 1) this.fail(path, `must be an integer >= 1, got ${n}`);
    return n;
  }

  shape(value: unknown, path: string): Shape {
    const o = this.object(value, path);
    const type = this.oneOf(o.type, ['point', 'sphere', 'shell', 'disk', 'box', 'grid'] as const, `${path}.type`);
    const center = o.center === undefined ? ORIGIN : this.vec3(o.center, `${path}.center`);
    switch (type) {
      case 'point':
        this.onlyKeys(o, ['type', 'center'], path);
        return { type, center };
      case 'sphere':
      case 'shell':
        this.onlyKeys(o, ['type', 'center', 'radius'], path);
        return { type, center, radius: this.positive(o.radius, `${path}.radius`) };
      case 'disk': {
        this.onlyKeys(o, ['type', 'center', 'radius', 'innerRadius', 'thickness'], path);
        const radius = this.positive(o.radius, `${path}.radius`);
        const innerRadius = o.innerRadius === undefined ? 0 : this.finite(o.innerRadius, `${path}.innerRadius`);
        if (innerRadius < 0 || innerRadius >= radius) this.fail(`${path}.innerRadius`, `must be within [0, radius=${radius}), got ${innerRadius}`);
        const thickness = o.thickness === undefined ? 0 : this.finite(o.thickness, `${path}.thickness`);
        if (thickness < 0) this.fail(`${path}.thickness`, `must be >= 0, got ${thickness}`);
        return { type, center, radius, innerRadius, thickness };
      }
      case 'box': {
        this.onlyKeys(o, ['type', 'center', 'size'], path);
        const size = this.vec3(o.size, `${path}.size`);
        if (size.some((s) => s < 0)) this.fail(`${path}.size`, `components must be >= 0, got ${JSON.stringify(size)}`);
        return { type, center, size };
      }
      case 'grid':
        this.onlyKeys(o, ['type', 'center', 'spacing', 'columns', 'rows', 'layers'], path);
        return {
          type, center,
          spacing: this.positive(o.spacing, `${path}.spacing`),
          columns: this.count(o.columns, `${path}.columns`),
          rows: this.count(o.rows, `${path}.rows`),
          layers: o.layers === undefined ? 1 : this.count(o.layers, `${path}.layers`),
        };
    }
  }

  cluster(value: unknown, path: string): { size: number; radius: number } {
    const o = this.object(value, path);
    this.onlyKeys(o, ['size', 'radius'], path);
    return { size: this.count(o.size, `${path}.size`), radius: this.positive(o.radius, `${path}.radius`) };
  }

  velocity(value: unknown, path: string): VelocitySpec {
    if (value === undefined) return { type: 'still' };
    const o = this.object(value, path);
    const type = this.oneOf(o.type, ['still', 'constant', 'random', 'orbit'] as const, `${path}.type`);
    switch (type) {
      case 'still':
        this.onlyKeys(o, ['type'], path);
        return { type };
      case 'constant':
        this.onlyKeys(o, ['type', 'value'], path);
        return { type, value: this.vec3(o.value, `${path}.value`) };
      case 'random':
        this.onlyKeys(o, ['type', 'speed'], path);
        return { type, speed: this.sampledNumber(o.speed, `${path}.speed`) };
      case 'orbit':
        this.onlyKeys(o, ['type', 'centralMass', 'G', 'center'], path);
        return {
          type,
          centralMass: this.positive(o.centralMass, `${path}.centralMass`),
          G: this.positive(o.G, `${path}.G`),
          center: o.center === undefined ? ORIGIN : this.vec3(o.center, `${path}.center`),
        };
    }
  }

  group(value: unknown, path: string): ParticleGroup {
    const o = this.object(value, path);
    this.onlyKeys(o, GROUP_KEYS, path);
    const optionalNumber = (key: string, fallback: number) =>
      o[key] === undefined ? fallback : this.sampledNumber(o[key], `${path}.${key}`);
    const group: ParticleGroup = {
      count: this.count(o.count, `${path}.count`),
      scale: o.scale === undefined ? true : this.boolean(o.scale, `${path}.scale`),
      cluster: o.cluster === undefined ? undefined : this.cluster(o.cluster, `${path}.cluster`),
      kind: o.kind === undefined ? 'dynamic' : this.oneOf(o.kind, ['dynamic', 'fixed'] as const, `${path}.kind`),
      shape: this.shape(o.shape, `${path}.shape`),
      velocity: this.velocity(o.velocity, `${path}.velocity`),
      species: o.species === undefined ? undefined : this.sampledSpecies(o.species, `${path}.species`),
      mass: o.mass === undefined ? undefined : this.sampledNumber(o.mass, `${path}.mass`),
      charge: o.charge === undefined ? undefined : this.sampledNumber(o.charge, `${path}.charge`),
      charge2: optionalNumber('charge2', 0),
      spin: o.spin === undefined ? 0 : this.sampledSpin(o.spin, `${path}.spin`),
      isospin: o.isospin === undefined ? undefined : this.sampledNumber(o.isospin, `${path}.isospin`),
      parity: optionalNumber('parity', 1),
      nuclearCharge: o.nuclearCharge === undefined ? undefined : this.sampledNumber(o.nuclearCharge, `${path}.nuclearCharge`),
      color: o.color === undefined ? ORIGIN : this.sampledVec3(o.color, `${path}.color`),
    };
    const clusterSize = group.cluster?.size ?? 1;
    if (group.count % clusterSize !== 0) {
      this.fail(`${path}.count`, `${group.count} is not a multiple of cluster.size ${clusterSize}`);
    }
    if (group.shape.type === 'grid') {
      const { columns, rows, layers } = group.shape;
      const centers = group.count / clusterSize;
      if (centers > columns * rows * layers) {
        this.fail(`${path}.count`, `${centers} grid sites needed, a ${columns}×${rows}×${layers} grid has ${columns * rows * layers}`);
      }
    }
    const masses = group.mass === undefined ? [] : typeof group.mass === 'number' ? [group.mass]
      : 'min' in group.mass ? [group.mass.min] : 'choice' in group.mass ? group.mass.choice : group.mass.cycle;
    if (masses.some((m) => !(m > 0))) this.fail(`${path}.mass`, `every possible mass must be > 0, got ${JSON.stringify(group.mass)}`);
    return group;
  }
}

function sample<T extends number | string | Vec3>(spec: Sampled<T>, rng: Rng, index: number): T {
  if (typeof spec !== 'object' || Array.isArray(spec)) return spec as T;
  const drawn = spec as { min: number; max: number } | { choice: T[] } | { cycle: T[] };
  if ('min' in drawn) return uniform(rng, drawn.min, drawn.max) as T;
  if ('choice' in drawn) return pick(rng, drawn.choice);
  return drawn.cycle[index % drawn.cycle.length]!;
}


function samplePosition(shape: Shape, rng: Rng, index: number): Vec3 {
  switch (shape.type) {
    case 'point':
      return shape.center;
    case 'sphere':
      return add(shape.center, inSphere(rng, shape.radius));
    case 'shell':
      return add(shape.center, onSphere(rng).map((c) => c * shape.radius) as Vec3);
    case 'disk': {
      const r = Math.sqrt(uniform(rng, shape.innerRadius ** 2, shape.radius ** 2));
      const phi = uniform(rng, 0, 2 * Math.PI);
      return add(shape.center, [r * Math.cos(phi), r * Math.sin(phi), uniform(rng, -shape.thickness / 2, shape.thickness / 2)]);
    }
    case 'box':
      return add(shape.center, shape.size.map((s) => uniform(rng, -s / 2, s / 2)) as Vec3);
    case 'grid': {
      const column = index % shape.columns;
      const row = Math.floor(index / shape.columns) % shape.rows;
      const layer = Math.floor(index / (shape.columns * shape.rows)) % shape.layers;
      const offset = (n: number, k: number) => (k - (n - 1) / 2) * shape.spacing;
      return add(shape.center, [offset(shape.columns, column), offset(shape.rows, row), offset(shape.layers, layer)]);
    }
  }
}

function sampleVelocity(spec: VelocitySpec, position: Vec3, rng: Rng, mode2D: boolean): Vec3 {
  switch (spec.type) {
    case 'still':
      return [0, 0, 0];
    case 'constant':
      return spec.value;
    case 'random': {
      const speed = sample(spec.speed, rng, 0);
      const direction = mode2D ? inDisk(rng, 1) : onSphere(rng);
      const length = Math.hypot(...direction) || 1;
      return direction.map((c) => (c / length) * speed) as Vec3;
    }
    case 'orbit': {
      const dx = position[0] - spec.center[0];
      const dy = position[1] - spec.center[1];
      const r = Math.hypot(dx, dy);
      if (r === 0) return [0, 0, 0];
      const speed = Math.sqrt((spec.G * spec.centralMass) / r);
      return [(-dy / r) * speed, (dx / r) * speed, 0];
    }
  }
}

/** Two orthonormal vectors spanning a uniformly random plane through the origin. */
function randomPlane(rng: Rng): [Vec3, Vec3] {
  const normal = onSphere(rng);
  const helper: Vec3 = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(normal, helper);
  const length = Math.hypot(...u);
  const first = u.map((c) => c / length) as Vec3;
  return [first, cross(normal, first)];
}

const asSpinVector = (spin: number | Vec3): Vec3 => (typeof spin === 'number' ? [0, 0, spin] : [...spin]);

/** Species defaults, then explicit keys; mass 1 and zero charges when neither is given. */
function speciesAttributes(group: ParticleGroup, rng: Rng, index: number) {
  const species = group.species === undefined ? undefined : SPECIES[sample(group.species, rng, index)];
  const pick = (spec: Sampled<number> | undefined, fallback: number) => (spec === undefined ? fallback : sample(spec, rng, index));
  return {
    mass: pick(group.mass, species?.mass ?? 1),
    charge: pick(group.charge, species?.charge ?? 0),
    isospin: pick(group.isospin, species?.isospin ?? 0),
    nuclearCharge: pick(group.nuclearCharge, species?.nuclearCharge ?? 0),
  };
}

export function buildParticles(groups: readonly ParticleGroup[], rng: Rng, mode2D: boolean): Particle[] {
  return groups.flatMap((group) => {
    let center: Vec3 = [0, 0, 0];
    let axes: [Vec3, Vec3] = [[1, 0, 0], [0, 1, 0]];
    let phase = 0;
    let clusterVelocity: Vec3 = [0, 0, 0];
    return Array.from({ length: group.count }, (_, index): Particle => {
      let sampled: Vec3;
      if (group.cluster) {
        const { size, radius } = group.cluster;
        const member = index % size;
        if (member === 0) {
          center = samplePosition(group.shape, rng, index / size);
          axes = mode2D ? [[1, 0, 0], [0, 1, 0]] : randomPlane(rng);
          phase = uniform(rng, 0, 2 * Math.PI);
          // The whole cluster moves together; per-member velocities would tear it apart.
          clusterVelocity = sampleVelocity(group.velocity, mode2D ? [center[0], center[1], 0] : center, rng, mode2D);
        }
        const angle = phase + (2 * Math.PI * member) / size;
        const ring = size === 1 ? 0 : radius;
        sampled = add(center, [0, 1, 2].map((k) => ring * (Math.cos(angle) * axes[0][k]! + Math.sin(angle) * axes[1][k]!)) as Vec3);
      } else {
        sampled = samplePosition(group.shape, rng, index);
      }
      const position: Vec3 = mode2D ? [sampled[0], sampled[1], 0] : sampled;
      return {
        kind: group.kind === 'fixed' ? ParticleKind.fixed : ParticleKind.dynamic,
        position,
        velocity: group.kind === 'fixed' ? [0, 0, 0] : group.cluster ? [...clusterVelocity] : sampleVelocity(group.velocity, position, rng, mode2D),
        time: 0,
        ...speciesAttributes(group, rng, index),
        charge2: sample(group.charge2, rng, index),
        spin: asSpinVector(sample(group.spin, rng, index)),
        parity: sample(group.parity, rng, index),
        color: [...sample(group.color, rng, index)],
      };
    });
  });
}

/** Parses a scenario file into the runtime Scenario; `source` names the file in error messages. */
export function parseScenario(text: string, source: string): Scenario {
  return readScenario(new ScenarioReader(`scenario ${source}`).parse(text), source);
}

/** Validates an already-parsed JSON value; `source` names the file in error messages. */
export function readScenario(value: unknown, source: string): Scenario {
  const json = new ScenarioReader(`scenario ${source}`);
  const o = json.object(value, '$');
  json.onlyKeys(o, TOP_KEYS, '$');
  if (o.format !== SCENARIO_FORMAT) json.fail('format', `expected '${SCENARIO_FORMAT}', got ${JSON.stringify(o.format)}`);
  // Version 1 had scalar spin variables in expressions; they are migrated like snapshot forces.
  const version = json.oneOf(o.version, [1, SCENARIO_VERSION] as const, 'version');

  const view = o.view === undefined ? {} : json.object(o.view, 'view');
  json.onlyKeys(view, ['cameraDistance', 'particleRadius', 'colorMode'], 'view');
  const settings = o.settings === undefined ? { ...DEFAULT_SETTINGS } : readSettings(json, o.settings, 'settings', { ...DEFAULT_SETTINGS });
  const forceSpecs = o.forces === undefined ? [] : json.array(o.forces, 'forces');
  const forces = forceSpecs.map((f, k) => readForce(json, version === 1 ? migrateScalarSpin(f) : f, `forces[${k}]`, false));
  const groups = (o.groups === undefined ? [] : json.array(o.groups, 'groups')).map((g, k) => json.group(g, `groups[${k}]`));
  const seed = o.seed === undefined ? 1 : json.finite(o.seed, 'seed');
  if (!Number.isInteger(seed) || seed < 0) json.fail('seed', `must be an integer >= 0, got ${seed}`);

  return {
    id: json.string(o.id, 'id'),
    name: json.string(o.name, 'name'),
    folder: o.folder === undefined ? 'Custom' : json.string(o.folder, 'folder'),
    description: o.description === undefined ? '' : json.string(o.description, 'description'),
    seed,
    settings,
    forces: (): ForceDefinition[] => forces.map((f) => ({ ...f, id: newForceId(), params: f.params.map((p) => ({ ...p })) })),
    defaultCount: groups.reduce((sum, g) => sum + g.count, 0),
    build: (rng, targetCount) => {
      const scaled = scaleGroups(groups, targetCount, settings.mode2D);
      return { particles: buildParticles(scaled.groups, rng, settings.mode2D), linearScale: scaled.linearScale };
    },
    cameraDistance: view.cameraDistance === undefined ? 1000 : json.positive(view.cameraDistance, 'view.cameraDistance'),
    particleRadius: view.particleRadius === undefined ? 3 : json.positive(view.particleRadius, 'view.particleRadius'),
    colorMode: view.colorMode === undefined ? 'charge' : json.oneOf(view.colorMode, COLOR_MODES, 'view.colorMode'),
  };
}
