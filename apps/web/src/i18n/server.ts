import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, formatDate, isLocale, type DateStyle, type Locale } from './config';
import { dictionaries } from './dictionaries';
import { lookup, type MessageKey, type Translate, type Vars } from './types';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;

  if (isLocale(chosen)) return chosen;

  const accept = (await headers()).get('accept-language') ?? '';
  const preferred = accept
    .split(',')
    .map((part) => part.split(';')[0]!.trim().slice(0, 2).toLowerCase())
    .find(isLocale);

  return preferred ?? DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  const dictionary = dictionaries[locale];
  const t: Translate = (key: MessageKey, vars?: Vars) => lookup(dictionary, key, vars);

  return {
    locale,
    t,
    date: (value: Date | string | number, style: DateStyle, timeZone?: string) =>
      formatDate(value, style, locale, timeZone),
  };
}

export async function getT() {
  return (await getI18n()).t;
}
