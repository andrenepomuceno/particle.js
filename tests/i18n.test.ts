import { describe, expect, it } from 'vitest';
import { variableRows } from '../src/engine/forces/variables';
import { FORCE_PRESETS } from '../src/engine/forces/presets';
import { LOCALES, matchLocale, messagesFor, preferredLocale, variableTexts } from '../src/i18n';
import { en } from '../src/i18n/en';
import { localizeCaption, localizeFolder, localizeScenario, scenarioTexts } from '../src/i18n/scenarios';
import { SCENARIOS } from '../src/scenarios';
import { parseScenario } from '../src/scenarios/scenarioFile';
import { ACTIONS } from '../src/ui/actions';
import { richParts } from '../src/ui/components/Rich';
// @ts-expect-error: a plain .mjs module shared by the browser scripts, without type declarations.
import { LANGS } from '../scripts/lib/langs.mjs';

const TRANSLATED = LOCALES.filter((l) => l !== 'en');
/** A translation's `source`: the first 8 hex digits of the SHA-256 of the English it translates. */
async function fingerprint(english: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(english));
  return [...new Uint8Array(digest).slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Every leaf of a catalog as [path, value]; functions are called with placeholder arguments. */
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function') return leaves((value as (...args: unknown[]) => unknown)(...Array.from({ length: value.length }, () => 7)), path);
  if (Array.isArray(value)) return value.flatMap((item, k) => leaves(item, `${path}[${k}]`));
  return Object.entries(value as object).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
}

/** The catalog's shape: keys, and for each function its arity; arrays may differ in length between languages. */
function shape(value: unknown): unknown {
  if (typeof value === 'function') return `function/${value.length}`;
  if (Array.isArray(value)) return value.length === 0 ? [] : [shape(value[0])];
  if (typeof value === 'object' && value !== null) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]).sort());
  return typeof value;
}

describe('language choice', () => {
  it('reads any Portuguese as pt-BR and any English as en', () => {
    expect(['pt-BR', 'pt', 'pt-PT', 'PT_br'].map(matchLocale)).toEqual(['pt-BR', 'pt-BR', 'pt-BR', 'pt-BR']);
    expect(['en', 'en-US', 'en-GB'].map(matchLocale)).toEqual(['en', 'en', 'en']);
    expect(matchLocale('fr-FR')).toBeUndefined();
  });

  it('offers the browser scripts the same languages', () => {
    expect(LANGS).toEqual([...LOCALES]);
  });

  it('takes the first supported preferred language, else English', () => {
    expect(preferredLocale(['fr-FR', 'pt-PT', 'en'])).toBe('pt-BR');
    expect(preferredLocale(['de', 'fr'])).toBe('en');
    expect(preferredLocale([])).toBe('en');
  });
});

describe('interface catalogs', () => {
  it.each(TRANSLATED)('%s has the shape of the English catalog', (locale) => {
    expect(shape(messagesFor(locale))).toEqual(shape(en));
  });

  it.each(LOCALES)('%s has no empty text and only well-formed markup', (locale) => {
    for (const [path, text] of leaves(messagesFor(locale))) {
      expect(text.trim(), path).not.toBe('');
      const literal = richParts(text).filter((part) => typeof part === 'string').join('');
      expect(literal, path).not.toMatch(/<\/?(kbd|b|i|code)>/);
    }
  });

  it('names every action, and only those', () => {
    expect(ACTIONS.map((a) => a.id).sort()).toEqual(Object.keys(en.actions).sort());
  });

  it('names the force presets as the forces they add', () => {
    for (const [id, preset] of Object.entries(FORCE_PRESETS)) expect(en.forcePresets[id as keyof typeof FORCE_PRESETS]).toBe(preset.name);
  });
});

describe('rich text', () => {
  it('turns the known tags into elements and leaves everything else as text', () => {
    const parts = richParts('Press <kbd>?</kbd> when F > 0 and <b>x < 1</b>; <u>no</u>');
    expect(parts.map((p) => (typeof p === 'string' ? p : `${(p as { type: string }).type}:${(p as { props: { children: string } }).props.children}`)))
      .toEqual(['Press ', 'kbd:?', ' when F > 0 and ', 'b:x < 1', '; <u>no</u>']);
  });
});

describe('scenario texts', () => {
  const captions = new Set(SCENARIOS.flatMap((s) => s.timeline.flatMap((e) => (e.caption ? [e.caption] : []))));
  const folders = new Set(SCENARIOS.map((s) => s.folder));
  const placeholders = (text: string) => [...text.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]).sort();

  it.each(TRANSLATED)('%s translates every bundled scenario, folder and caption, and nothing else, from the current English', async (locale) => {
    const texts = scenarioTexts(locale)!;
    expect(Object.keys(texts.scenarios).sort()).toEqual(SCENARIOS.map((s) => s.id).sort());
    for (const [id, { name, description }] of Object.entries(texts.scenarios)) {
      expect(name.trim(), id).not.toBe('');
      expect(description.trim(), id).not.toBe('');
    }
    // An English name or description edited since the translation: update the text, then its source.
    const sources = await Promise.all(SCENARIOS.map(async (s) => ({ id: s.id, source: await fingerprint(`${s.name}\n${s.description}`) })));
    const stale = sources.filter(({ id, source }) => texts.scenarios[id]!.source !== source);
    expect(stale, 'scenarios whose English changed since their translation (new source shown)').toEqual([]);
    expect(Object.keys(texts.folders).sort()).toEqual([...folders].sort());
    expect(Object.keys(texts.captions).sort()).toEqual([...captions].sort());
    // A translated caption shows the same values.
    for (const [caption, translated] of Object.entries(texts.captions)) expect(placeholders(translated)).toEqual(placeholders(caption));
  });

  it('reads English from the files, and a file outside the library as written', () => {
    const galaxy = SCENARIOS.find((s) => s.id === 'galaxy')!;
    expect(localizeScenario(galaxy, 'en')).toEqual({ name: galaxy.name, description: galaxy.description, folder: galaxy.folder });
    expect(localizeScenario(galaxy, 'pt-BR')).toMatchObject({ name: 'Disco galáctico', folder: 'Gravidade' });
    const own = parseScenario(JSON.stringify({ format: 'particle.js-v2/scenario', version: 2, id: 'mine', name: 'Mine', description: 'Mine.', folder: 'Gravity' }), 'mine.json');
    expect(localizeScenario(own, 'pt-BR')).toEqual({ name: 'Mine', description: 'Mine.', folder: 'Gravidade' });
    expect(localizeFolder('Unknown', 'pt-BR')).toBe('Unknown');
    expect(localizeCaption('Gravity: {Gravity (v1 1/d).G}', 'pt-BR')).toBe('Gravidade: {Gravity (v1 1/d).G}');
    expect(localizeCaption('My caption {settings.friction}', 'pt-BR')).toBe('My caption {settings.friction}');
  });
});

describe('expression variables', () => {
  it.each(TRANSLATED)('%s describes every row of the Expressions reference, and only those, from the current English', async (locale) => {
    const texts = variableTexts(locale)!;
    const rows = variableRows();
    expect(Object.keys(texts).sort()).toEqual(rows.map((r) => r.base).sort());
    const sources = await Promise.all(rows.map(async (r) => ({ base: r.base, source: await fingerprint(r.description) })));
    const stale = sources.filter(({ base, source }) => texts[base]!.source !== source);
    expect(stale, 'variables whose English changed since their translation (new source shown)').toEqual([]);
  });
});
