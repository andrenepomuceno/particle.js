import type { JsonReader } from '../json';
import { compileForce } from './compile';
import { FORCE_PRESETS, forceFromPreset, newForceId, withParams, type ForcePresetId } from './presets';
import type { ForceDefinition } from './types';

const FULL_KEYS = ['id', 'name', 'enabled', 'mode', 'expression', 'range', 'cutoff', 'softening', 'params'] as const;
const PRESET_KEYS = ['preset', 'name', 'enabled', 'cutoff', 'softening', 'params'] as const;

function readParamList(json: JsonReader, value: unknown, path: string): ForceDefinition['params'] {
  return json.array(value, path).map((p, k) => {
    const param = json.object(p, `${path}[${k}]`);
    json.onlyKeys(param, ['name', 'value'], `${path}[${k}]`);
    return { name: json.string(param.name, `${path}[${k}].name`), value: json.finite(param.value, `${path}[${k}].value`) };
  });
}

function readPresetForce(json: JsonReader, o: Record<string, unknown>, path: string): ForceDefinition {
  json.onlyKeys(o, PRESET_KEYS, path);
  const preset = json.oneOf(o.preset, Object.keys(FORCE_PRESETS) as ForcePresetId[], `${path}.preset`);
  let force = forceFromPreset(preset);
  const name = json.optional(o, 'name', (v) => json.string(v, `${path}.name`));
  const enabled = json.optional(o, 'enabled', (v) => json.boolean(v, `${path}.enabled`));
  const cutoff = json.optional(o, 'cutoff', (v) => json.finite(v, `${path}.cutoff`));
  const softening = json.optional(o, 'softening', (v) => json.finite(v, `${path}.softening`));
  force = {
    ...force,
    ...(name !== undefined && { name }),
    ...(enabled !== undefined && { enabled }),
    ...(cutoff !== undefined && { cutoff }),
    ...(softening !== undefined && { softening }),
  };
  if (o.params !== undefined) {
    const values = json.object(o.params, `${path}.params`);
    const numbers = Object.fromEntries(Object.entries(values).map(([key, v]) => [key, json.finite(v, `${path}.params.${key}`)]));
    try {
      force = withParams(force, numbers);
    } catch (error) {
      json.fail(`${path}.params`, (error as Error).message);
    }
  }
  return force;
}

/**
 * Reads a force either as a full definition or as `{ "preset": ..., overrides }`.
 * `requireId` is for snapshots, which round-trip ids; scenario files may omit them.
 */
export function readForce(json: JsonReader, value: unknown, path: string, requireId: boolean): ForceDefinition {
  const o = json.object(value, path);
  let force: ForceDefinition;
  if (o.preset !== undefined) {
    force = readPresetForce(json, o, path);
  } else {
    json.onlyKeys(o, FULL_KEYS, path);
    force = {
      id: requireId || o.id !== undefined ? json.string(o.id, `${path}.id`) : newForceId(),
      name: json.string(o.name, `${path}.name`),
      enabled: o.enabled === undefined && !requireId ? true : json.boolean(o.enabled, `${path}.enabled`),
      mode: json.oneOf(o.mode, ['force', 'potential'] as const, `${path}.mode`),
      expression: json.string(o.expression, `${path}.expression`),
      range: json.oneOf(o.range, ['long', 'short'] as const, `${path}.range`),
      cutoff: o.cutoff === undefined && !requireId ? 1 : json.finite(o.cutoff, `${path}.cutoff`),
      softening: o.softening === undefined && !requireId ? 0 : json.finite(o.softening, `${path}.softening`),
      params: o.params === undefined && !requireId ? [] : readParamList(json, o.params, `${path}.params`),
    };
  }
  try {
    compileForce(force);
  } catch (error) {
    json.fail(path, (error as Error).message);
  }
  return force;
}
