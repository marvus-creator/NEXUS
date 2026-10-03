import { Logo } from '@nexus/ui';
import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

export const metadata: Metadata = { title: 'Offline' };

export default async function OfflinePage() {
  const t = await getT();

  return (
    <main className="bg-ground grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display mt-8 text-3xl font-bold tracking-tight">{t('pwa.offlineTitle')}</h1>
        <p className="text-ink-muted mt-3 text-sm leading-relaxed">
          {t('pwa.offlineBody')}
        </p>
        <a
          href="/home"
          className="bg-accent mt-8 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold text-white"
        >
          {t('common.tryAgain')}
        </a>
      </div>
    </main>
  );
}
