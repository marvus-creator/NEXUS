import { Logo } from '@nexus/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { getT } from '@/i18n/server';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getT();

  return (
    <div className="bg-ground flex min-h-dvh flex-col px-5 py-5 sm:px-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex w-fit" aria-label={t('nav.home')}>
          <Logo />
        </Link>
        <LanguageSwitcher />
      </div>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>

      <p className="text-ink-subtle text-center text-xs">
        © {new Date().getFullYear()} NEXUS · {t('auth.side.built')}
      </p>
    </div>
  );
}
