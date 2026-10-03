import { LOCALES, type Locale } from './config';
import { apiErrors, messages } from './messages';
import type { Dictionary, Tree } from './types';

function pick(tree: Tree, index: number): Dictionary {
  const out: Dictionary = {};

  for (const [key, value] of Object.entries(tree)) {
    out[key] = Array.isArray(value) ? (value as readonly string[])[index]! : pick(value as Tree, index);
  }

  return out;
}

export const dictionaries = Object.fromEntries(
  LOCALES.map((locale, index) => [locale, pick(messages, index)]),
) as Record<Locale, Dictionary>;

export const errorDictionaries = Object.fromEntries(
  LOCALES.map((locale, index) => [
    locale,
    Object.fromEntries(Object.entries(apiErrors).map(([key, value]) => [key, value[index]!])),
  ]),
) as Record<Locale, Record<string, string>>;
