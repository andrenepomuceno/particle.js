import type { JsonReader } from '../engine/json';
import type { Vec3 } from '../engine/particles';
import type { ForceDefinition } from '../engine/forces/types';
import type { SimulationSettings } from '../engine/settings';

/** Settings a timeline may change: the numeric ones (mode, boundary shape and integrator stay fixed). */
export const TIMELINE_SETTINGS = [
  'timeStep', 'friction', 'quadraticDrag', 'maxSpeed', 'boundarySize', 'boundaryDepth', 'restitution', 'collisionDistance', 'collisionRestitution',
] as const;
export type TimelineSetting = (typeof TIMELINE_SETTINGS)[number];

/** `"<force name>.<param>"` or `"settings.<key>"`; the force name may itself contain dots. */
export type TimelineTarget = { kind: 'param'; force: string; param: string } | { kind: 'setting'; key: TimelineSetting };

export interface TimelineChange {
  path: string;
  target: TimelineTarget;
  /** `set` replaces the value, `multiply` scales the value current when the event fires. */
  op: 'set' | 'multiply';
  value: number;
}

export interface CameraMove {
  position: Vec3;
  target: Vec3;
  /** Wall-clock seconds of the transition; 0 jumps. */
  duration: number;
}

/** v1's addAction: fires once when simulation time reaches `at`. */
export interface TimelineEvent {
  at: number;
  changes: TimelineChange[];
  /** Replaces the caption overlay; "" clears it. `{path}` shows that value as it is after the changes. */
  caption: string | undefined;
  camera: CameraMove | undefined;
}

const EVENT_KEYS = ['at', 'set', 'caption', 'camera'];
const CAPTION_PATH = /\{([^{}]+)\}/g;

function parseTarget(path: string): TimelineTarget | undefined {
  const dot = path.lastIndexOf('.');
  if (dot <= 0 || dot === path.length - 1) return undefined;
  const head = path.slice(0, dot);
  const tail = path.slice(dot + 1);
  if (head === 'settings') return (TIMELINE_SETTINGS as readonly string[]).includes(tail) ? { kind: 'setting', key: tail as TimelineSetting } : undefined;
  return { kind: 'param', force: head, param: tail };
}

/** Validates a path against the scenario's forces: unknown forces or parameters fail at load time. */
function resolveTarget(json: JsonReader, path: string, at: string, forces: readonly ForceDefinition[]): TimelineTarget {
  const target = parseTarget(path);
  if (!target) {
    const reserved = path.startsWith('settings.') ? ` ('settings' is reserved for simulation settings, so a force cannot be named 'settings')` : '';
    json.fail(at, `expected '<force name>.<param>' or 'settings.<${TIMELINE_SETTINGS.join('|')}>', got '${path}'${reserved}`);
  }
  if (target.kind === 'param') {
    const force = forces.find((f) => f.name === target.force);
    if (!force) json.fail(at, `no force named '${target.force}' (have: ${forces.map((f) => f.name).join(', ') || 'none'})`);
    if (!force.params.some((p) => p.name === target.param)) {
      json.fail(at, `force '${target.force}' has no parameter '${target.param}' (have: ${force.params.map((p) => p.name).join(', ') || 'none'})`);
    }
  }
  return target;
}

export function readTimeline(json: JsonReader, value: unknown, forces: readonly ForceDefinition[]): TimelineEvent[] {
  let previous = -Infinity;
  return json.array(value, 'timeline').map((item, k) => {
    const path = `timeline[${k}]`;
    const o = json.object(item, path);
    json.onlyKeys(o, EVENT_KEYS, path);
    const at = json.finite(o.at, `${path}.at`);
    if (at < 0) json.fail(`${path}.at`, `must be >= 0, got ${at}`);
    if (at < previous) json.fail(`${path}.at`, `events must be in time order, got ${at} after ${previous}`);
    previous = at;

    const set = o.set === undefined ? {} : json.object(o.set, `${path}.set`);
    const changes = Object.entries(set).map(([key, spec]): TimelineChange => {
      const at = `${path}.set['${key}']`;
      const target = resolveTarget(json, key, at, forces);
      if (typeof spec === 'number') return { path: key, target, op: 'set', value: json.finite(spec, at) };
      const m = json.object(spec, at);
      json.onlyKeys(m, ['multiply'], at);
      return { path: key, target, op: 'multiply', value: json.finite(m.multiply, `${at}.multiply`) };
    });

    const caption = o.caption === undefined ? undefined : json.string(o.caption, `${path}.caption`);
    for (const [, key] of (caption ?? '').matchAll(CAPTION_PATH)) resolveTarget(json, key!, `${path}.caption`, forces);

    let camera: CameraMove | undefined;
    if (o.camera !== undefined) {
      const c = json.object(o.camera, `${path}.camera`);
      json.onlyKeys(c, ['position', 'target', 'duration'], `${path}.camera`);
      const duration = c.duration === undefined ? 0 : json.finite(c.duration, `${path}.camera.duration`);
      if (duration < 0) json.fail(`${path}.camera.duration`, `must be >= 0, got ${duration}`);
      camera = {
        position: json.vec3(c.position, `${path}.camera.position`),
        target: c.target === undefined ? [0, 0, 0] : json.vec3(c.target, `${path}.camera.target`),
        duration,
      };
    }
    if (changes.length === 0 && caption === undefined && camera === undefined) json.fail(path, 'event does nothing: give set, caption or camera');
    return { at, changes, caption, camera };
  });
}

/**
 * True once `time` has reached `at`. Time is a running sum of time steps, so allow a rounding error
 * far below one step (ten 0.1 steps sum to 0.9999999999999999, which must count as t = 1).
 */
export function reached(time: number, at: number, timeStep: number): boolean {
  return time >= at - 1e-6 * timeStep;
}

/**
 * Lengths written in the file are for the scenario as authored; when the particle count rescales the
 * world by `linearScale` (constant density), camera poses and absolute boundary sizes follow it, as the
 * initial camera distance and boundary do.
 */
export function scaleTimeline(events: readonly TimelineEvent[], linearScale: number): TimelineEvent[] {
  if (linearScale === 1) return [...events];
  const scale = (v: Vec3): Vec3 => [v[0] * linearScale, v[1] * linearScale, v[2] * linearScale];
  return events.map((event) => ({
    ...event,
    changes: event.changes.map((c) => (c.target.kind === 'setting' && c.target.key === 'boundarySize' && c.op === 'set' ? { ...c, value: c.value * linearScale } : c)),
    camera: event.camera && { ...event.camera, position: scale(event.camera.position), target: scale(event.camera.target) },
  }));
}

/** Current value at a path, or undefined when the force or parameter is gone (renamed or removed by the user). */
export function readTarget(target: TimelineTarget, forces: readonly ForceDefinition[], settings: SimulationSettings): number | undefined {
  if (target.kind === 'setting') return settings[target.key];
  return forces.find((f) => f.name === target.force)?.params.find((p) => p.name === target.param)?.value;
}

export interface AppliedEvent {
  forces: ForceDefinition[];
  settings: SimulationSettings;
  /** Changes whose force or parameter no longer exists; the others still apply. */
  missing: string[];
}

/** Pure: the forces and settings after an event's changes, in order (a path may appear once per event). */
export function applyEvent(event: TimelineEvent, forces: readonly ForceDefinition[], settings: SimulationSettings): AppliedEvent {
  let nextForces = [...forces];
  const nextSettings = { ...settings };
  const missing: string[] = [];
  for (const change of event.changes) {
    const current = readTarget(change.target, nextForces, nextSettings);
    if (current === undefined) {
      missing.push(change.path);
      continue;
    }
    const value = change.op === 'set' ? change.value : current * change.value;
    const target = change.target;
    if (target.kind === 'setting') {
      nextSettings[target.key] = value;
    } else {
      nextForces = nextForces.map((f) => (f.name !== target.force ? f : {
        ...f, params: f.params.map((p) => (p.name === target.param ? { ...p, value } : p)),
      }));
    }
  }
  return { forces: nextForces, settings: nextSettings, missing };
}

/** Three significant digits; exponent form for very large or small magnitudes. */
export function formatValue(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= 1e5 || magnitude < 1e-3)) return value.toExponential(2);
  return String(Number(value.toPrecision(3)));
}

export function formatCaption(caption: string, forces: readonly ForceDefinition[], settings: SimulationSettings): string {
  return caption.replace(CAPTION_PATH, (whole, key: string) => {
    const target = parseTarget(key);
    const value = target && readTarget(target, forces, settings);
    return value === undefined ? whole : formatValue(value);
  });
}
