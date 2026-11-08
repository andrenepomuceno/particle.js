import { readProbe, validateColumns, type FieldProbe } from '../engine/field';
import { JsonReader } from '../engine/json';
import type { Vec3 } from '../engine/particles';
import type { RadialBackground } from '../engine/render/background';
import { COLOR_MODES, fractionProblem, PARTICLE_STYLES, type ColorMode, type ParticleStyle } from '../engine/render/ParticlePoints';
import type { SimulationController } from './SimulationController';

/**
 * How a recording looks, whatever the browser remembered (scripts/record.mjs --display). Every key is
 * optional: unset ones keep the scenario's view, except `axes`, which recordings leave off unless asked.
 */
export interface DisplayOptions {
  particleStyle?: ParticleStyle;
  colorMode?: ColorMode;
  particleRadius?: number;
  /** Each particle ∛(mass) times the radius; unset keeps the scenario's. */
  sizeByMass?: boolean;
  /** Soft halo behind each particle and darkening with depth, both 0 (off) to 1. */
  glow?: number;
  fog?: number;
  /** `#rrggbb`, or `{ center, edge }` for a radial gradient; the app's is black. */
  background?: string | RadialBackground;
  axes?: boolean;
  boundary?: boolean;
  /** `probe` holds only the fields given; the others keep the scenario's test particle. */
  field?: { enabled: boolean; columns?: number; logScale?: boolean; lockScale?: boolean; probe?: Partial<FieldProbe> };
  /** Inspect this particle and draw its trail, or follow it with the camera (both name the same particle). */
  trail?: { particle: number };
  follow?: { particle: number };
  /** Initial camera; a timeline move at t = 0 starts from it. */
  camera?: { position: Vec3; target: Vec3 };
}

const KEYS = ['particleStyle', 'colorMode', 'particleRadius', 'sizeByMass', 'glow', 'fog', 'background', 'axes', 'boundary', 'field', 'trail', 'follow', 'camera'] as const;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function hexColor(json: JsonReader, value: unknown, path: string): string {
  const color = json.string(value, path);
  if (!HEX_COLOR.test(color)) json.fail(path, `expected a #rrggbb colour, got ${JSON.stringify(color)}`);
  return color;
}

function background(json: JsonReader, value: unknown): string | RadialBackground {
  if (typeof value === 'string') return hexColor(json, value, 'background');
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    json.fail('background', `expected a #rrggbb colour or { "center", "edge" }, got ${JSON.stringify(value)}`);
  }
  const o = json.object(value, 'background');
  json.onlyKeys(o, ['center', 'edge'], 'background');
  return { center: hexColor(json, o.center, 'background.center'), edge: hexColor(json, o.edge, 'background.edge') };
}

function particleIndex(json: JsonReader, value: unknown, path: string): { particle: number } {
  const o = json.object(value, path);
  json.onlyKeys(o, ['particle'], path);
  const particle = json.finite(o.particle, `${path}.particle`);
  if (!(Number.isInteger(particle) && particle >= 0)) json.fail(`${path}.particle`, `must be a particle index (an integer >= 0), got ${particle}`);
  return { particle };
}

/** Validates display options from JSON, naming the offending path. */
export function readDisplayOptions(value: unknown, source = 'display options'): DisplayOptions {
  const json = new JsonReader(source);
  const o = json.object(value, '$');
  json.onlyKeys(o, KEYS, '$');
  const options: DisplayOptions = {};
  if (o.particleStyle !== undefined) options.particleStyle = json.oneOf(o.particleStyle, PARTICLE_STYLES, 'particleStyle');
  if (o.colorMode !== undefined) options.colorMode = json.oneOf(o.colorMode, COLOR_MODES, 'colorMode');
  if (o.particleRadius !== undefined) {
    options.particleRadius = json.finite(o.particleRadius, 'particleRadius');
    if (!(options.particleRadius > 0)) json.fail('particleRadius', `must be > 0, got ${options.particleRadius}`);
  }
  if (o.sizeByMass !== undefined) options.sizeByMass = json.boolean(o.sizeByMass, 'sizeByMass');
  for (const key of ['glow', 'fog'] as const) {
    if (o[key] === undefined) continue;
    const amount = json.finite(o[key], key);
    const problem = fractionProblem(amount);
    if (problem) json.fail(key, problem);
    options[key] = amount;
  }
  if (o.background !== undefined) options.background = background(json, o.background);
  if (o.axes !== undefined) options.axes = json.boolean(o.axes, 'axes');
  if (o.boundary !== undefined) options.boundary = json.boolean(o.boundary, 'boundary');
  if (o.field !== undefined) {
    const f = json.object(o.field, 'field');
    json.onlyKeys(f, ['enabled', 'columns', 'logScale', 'lockScale', 'probe'], 'field');
    const field: NonNullable<DisplayOptions['field']> = { enabled: json.boolean(f.enabled, 'field.enabled') };
    if (f.columns !== undefined) {
      field.columns = json.finite(f.columns, 'field.columns');
      const problem = validateColumns(field.columns);
      if (problem) json.fail('field.columns', problem);
    }
    if (f.logScale !== undefined) field.logScale = json.boolean(f.logScale, 'field.logScale');
    if (f.lockScale !== undefined) field.lockScale = json.boolean(f.lockScale, 'field.lockScale');
    if (f.probe !== undefined) {
      const probe = readProbe(json, f.probe, 'field.probe');
      const given = Object.keys(json.object(f.probe, 'field.probe')) as (keyof FieldProbe)[];
      field.probe = Object.fromEntries(given.map((key) => [key, probe[key]]));
    }
    options.field = field;
  }
  if (o.trail !== undefined) options.trail = particleIndex(json, o.trail, 'trail');
  if (o.follow !== undefined) options.follow = particleIndex(json, o.follow, 'follow');
  // The app inspects one particle at a time: its trail and the followed particle are the same one.
  if (options.trail && options.follow && options.trail.particle !== options.follow.particle) {
    json.fail('trail.particle', `must be the followed particle (follow.particle = ${options.follow.particle}), got ${options.trail.particle}`);
  }
  if (o.camera !== undefined) {
    const c = json.object(o.camera, 'camera');
    json.onlyKeys(c, ['position', 'target'], 'camera');
    options.camera = { position: json.vec3(c.position, 'camera.position'), target: json.vec3(c.target, 'camera.target') };
  }
  return options;
}

/** Applies display options to a loaded world: the look first, then the camera, then what depends on it. */
export function applyDisplayOptions(controller: SimulationController, options: DisplayOptions): void {
  const { state } = controller;
  if (options.particleStyle !== undefined) controller.setParticleStyle(options.particleStyle);
  if (options.colorMode !== undefined) controller.setColorMode(options.colorMode);
  if (options.particleRadius !== undefined) controller.setParticleRadius(options.particleRadius);
  if (options.sizeByMass !== undefined) controller.setSizeByMass(options.sizeByMass);
  if (options.glow !== undefined) controller.setGlow(options.glow);
  if (options.fog !== undefined) controller.setFog(options.fog);
  if (options.background !== undefined) controller.setBackground(options.background);
  if ((options.axes ?? false) !== state.showAxes) controller.toggleAxes();
  if (options.boundary !== undefined && options.boundary !== controller.state.showBoundary) controller.toggleBoundary();
  if (options.camera) controller.setCamera(options.camera.position, options.camera.target);
  const inspected = options.follow?.particle ?? options.trail?.particle;
  if (inspected !== undefined) controller.inspect(inspected);
  if (options.follow && !controller.state.followInspected) controller.toggleFollow();
  if (options.trail && !controller.state.showTrail) controller.toggleTrail();
  if (options.field) controller.setField({ ...options.field, probe: { ...controller.state.field.probe, ...options.field.probe } });
}
