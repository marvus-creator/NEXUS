'use client';

import { Button, Logo, ThemeToggle } from '@nexus/ui';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarSearch,
  Check,
  Lock,
  MapPin,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { useT } from '@/i18n/client';

const NAV = ['features', 'how', 'privacy'] as const;

const FEATURES = [
  { icon: CalendarSearch, title: 'planTitle', body: 'planBody' },
  { icon: Users, title: 'peopleTitle', body: 'peopleBody' },
  { icon: CalendarDays, title: 'eventsTitle', body: 'eventsBody' },
  { icon: MapPin, title: 'nearbyTitle', body: 'nearbyBody' },
  { icon: ShoppingBag, title: 'marketTitle', body: 'marketBody' },
  { icon: BookOpen, title: 'learnTitle', body: 'learnBody' },
] as const;

const STEPS = [
  { title: 'oneTitle', body: 'oneBody' },
  { title: 'twoTitle', body: 'twoBody' },
  { title: 'threeTitle', body: 'threeBody' },
] as const;

function Preview() {
  const t = useT();

  return (
    <div className="border-line bg-surface mx-auto w-full max-w-3xl overflow-hidden rounded-xl border shadow-[var(--shadow-lg)]">
      <div className="border-line flex items-center gap-1.5 border-b px-4 py-3">
        <span className="bg-line-strong size-2.5 rounded-full" />
        <span className="bg-line-strong size-2.5 rounded-full" />
        <span className="bg-line-strong size-2.5 rounded-full" />
      </div>
      <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-ink-muted text-xs">{t('landing.calm.preview.today')}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{t('landing.calm.preview.greeting')}</p>
          <p className="text-ink-muted text-sm">{t('landing.calm.preview.left')}</p>

          <p className="text-ink-subtle mt-6 text-xs font-medium">{t('landing.calm.preview.next')}</p>
          <ul className="mt-2 space-y-2">
            <li className="border-line flex items-center gap-3 rounded-lg border p-3">
              <span className="num text-ink-muted w-11 text-sm">18:00</span>
              <span className="bg-module-events h-8 w-0.5 rounded-full" />
              <span className="truncate text-sm font-medium">{t('landing.calm.preview.critique')}</span>
            </li>
            <li className="border-line flex items-center gap-3 rounded-lg border p-3">
              <span className="num text-ink-muted w-11 text-sm">20:30</span>
              <span className="bg-accent h-8 w-0.5 rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t('landing.calm.preview.revise')}</span>
                <span className="text-ink-subtle text-xs">{t('landing.calm.preview.booked')}</span>
              </span>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-ink-subtle text-xs font-medium">{t('landing.calm.preview.tasks')}</p>
          <ul className="mt-2 space-y-1">
            {[
              { label: t('landing.calm.preview.task1'), high: true },
              { label: t('landing.calm.preview.task2'), high: false },
            ].map((task) => (
              <li key={task.label} className="flex items-center gap-3 rounded-lg px-1 py-2">
                <span className="border-line-strong size-4 shrink-0 rounded-full border" />
                <span className="min-w-0 flex-1 truncate text-sm">{task.label}</span>
                {task.high ? <span className="text-module-events text-xs">{t('landing.calm.preview.high')}</span> : null}
              </li>
            ))}
          </ul>
          <div className="bg-surface-raised mt-4 rounded-lg p-3">
            <p className="text-sm font-medium">{t('landing.calm.preview.free')}</p>
            <span className="text-accent mt-1 inline-flex items-center gap-1 text-xs font-medium">
              <CalendarSearch className="size-3.5" /> {t('landing.calm.preview.findTime')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const t = useT();

  return (
    <div className="bg-ground text-ink min-h-dvh">
      <header className="border-line bg-ground/85 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/" aria-label="NEXUS">
            <Logo />
          </Link>
          <nav className="text-ink-muted hidden items-center gap-6 text-sm md:flex">
            {NAV.map((key) => (
              <a key={key} href={`#${key}`} className="hover:text-ink transition-colors">
                {t(`landing.calm.nav.${key}`)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/sign-in">{t('common.signIn')}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/create-account">{t('common.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center md:px-6 md:pt-24">
          <p className="border-line text-ink-muted mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <Sparkles className="text-accent size-3.5" /> {t('landing.calm.pill')}
          </p>
          <h1 className="t-hero mx-auto mt-6 max-w-4xl">{t('landing.calm.title')}</h1>
          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed">{t('landing.calm.body')}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/create-account">
                {t('landing.calm.start')} <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/sign-in">{t('landing.calm.signIn')}</Link>
            </Button>
          </div>
          <div className="mt-14 text-left">
            <Preview />
          </div>
        </section>

        <section id="features" className="border-line border-t">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <h2 className="t-d2 max-w-xl">{t('landing.calm.featuresTitle')}</h2>
            <div className="border-line bg-line mt-10 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="bg-surface p-6">
                    <Icon className="text-accent size-5" />
                    <h3 className="mt-4 font-semibold">{t(`landing.calm.features.${feature.title}`)}</h3>
                    <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{t(`landing.calm.features.${feature.body}`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how" className="border-line border-t">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <h2 className="t-d2 max-w-xl">{t('landing.calm.howTitle')}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="border-line num text-ink-muted grid size-8 place-items-center rounded-full border text-sm">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{t(`landing.calm.how.${step.title}`)}</h3>
                  <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{t(`landing.calm.how.${step.body}`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="privacy" className="border-line border-t">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:px-6">
            <div>
              <Lock className="text-accent size-5" />
              <h2 className="t-d2 mt-4">{t('landing.calm.privacyTitle')}</h2>
            </div>
            <ul className="space-y-4">
              {(['one', 'two', 'three'] as const).map((key) => (
                <li key={key} className="flex gap-3">
                  <Check className="text-success mt-0.5 size-5 shrink-0" />
                  <span className="text-[15px] leading-relaxed">{t(`landing.calm.privacy.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-line border-t">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
            <h2 className="t-d2">{t('landing.calm.ctaTitle')}</h2>
            <p className="text-ink-muted mx-auto mt-3 max-w-xl">{t('landing.calm.ctaBody')}</p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/create-account">
                {t('landing.calm.start')} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-line border-t">
        <div className="text-ink-subtle mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm sm:flex-row md:px-6">
          <span>{t('landing.calm.footer')}</span>
          <div className="flex gap-5">
            <Link href="/sign-in" className="hover:text-ink">
              {t('common.signIn')}
            </Link>
            <Link href="/create-account" className="hover:text-ink">
              {t('common.getStarted')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
