import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  PrivacyPanel,
  SecurityPanel,
  type ActiveSession,
} from '@/components/settings/settings-panels';
import { API_BASE } from '@/lib/api';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';
import { LanguagePicker } from '@/components/app/language-switcher';

export const dynamic = 'force-dynamic';

async function getSessions(): Promise<ActiveSession[]> {
  const store = await cookies();

  try {
    const response = await fetch(`${API_BASE}/auth/sessions`, {
      headers: { Cookie: store.toString() },
      cache: 'no-store',
    });

    if (!response.ok) return [];

    return (await response.json()) as ActiveSession[];
  } catch {
    return [];
  }
}

export default async function SettingsPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const sessions = await getSessions();

  return (
    <div>
      <PageHero
        width="max-w-3xl"
        title={t('pages.settings.title')}
        description={t('pages.settings.description')}
      />
      <div className="relative mx-auto mt-6 max-w-3xl px-4 pb-10 md:px-8">

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">{t('language.label')}</h2>
        <p className="text-ink-muted mt-1 mb-5 text-sm">{t('language.hint')}</p>
        <LanguagePicker />
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">{t('pages.settings.privacy')}</h2>
        <PrivacyPanel user={user} />
      </section>

      <section className="mt-12 mb-4">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">{t('pages.settings.security')}</h2>
        <SecurityPanel sessions={sessions} />
      </section>
      </div>
    </div>
  );
}
