'use client';

import { Badge, Progress, Ring, cn } from '@nexus/ui';
import { BookOpen, Check, CornerDownLeft, Sparkles, Target } from 'lucide-react';
import { imagery } from '@/lib/imagery';
import { Reveal } from './reveal';
import { ImagePanel, Section, SectionIntro } from './section-shell';

const weekPlan = [
  { day: 'Mon', focus: 'Java theory', minutes: 60, done: true },
  { day: 'Tue', focus: 'OOP concepts', minutes: 75, done: true },
  { day: 'Wed', focus: 'Exercises', minutes: 90, done: false },
  { day: 'Thu', focus: 'Mock test', minutes: 60, done: false },
];

const timetable = [
  { time: '07:30', label: 'Classes', kind: 'fixed' as const, span: 'until 17:20' },
  { time: '14:15', label: 'Free period', kind: 'gap' as const, span: '45 minutes' },
  { time: '18:00', label: 'Gym', kind: 'fixed' as const, span: '1 hour' },
  { time: '19:30', label: 'Java revision', kind: 'flex' as const, span: 'scheduled by Nexus' },
];

const prompts = [
  'Organize my week around my exam',
  'What am I forgetting today?',
  'Find something interesting to do Saturday',
  'Move my study session, a meeting came up',
];

export function LearningSection() {
  return (
    <Section tone="deep">
      <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <SectionIntro
            eyebrow="Learning"
            title="Tell Nexus your exam date. Get a plan that fits your actual week."
            description="Courses, topics, notes, resources, assignments, quizzes and revision — with weak areas tracked so the next plan spends time where you need it."
          />

          <Reveal delay={0.12} className="mt-8">
            <div className="border-line bg-surface rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-accent-soft text-module-learn flex size-9 items-center justify-center rounded-lg">
                    <BookOpen className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Java · Year 2</p>
                    <p className="text-ink-muted text-xs">Exam Friday · 4 sessions planned</p>
                  </div>
                </div>
                <Ring value={62} size={44} stroke={3.5} tint="var(--module-learn)">
                  62%
                </Ring>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                {weekPlan.map((entry) => (
                  <div
                    key={entry.day}
                    className="border-line bg-surface-raised flex items-center gap-4 rounded-lg border px-4 py-3"
                  >
                    <span className="text-ink-subtle w-9 shrink-0 font-mono text-xs">
                      {entry.day}
                    </span>
                    <span className="flex-1 truncate text-sm">{entry.focus}</span>
                    <span className="text-ink-muted shrink-0 font-mono text-xs">
                      {entry.minutes}m
                    </span>
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border',
                        entry.done
                          ? 'border-transparent bg-[color-mix(in_oklab,var(--success)_20%,transparent)] text-success'
                          : 'border-line',
                      )}
                    >
                      {entry.done ? <Check className="size-3" /> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="group">
          <ImagePanel
            image={imagery.classroom}
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="h-[26rem] w-full sm:h-[34rem]"
          >
            <div className="absolute inset-x-0 bottom-0 p-7">
              <p className="text-balance-heading max-w-sm text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Fixed things stay fixed. Everything else arranges itself around them.
              </p>
            </div>
          </ImagePanel>
        </Reveal>
      </div>
    </Section>
  );
}

export function PlanningSection() {
  return (
    <Section>
      <SectionIntro
        eyebrow="Calendar, tasks and goals"
        title="A planner that knows your timetable is not negotiable"
        description="Classes, work and training are fixed. Study sessions, tasks and goals slot into what is genuinely left — and conflicts get caught before they happen."
        align="center"
        className="mx-auto"
      />

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="border-line bg-surface h-full rounded-xl border p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Wednesday</p>
              <Badge size="sm">4 items</Badge>
            </div>

            <div className="mt-6 flex flex-col">
              {timetable.map((slot, index) => (
                <div key={slot.time} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'mt-1 size-2.5 shrink-0 rounded-full',
                        slot.kind === 'fixed' && 'bg-ink-subtle',
                        slot.kind === 'gap' && 'bg-module-nearby',
                        slot.kind === 'flex' && 'bg-accent',
                      )}
                    />
                    {index < timetable.length - 1 ? (
                      <span className="bg-line w-px flex-1" />
                    ) : null}
                  </div>

                  <div className="flex-1 pb-7">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-xs">{slot.time}</span>
                      <span className="text-sm font-medium">{slot.label}</span>
                      {slot.kind === 'flex' ? (
                        <Badge variant="accent" size="sm">
                          Suggested
                        </Badge>
                      ) : null}
                      {slot.kind === 'gap' ? (
                        <Badge variant="success" size="sm">
                          Free
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-ink-muted mt-1 text-xs">{slot.span}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal delay={0.1}>
            <div className="border-line bg-surface rounded-xl border p-6">
              <span className="bg-accent-soft text-module-learn mb-4 flex size-9 items-center justify-center rounded-lg">
                <Target className="size-4" />
              </span>
              <p className="text-sm font-semibold">Become a better developer</p>
              <p className="text-ink-muted mt-1.5 text-xs">3 of 4 milestones</p>
              <Progress value={75} tint="var(--module-learn)" className="mt-4" />
              <div className="border-line mt-5 flex flex-col gap-2.5 border-t pt-4">
                {['Learn Java', 'Build 3 projects', 'Practice algorithms'].map((milestone) => (
                  <div key={milestone} className="flex items-center gap-2.5 text-xs">
                    <Check className="text-success size-3.5 shrink-0" />
                    <span className="text-ink-muted">{milestone}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="border-line size-3.5 shrink-0 rounded-full border" />
                  <span className="text-ink-subtle">Complete portfolio</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="border-line bg-surface rounded-xl border p-6">
              <p className="text-sm font-semibold">Finish Java assignment</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="danger" size="sm">
                  Due Thursday
                </Badge>
                <Badge size="sm">Java course</Badge>
                <Badge size="sm">Pass Year 2</Badge>
              </div>
              <p className="text-ink-muted mt-4 text-xs leading-relaxed">
                One task, linked to a course and a goal, scheduled into real free time. That link is
                the whole point.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

export function AiSection() {
  return (
    <Section tone="deep" className="overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-60"
        style={{
          background:
            'radial-gradient(50% 100% at 50% 0%, color-mix(in oklab, var(--module-ai) 18%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <SectionIntro
          eyebrow="Nexus AI"
          title="Not a chat tab bolted on the side. A layer across everything."
          description="Nexus AI can read your schedule, goals, courses and circles — only what you authorize. When it wants to change something, it asks first."
          align="center"
          className="mx-auto"
        />

        <Reveal delay={0.12} className="mx-auto mt-14 max-w-2xl">
          <div className="border-line bg-surface overflow-hidden rounded-xl border shadow-[var(--shadow-lg)]">
            <div className="border-line flex items-center gap-3 border-b px-5 py-4">
              <span
                className="flex size-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--module-ai) 16%, transparent)',
                  color: 'var(--module-ai)',
                }}
              >
                <Sparkles className="size-4" />
              </span>
              <p className="text-sm font-medium">Nexus AI</p>
              <Badge variant="success" size="sm" className="ml-auto">
                Connected to your week
              </Badge>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex justify-end">
                <p className="bg-accent text-accent-ink max-w-[85%] rounded-lg rounded-br-sm px-4 py-2.5 text-sm">
                  A meeting came up at 18:30. Fix my evening.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="bg-surface-raised border-line max-w-[90%] rounded-lg rounded-bl-sm border px-4 py-3 text-sm leading-relaxed">
                  Your gym session overlaps. I can move Java revision to 20:00 and push the gym to
                  tomorrow at 06:30 — that keeps both and still leaves you 7 hours of sleep.
                </p>

                <div className="border-accent-line bg-accent-soft max-w-[90%] rounded-lg border p-4">
                  <p className="text-micro text-accent font-semibold uppercase">Confirm changes</p>
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <CornerDownLeft className="text-ink-subtle size-3.5 shrink-0" />
                      Java revision · 19:30 → 20:00
                    </span>
                    <span className="flex items-center gap-2">
                      <CornerDownLeft className="text-ink-subtle size-3.5 shrink-0" />
                      Gym · today 18:00 → tomorrow 06:30
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className="bg-accent text-accent-ink rounded-md px-3 py-1.5 text-xs font-medium">
                      Confirm
                    </span>
                    <span className="border-line text-ink-muted rounded-md border px-3 py-1.5 text-xs font-medium">
                      Keep as is
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2} className="mt-8">
          <div className="flex flex-wrap justify-center gap-2.5">
            {prompts.map((prompt) => (
              <span
                key={prompt}
                className="border-line bg-surface text-ink-muted rounded-full border px-4 py-2 text-xs"
              >
                {prompt}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
