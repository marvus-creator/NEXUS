'use client';

import { Button } from '@nexus/ui';
import { ArrowRight, Eye, Globe, Languages, MessageSquare, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { imagery } from '@/lib/imagery';
import { Reveal } from './reveal';
import { ImagePanel, Section, SectionIntro } from './section-shell';

const metrics = [
  { icon: Eye, label: 'Profile views', value: '1,284', delta: '+18%' },
  { icon: MessageSquare, label: 'Messages', value: '46', delta: '+7' },
  { icon: TrendingUp, label: 'Saturday bookings', value: '32', delta: '+32%' },
];

const reach = [
  { label: 'Languages', body: 'Kinyarwanda, English, French and beyond — nothing hard-coded to one locale.' },
  { label: 'Currencies', body: 'Prices, wallets and marketplaces respect where the user actually is.' },
  { label: 'Time zones', body: 'Events and schedules stay correct when people travel or connect across borders.' },
  { label: 'Regional content', body: 'Discovery, circles and businesses are local first, global by architecture.' },
];

export function BusinessSection() {
  return (
    <Section id="business">
      <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal className="group">
          <div className="relative">
            <ImagePanel
              image={imagery.storefront}
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="h-[24rem] w-full sm:h-[30rem]"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {metrics.map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <div
                      key={metric.label}
                      className="border-line bg-surface/90 rounded-lg border p-3.5 backdrop-blur-xl"
                    >
                      <Icon className="text-ink-subtle mb-2 size-3.5" />
                      <p className="font-mono text-lg font-semibold">{metric.value}</p>
                      <p className="text-ink-muted mt-0.5 truncate text-[0.6875rem]">
                        {metric.label}
                      </p>
                      <p className="text-success mt-1 font-mono text-[0.6875rem]">{metric.delta}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>

        <div>
          <SectionIntro
            eyebrow="For businesses"
            title="Where your customers already are, every day"
            description="A business profile with products, services, events, offers, reviews and messages — plus a management dashboard and analytics that show what is actually working."
          />

          <Reveal delay={0.12} className="mt-8">
            <ul className="flex flex-col gap-3">
              {[
                'Products, services and offers people can find through Discover and Nearby',
                'Events that connect to circles, calendars and attendee chat',
                'Conversations in the same inbox your customers already use',
                'Views, engagement, followers and event performance in one dashboard',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="bg-module-events mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <span className="text-ink-muted">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

export function GlobalSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <ImagePanel
          image={imagery.landscape}
          sizes="100vw"
          className="absolute inset-0 rounded-none"
          overlay={false}
        />
        <div className="bg-ground-deep/78 absolute inset-0" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, var(--ground) 0%, transparent 22%, transparent 78%, var(--ground) 100%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 sm:py-36">
        <SectionIntro
          eyebrow="The long view"
          title="Start in Rwanda. Architect for everywhere."
          description="Version one is honest about its scale. The foundations underneath it are not — languages, currencies, time zones and regional content are built in from the first migration, not retrofitted when it hurts."
          align="center"
          className="mx-auto"
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reach.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.08}>
              <div className="border-line bg-surface/75 h-full rounded-xl border p-6 backdrop-blur-xl">
                <p className="text-micro text-accent font-semibold uppercase">{item.label}</p>
                <p className="text-ink-muted mt-3 text-sm leading-relaxed">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-14 flex justify-center">
          <div className="text-ink-muted inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
            <Globe className="text-accent size-4" />
            <span>Nexus Rwanda</span>
            <span className="text-ink-subtle">→</span>
            <span>Nexus Africa</span>
            <span className="text-ink-subtle">→</span>
            <span>Nexus Global</span>
            <Languages className="text-ink-subtle ml-1 size-4" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <Section className="overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[28rem] opacity-70"
        style={{
          background:
            'radial-gradient(55% 100% at 50% 100%, color-mix(in oklab, var(--accent) 20%, transparent) 0%, transparent 72%)',
        }}
      />

      <Reveal className="relative flex flex-col items-center text-center">
        <h2 className="text-balance-heading max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.05]">
          Your world is already out there. Nexus just connects it.
        </h2>
        <p className="text-ink-muted mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
          Create an account, spend three minutes telling Nexus who you are, and open a version of
          the internet that is actually yours.
        </p>

        <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/create-account">
              Create your Nexus <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>

        <p className="text-ink-subtle mt-6 text-xs">
          Free to start. Your data stays yours, and personalization is always controllable.
        </p>
      </Reveal>
    </Section>
  );
}
