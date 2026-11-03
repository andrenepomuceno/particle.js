import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../src/scenarios';
import { listedScenarios, orderScenarios, scenarioFolders } from '../src/scenarios/order';
import { parseScenario } from '../src/scenarios/scenarioFile';
import type { Scenario } from '../src/scenarios/types';

const scenario = (id: string, name: string, folder: string, added?: string): Scenario =>
  parseScenario(JSON.stringify({ format: 'particle.js-v2/scenario', version: 2, id, name, folder, ...(added && { added }) }), `${id}.json`);

// Suggested (library) order: c, a, b, d.
const library = [
  scenario('c', 'Comet', 'Gravity', '2026-10-24T02:00:00-03:00'),
  scenario('a', 'atom', 'Nuclear', '2026-10-30'),
  scenario('b', 'Binary', 'Gravity', '2026-10-24T02:00:00-03:00'),
  scenario('d', 'Dust', 'Nuclear', '2026-10-25'),
];
const ids = (list: readonly Scenario[]) => list.map((s) => s.id);

describe('scenario order', () => {
  it('keeps the library order as suggested, sorts names case-insensitively and puts the newest first', () => {
    expect(ids(orderScenarios(library, 'suggested'))).toEqual(['c', 'a', 'b', 'd']);
    expect(ids(orderScenarios(library, 'name'))).toEqual(['a', 'b', 'c', 'd']);
    // c and b were added together: the suggested order breaks the tie.
    expect(ids(orderScenarios(library, 'newest'))).toEqual(['a', 'd', 'c', 'b']);
  });

  it('groups by folder: by name A–Z, otherwise by each folder\'s first scenario', () => {
    const folders = (order: Parameters<typeof scenarioFolders>[1]) => scenarioFolders(library, order).map((f) => `${f.folder}: ${ids(f.scenarios).join(' ')}`);
    expect(folders('suggested')).toEqual(['Gravity: c b', 'Nuclear: a d']);
    expect(folders('name')).toEqual(['Gravity: b c', 'Nuclear: a d']);
    expect(folders('newest')).toEqual(['Nuclear: a d', 'Gravity: c b']);
  });

  it('lists grouped scenarios folder by folder, the order PageUp/PageDown follow', () => {
    expect(ids(listedScenarios(library, 'suggested', true))).toEqual(['c', 'b', 'a', 'd']);
    expect(ids(listedScenarios(library, 'suggested', false))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('sorts by the names the interface shows', () => {
    // Translated names reverse the English order; folders sort by their shown names too.
    const naming = {
      locale: 'pt-BR',
      name: (s: Scenario) => ({ a: 'Zinco', b: 'Ar', c: 'Cometa', d: 'Poeira' })[s.id]!,
      folder: (f: string) => ({ Gravity: 'Gravidade', Nuclear: 'Átomo' })[f]!,
    };
    expect(ids(orderScenarios(library, 'name', naming))).toEqual(['b', 'c', 'd', 'a']);
    expect(scenarioFolders(library, 'name', naming).map((f) => f.folder)).toEqual(['Nuclear', 'Gravity']);
    expect(ids(listedScenarios(library, 'name', true, naming))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('rejects an added value that is not an ISO 8601 date', () => {
    expect(() => scenario('x', 'X', 'F', '30/10/2026')).toThrow(/at 'added': expected an ISO 8601 date/);
  });

  it('dates every bundled scenario', () => {
    expect(SCENARIOS.filter((s) => s.added === undefined).map((s) => s.id)).toEqual([]);
  });
});
