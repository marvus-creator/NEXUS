'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { formatDate, type DateStyle, type Locale } from './config';
import { dictionaries, errorDictionaries } from './dictionaries';
import { lookup, type MessageKey, type Translate, type Vars } from './types';

const LocaleContext = createContext<Locale>('en');

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();

  return useCallback(
    (key: MessageKey, vars?: Vars) => lookup(dictionaries[locale], key, vars),
    [locale],
  );
}

export function useFormatDate() {
  const locale = useLocale();

  return useMemo(
    () => (value: Date | string | number, style: DateStyle, timeZone?: string) =>
      formatDate(value, style, locale, timeZone),
    [locale],
  );
}

export function useErrorText() {
  const locale = useLocale();

  return useCallback(
    (message: string | undefined | null) => {
      if (!message) return lookup(dictionaries[locale], 'common.somethingWrong');
      return errorDictionaries[locale][message] ?? message;
    },
    [locale],
  );
}

export function useRelativeTime() {
  const t = useT();
  const format = useFormatDate();

  return useCallback(
    (iso: string) => {
      const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
      if (minutes < 1) return t('time.justNow');
      if (minutes < 60) return t('time.minutes', { n: minutes });
      const hours = Math.round(minutes / 60);
      if (hours < 24) return t('time.hours', { n: hours });
      const days = Math.round(hours / 24);
      if (days < 7) return t('time.days', { n: days });
      return format(iso, 'dayShort');
    },
    [t, format],
  );
}
