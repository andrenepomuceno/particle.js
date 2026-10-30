import { describe, expect, it } from 'vitest';
import { createRng } from '../src/engine/random';
import { findScenario, SCENARIOS } from '../src/scenarios';
import { parseScenario } from '../src/scenarios/scenarioFile';
import { parseEdit, sourceOf } from '../src/scenarios/source';

const galaxy = findScenario('galaxy');
const edit = (change: (json: { groups: { count: number }[] } & Record<string, unknown>) => void) => {
  const json = JSON.parse(galaxy.text);
  change(json);
  return JSON.stringify(json, null, 2);
};

describe('scenario source text', () => {
  it.each(SCENARIOS.map((s) => [s.file, s] as const))('%s keeps its file text, which parses back to the same scenario', (file, scenario) => {
    expect(file).toMatch(/^\d+-[\w-]+\.json$/);
    const again = parseScenario(scenario.text, file);
    expect(again).toMatchObject({ id: scenario.id, name: scenario.name, folder: scenario.folder, defaultCount: scenario.defaultCount, text: scenario.text });
    expect(again.build(createRng(again.seed ?? 1)).particles).toEqual(scenario.build(createRng(scenario.seed ?? 1)).particles);
  });

  it('starts a source from the loaded file', () => {
    expect(sourceOf(galaxy)).toEqual({ file: '10-galaxy.json', id: 'galaxy', original: galaxy.text, text: galaxy.text });
  });
});

describe('parseEdit', () => {
  it('parses an edit like a file and keeps the original for Revert', () => {
    const text = edit((json) => {
      json.groups[0]!.count += 5;
      json.id = 'galaxy-edit';
    });
    const { scenario, source } = parseEdit(sourceOf(galaxy), text);
    expect(scenario.defaultCount).toBe(galaxy.defaultCount + 5);
    expect(scenario.text).toBe(text);
    expect(source).toEqual({ file: '10-galaxy.json', id: 'galaxy-edit', original: galaxy.text, text });
  });

  it('names the edited file and stays named after it across edits', () => {
    const first = parseEdit(sourceOf(galaxy), edit((json) => (json.name = 'Galaxy, edited'))).source;
    const second = parseEdit(first, galaxy.text).source;
    expect(second).toEqual(sourceOf(galaxy));
    expect(() => parseEdit(first, edit((json) => (json.groups[0]!.count = 0))))
      .toThrow(/invalid scenario edited 10-galaxy.json at 'groups\[0\].count': must be an integer >= 1/);
  });

  it.each([
    ['broken JSON', '{ "format": ', /invalid scenario edited 10-galaxy.json at '\$': not valid JSON/],
    ['an unknown key', edit((json) => (json.colour = 'red')), /at '\$': unknown key\(s\) colour/],
    ['a snapshot', JSON.stringify({ format: 'particle.js-v2/snapshot', version: 6 }), /at 'format': expected 'particle.js-v2\/scenario'/],
  ])('rejects %s with its path', (_, text, message) => {
    expect(() => parseEdit(sourceOf(galaxy), text)).toThrow(message);
  });
});
