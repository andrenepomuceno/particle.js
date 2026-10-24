import { parseScenario } from './scenarioFile';
import type { Scenario } from './types';

const files = import.meta.glob<string>('./library/*.json', { eager: true, query: '?raw', import: 'default' });

/** Bundled scenarios, ordered by file name; any invalid file fails startup with its path. */
export const SCENARIOS: readonly Scenario[] = Object.keys(files)
  .sort()
  .map((path) => parseScenario(files[path]!, path.replace('./library/', '')));

const duplicate = SCENARIOS.find((s, k) => SCENARIOS.findIndex((other) => other.id === s.id) !== k);
if (duplicate) throw new Error(`scenario id '${duplicate.id}' is declared by more than one file in src/scenarios/library`);

export function findScenario(id: string): Scenario {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new Error(`unknown scenario '${id}'; available: ${SCENARIOS.map((s) => s.id).join(', ')}`);
  return scenario;
}
