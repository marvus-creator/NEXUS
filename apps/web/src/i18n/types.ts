import type { messages } from './messages';

export type Tri = readonly [en: string, rw: string, fr: string];

export type Tree = { readonly [key: string]: Tri | Tree };

type Paths<T> = {
  [K in keyof T & string]: T[K] extends Tri ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type MessageKey = Paths<typeof messages>;

export type Dictionary = { [key: string]: string | Dictionary };

export type Vars = Record<string, string | number>;

export type Translate = (key: MessageKey, vars?: Vars) => string;

export function lookup(dictionary: Dictionary, key: string, vars?: Vars) {
  let value: unknown = dictionary;

  for (const part of key.split('.')) {
    value = (value as Record<string, unknown> | undefined)?.[part];
  }

  if (typeof value !== 'string') return key;
  if (!vars) return value;

  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name]),
  );
}
