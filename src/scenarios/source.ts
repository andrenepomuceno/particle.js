import { parseScenario } from './scenarioFile';
import type { Scenario } from './types';

/** The scenario file behind the current world, as Information → JSON shows and edits it. */
export interface ScenarioSource {
  /** The library or imported file name; applied edits keep it. */
  file: string;
  /** Id of the scenario the world was built from; names a downloaded copy. */
  id: string;
  /** The text as loaded from the library or the file (what Revert restores). */
  original: string;
  /** The text the world was built from: `original` or the last applied edit. */
  text: string;
}

/** The source of a scenario just loaded from the library or a file. */
export function sourceOf(scenario: Scenario): ScenarioSource {
  return { file: scenario.file, id: scenario.id, original: scenario.text, text: scenario.text };
}

/** Parses an edit of `source` exactly like an imported scenario file; errors name it `edited <file>`. */
export function parseEdit(source: ScenarioSource, text: string): { scenario: Scenario; source: ScenarioSource } {
  const scenario = parseScenario(text, `edited ${source.file}`);
  return { scenario, source: { ...source, id: scenario.id, text } };
}
