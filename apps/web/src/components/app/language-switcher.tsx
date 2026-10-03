'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@nexus/ui';
import { Check, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from '@/i18n/config';
import { API_BASE } from '@/lib/api';

export function useSetLocale() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    void fetch(`${API_BASE}/profiles/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {});
    startTransition(() => router.refresh());
  }

  return { setLocale, pending };
}

export function LanguageSwitcher({ tone = 'default' }: { tone?: 'default' | 'glass' }) {
  const locale = useLocale();
  const t = useT();
  const { setLocale, pending } = useSetLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('language.label')}
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold transition',
            tone === 'glass'
              ? 'text-white/85 hover:bg-white/10 hover:text-white'
              : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
            pending && 'opacity-60',
          )}
        >
          <Globe className="size-4" />
          {LOCALE_NAMES[locale].short}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => setLocale(option)}>
            <span className="w-7 font-mono text-[11px] font-semibold opacity-60">
              {LOCALE_NAMES[option].short}
            </span>
            <span className="flex-1">{LOCALE_NAMES[option].native}</span>
            {option === locale ? <Check className="text-accent size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguagePicker() {
  const locale = useLocale();
  const { setLocale, pending } = useSetLocale();

  return (
    <div className={cn('grid gap-2 sm:grid-cols-3', pending && 'opacity-60')}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3.5 text-left transition',
            option === locale ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong',
          )}
        >
          <span className="bg-surface-raised grid size-9 place-items-center rounded-lg font-mono text-xs font-bold">
            {LOCALE_NAMES[option].short}
          </span>
          <span className="flex-1 text-sm font-medium">{LOCALE_NAMES[option].native}</span>
          {option === locale ? <Check className="text-accent size-4" /> : null}
        </button>
      ))}
    </div>
  );
}
