import type { Scenario } from './types';

/** suggested: the library's own order (file names); name: A–Z; newest: by `added`, newest first. */
export const SCENARIO_ORDERS = ['suggested', 'name', 'newest'] as const;
export type ScenarioOrder = (typeof SCENARIO_ORDERS)[number];

export interface ScenarioFolder {
  folder: string;
  scenarios: Scenario[];
}

const addedTime = (s: Scenario): number => (s.added === undefined ? -Infinity : Date.parse(s.added));

/** The scenarios in `order`; ties (same name or date) keep the suggested order. */
export function orderScenarios(scenarios: readonly Scenario[], order: ScenarioOrder): Scenario[] {
  const list = [...scenarios];
  if (order === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  if (order === 'newest') return list.sort((a, b) => addedTime(b) - addedTime(a));
  return list;
}

/**
 * The ordered scenarios grouped by folder. Folders sort by name under `name`, otherwise by their first
 * scenario (the suggested order, or the folder with the newest scenario first).
 */
export function scenarioFolders(scenarios: readonly Scenario[], order: ScenarioOrder): ScenarioFolder[] {
  const folders = new Map<string, Scenario[]>();
  for (const scenario of orderScenarios(scenarios, order)) {
    const list = folders.get(scenario.folder);
    if (list) list.push(scenario);
    else folders.set(scenario.folder, [scenario]);
  }
  const grouped = Array.from(folders, ([folder, list]) => ({ folder, scenarios: list }));
  return order === 'name' ? grouped.sort((a, b) => a.folder.localeCompare(b.folder, undefined, { sensitivity: 'base' })) : grouped;
}

/** The order the list shows them in: grouped by folder or flat. PageUp/PageDown and Home follow it. */
export function listedScenarios(scenarios: readonly Scenario[], order: ScenarioOrder, byFolder: boolean): Scenario[] {
  return byFolder ? scenarioFolders(scenarios, order).flatMap((f) => f.scenarios) : orderScenarios(scenarios, order);
}
