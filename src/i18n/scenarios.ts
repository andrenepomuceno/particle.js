import type { ScenarioNaming } from '../scenarios/order';
import type { Scenario } from '../scenarios/types';
import type { Locale } from './index';
import { PT_BR_SCENARIOS } from './ptBR.scenarios';

/**
 * The bundled scenarios in another language, keyed by their English text: folder names, scenario names and
 * descriptions by id, and timeline captions by their template (the `{path}` placeholders stay as they are).
 * English is the scenario files themselves; imported and edited files show their own text.
 */
export interface ScenarioTexts {
  folders: Record<string, string>;
  captions: Record<string, string>;
  scenarios: Record<string, { source: string; name: string; description: string }>;
}

/**
 * A text translated from English, with `source`: the first 8 hex digits of the SHA-256 of the English text
 * (a scenario's `name + '\n' + description`), so tests catch a translation the English has moved past.
 */
export interface Translation {
  source: string;
  text: string;
}

const TEXTS: Record<Locale, ScenarioTexts | undefined> = { en: undefined, 'pt-BR': PT_BR_SCENARIOS };

export function scenarioTexts(locale: Locale): ScenarioTexts | undefined {
  return TEXTS[locale];
}

/** How a bundled scenario reads in `locale`: its translated name, description and folder, else the file's. */
export function localizeScenario(scenario: Scenario, locale: Locale): { name: string; description: string; folder: string } {
  const texts = TEXTS[locale];
  const translated = texts?.scenarios[scenario.id];
  return {
    name: translated?.name ?? scenario.name,
    description: translated?.description ?? scenario.description,
    folder: texts?.folders[scenario.folder] ?? scenario.folder,
  };
}

export function localizeFolder(folder: string, locale: Locale): string {
  return TEXTS[locale]?.folders[folder] ?? folder;
}

/** Scenario and folder names as the list shows them in `locale`, which the name order sorts by. */
export function scenarioNaming(locale: Locale): ScenarioNaming {
  return { locale, name: (s) => localizeScenario(s, locale).name, folder: (f) => localizeFolder(f, locale) };
}

/** A timeline caption template in `locale`, when that exact caption is translated. */
export function localizeCaption(template: string, locale: Locale): string {
  return TEXTS[locale]?.captions[template] ?? template;
}
