'use client';

import { Card, Eyebrow, cn } from '@nexus/ui';
import {
  Briefcase,
  CalendarDays,
  Compass,
  GraduationCap,
  Layers,
  MapPin,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Reveal } from './reveal';
import { Section, SectionIntro } from './section-shell';

const pillars = [
  {
    icon: Layers,
    title: 'One world, not ten apps',
    body: 'Your schedule, your friends, the places near you and the things you are learning stop living in separate tabs and start informing each other.',
    tint: 'var(--module-home)',
  },
  {
    icon: Sparkles,
    title: 'It learns what you care about',
    body: 'Interests you confirm, circles you join and things you save shape what Nexus shows you next. You stay in control of every signal.',
    tint: 'var(--module-ai)',
  },
  {
    icon: Users,
    title: 'Built around people',
    body: 'Friends, following, circles and events are the substrate. Discovery works because it runs through the people already around you.',
    tint: 'var(--module-people)',
  },
  {
    icon: MapPin,
    title: 'Rooted in real places',
    body: 'Cafés, venues, shops and neighbourhoods are first-class. What is happening near you is part of the product, not a separate map.',
    tint: 'var(--module-nearby)',
  },
  {
    icon: Target,
    title: 'Goals that actually move',
    body: 'A goal connects to milestones, tasks, study sessions and free time in your calendar. Progress updates as you live, not as you log.',
    tint: 'var(--module-learn)',
  },
  {
    icon: Briefcase,
    title: 'Room for businesses',
    body: 'Local businesses get profiles, products, events and analytics inside the same world their customers already use every day.',
    tint: 'var(--module-events)',
  },
];

const steps = [
  {
    number: '01',
    title: 'Tell Nexus who you are',
    body: 'A short onboarding captures what you do, what you are interested in, what you are working toward and when you are actually free.',
  },
  {
    number: '02',
    title: 'Your world assembles',
    body: 'Home, Discover, People and Events rebuild around you. Two people opening Nexus in the same city see two different products.',
  },
  {
    number: '03',
    title: 'It gets sharper every week',
    body: 'Every circle you join and event you attend feeds the next recommendation. Nothing changes your data without your confirmation.',
  },
];

const personas = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    tint: 'var(--module-learn)',
    headline: 'Java exam Friday. Nexus already planned around it.',
    cards: [
      { title: 'Today', body: 'Classes until 17:20 · 45-minute gap at 14:15', accent: true },
      { title: 'Revision', body: 'OOP practice · 19:00, fits before your evening' },
      { title: 'Circle', body: 'Kigali Developers posted 4 exam resources' },
      { title: 'Nearby', body: 'Quiet study café open until 22:00, 900m away' },
    ],
  },
  {
    id: 'creator',
    label: 'Creator',
    icon: Sparkles,
    tint: 'var(--module-ai)',
    headline: 'Your audience, your shoots and your deadlines in one view.',
    cards: [
      { title: 'Today', body: 'Golden hour 17:42 · shoot window still open', accent: true },
      { title: 'Project', body: 'Series 3 of 5 published · 2 drafts waiting' },
      { title: 'People', body: '3 photographers near you posted this week' },
      { title: 'Event', body: 'Portfolio review Saturday · 12 attending' },
    ],
  },
  {
    id: 'owner',
    label: 'Business owner',
    icon: Briefcase,
    tint: 'var(--module-events)',
    headline: 'Customers, messages and demand, without a separate dashboard.',
    cards: [
      { title: 'Today', body: '18 profile views · 4 unread messages', accent: true },
      { title: 'Demand', body: 'Saturday bookings up 32% week over week' },
      { title: 'Event', body: 'Your tasting night has 41 people interested' },
      { title: 'Reviews', body: '2 new reviews, both five stars' },
    ],
  },
  {
    id: 'explorer',
    label: 'Explorer',
    icon: Compass,
    tint: 'var(--module-discover)',
    headline: 'A city you do not know yet, mapped to what you like.',
    cards: [
      { title: 'Today', body: 'Clear evening · 3 rooftop spots nearby', accent: true },
      { title: 'Places', body: 'Saved 7 cafés · 2 have events this week' },
      { title: 'People', body: '5 travellers in your area this weekend' },
      { title: 'Experience', body: 'Sunrise hike leaves at 05:30 Sunday' },
    ],
  },
];

export function WhySection() {
  return (
    <Section id="features">
      <SectionIntro
        eyebrow="Why Nexus"
        title="Most apps hold one piece of your life. Nexus holds the connections between them."
        description="A calendar that does not know your goals is a list. A social feed that does not know your city is noise. Nexus is built so every part makes the others more useful."
      />

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;

          return (
            <Reveal key={pillar.title} delay={index * 0.06}>
              <Card interactive className="h-full p-6">
                <span
                  className="mb-5 flex size-10 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${pillar.tint} 14%, transparent)`,
                    color: pillar.tint,
                  }}
                >
                  <Icon className="size-4.5" />
                </span>
                <h3 className="text-[1.0625rem] font-semibold tracking-tight">{pillar.title}</h3>
                <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">{pillar.body}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export function HowSection() {
  return (
    <Section tone="deep">
      <SectionIntro
        eyebrow="How it works"
        title="Three steps, then it runs with you"
        align="center"
      />

      <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
        <div
          className="absolute top-6 right-[16%] left-[16%] hidden h-px md:block"
          style={{
            background:
              'linear-gradient(to right, transparent, var(--border-strong) 12%, var(--border-strong) 88%, transparent)',
          }}
        />

        {steps.map((step, index) => (
          <Reveal key={step.number} delay={index * 0.12} className="relative">
            <div className="bg-ground-deep relative z-10 mb-6 flex justify-center md:justify-start">
              <span className="border-accent-line bg-surface text-accent flex size-12 items-center justify-center rounded-full border font-mono text-sm font-semibold">
                {step.number}
              </span>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="text-ink-muted mx-auto mt-2.5 max-w-sm text-sm leading-relaxed md:mx-0">
                {step.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function PersonalizationSection() {
  const [active, setActive] = useState(personas[0]!.id);
  const persona = personas.find((item) => item.id === active) ?? personas[0]!;

  return (
    <Section id="discover">
      <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        <div>
          <SectionIntro
            eyebrow="Personalization"
            title="The same platform. A different Nexus for everyone."
            description="Nexus does not guess who you are. You tell it during onboarding, and it keeps learning from what you actually do. Try switching between four people below."
          />

          <Reveal delay={0.1} className="mt-8">
            <div className="flex flex-wrap gap-2">
              {personas.map((item) => {
                const Icon = item.icon;
                const selected = item.id === persona.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-300',
                      selected
                        ? 'border-transparent text-white'
                        : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                    )}
                    style={selected ? { backgroundColor: item.tint } : undefined}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="border-line bg-surface relative overflow-hidden rounded-xl border p-6 sm:p-8">
            <div
              className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full opacity-[0.18] blur-3xl transition-colors duration-700"
              style={{ backgroundColor: persona.tint }}
            />

            <div className="relative">
              <Eyebrow className="text-ink-subtle">Home · Pulse</Eyebrow>
              <p className="text-balance-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                {persona.headline}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {persona.cards.map((card) => (
                  <div
                    key={card.title}
                    className={cn(
                      'rounded-lg border p-4 transition-colors duration-500',
                      card.accent ? 'border-transparent' : 'border-line bg-surface-raised',
                    )}
                    style={
                      card.accent
                        ? {
                            backgroundColor: `color-mix(in oklab, ${persona.tint} 12%, transparent)`,
                            borderColor: `color-mix(in oklab, ${persona.tint} 30%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    <p
                      className="text-micro font-semibold uppercase"
                      style={{ color: card.accent ? persona.tint : 'var(--ink-subtle)' }}
                    >
                      {card.title}
                    </p>
                    <p className="text-ink mt-2 text-sm leading-relaxed">{card.body}</p>
                  </div>
                ))}
              </div>

              <div className="border-line mt-7 flex items-center gap-3 border-t pt-5">
                <span
                  className="flex size-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${persona.tint} 16%, transparent)`,
                    color: persona.tint,
                  }}
                >
                  <Sparkles className="size-3.5" />
                </span>
                <p className="text-ink-muted text-xs leading-relaxed">
                  Nexus AI suggests changes. Nothing moves in your calendar until you confirm it.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

export function StatStrip() {
  const stats = [
    { icon: Users, label: 'People', value: 'Friends, following, circles' },
    { icon: CalendarDays, label: 'Life', value: 'Calendar, tasks, goals' },
    { icon: MapPin, label: 'Places', value: 'Maps, venues, businesses' },
    { icon: GraduationCap, label: 'Learning', value: 'Courses, revision, progress' },
  ];

  return (
    <div className="border-line bg-ground-deep border-y">
      <div className="mx-auto grid max-w-7xl gap-px sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className="flex items-center gap-4 px-6 py-8 sm:px-8">
              <span className="border-line bg-surface text-accent flex size-10 shrink-0 items-center justify-center rounded-lg border">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-micro text-ink-subtle font-semibold uppercase">{stat.label}</p>
                <p className="mt-1 truncate text-sm font-medium">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
