import { en, type Messages } from './en';
import { ptBR } from './ptBR';
import { PT_BR_VARIABLES } from './ptBR.variables';

export type { Messages } from './en';

export const LOCALES = ['en', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language named in itself, for the language menu. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', 'pt-BR': 'Português' };

const CATALOGS: Record<Locale, Messages> = { en, 'pt-BR': ptBR };

export function messagesFor(locale: Locale): Messages {
  return CATALOGS[locale];
}

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** The supported language for a BCP 47 tag: any Portuguese reads pt-BR, any English en; others none. */
export function matchLocale(tag: string): Locale | undefined {
  const language = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (language === 'pt') return 'pt-BR';
  if (language === 'en') return 'en';
  return undefined;
}

/** The first of the browser's preferred languages that is supported, else English. */
export function preferredLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const locale = matchLocale(tag);
    if (locale) return locale;
  }
  return 'en';
}

const VARIABLES: Record<Locale, Record<string, string> | undefined> = { en: undefined, 'pt-BR': PT_BR_VARIABLES };

/** Expression variable descriptions in `locale`, by the Expressions reference's row key; English is the engine's own. */
export function variableTexts(locale: Locale): Record<string, string> | undefined {
  return VARIABLES[locale];
}
