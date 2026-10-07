'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLocale } from '@/i18n/client';
import { LOCALE_COOKIE, isLocale } from '@/i18n/config';
import { API_BASE } from '@/lib/api';

export function LocaleSync({ profileLocale }: { profileLocale: string | null | undefined }) {
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    const chosen = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
      ?.split('=')[1];

    if (!chosen && isLocale(profileLocale) && profileLocale !== locale) {
      document.cookie = `${LOCALE_COOKIE}=${profileLocale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
      return;
    }

    if (chosen && isLocale(chosen) && chosen !== profileLocale) {
      void fetch(`${API_BASE}/profiles/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: chosen }),
      }).catch(() => {});
    }
  }, [locale, profileLocale, router]);

  return null;
}
