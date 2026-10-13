'use client';

import { Button, Eyebrow, Field, Input, Logo, cn } from '@nexus/ui';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Dumbbell,
  GraduationCap,
  Lightbulb,
  Rocket,
  Sparkles,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { InterestGroup } from '@/lib/interests';
import { profileClient, type ScheduleBlockInput } from '@/lib/profile-client';
import { ScheduleBuilder } from './schedule-builder';
import { useErrorText, useT } from '@/i18n/client';
import { interestCategory, interestLabel } from '@/i18n/interests';

const USER_TYPES = [
  { value: 'STUDENT', label: 'Student', icon: GraduationCap, blurb: 'Classes, exams, revision' },
  { value: 'PROFESSIONAL', label: 'Professional', icon: Briefcase, blurb: 'Work, growth, network' },
  { value: 'CREATOR', label: 'Creator', icon: Sparkles, blurb: 'Projects, audience, output' },
  {
    value: 'BUSINESS_OWNER',
    label: 'Business owner',
    icon: Briefcase,
    blurb: 'Customers, products',
  },
  { value: 'ENTREPRENEUR', label: 'Entrepreneur', icon: Rocket, blurb: 'Building something new' },
  { value: 'ATHLETE', label: 'Athlete', icon: Dumbbell, blurb: 'Training, fixtures, form' },
  { value: 'OTHER', label: 'Something else', icon: User, blurb: 'Tell Nexus in your own words' },
] as const;

const GOALS = [
  { value: 'CAREER', label: 'Career' },
  { value: 'SCHOOL', label: 'School' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FITNESS', label: 'Fitness' },
  { value: 'LEARNING', label: 'Learning' },
  { value: 'MONEY', label: 'Money' },
  { value: 'CREATIVE', label: 'Creative projects' },
  { value: 'PERSONAL', label: 'Personal goals' },
] as const;

const HELP = [
  { value: 'LEARNING', label: 'Learning' },
  { value: 'PLANNING', label: 'Planning my time' },
  { value: 'MEETING_PEOPLE', label: 'Meeting people' },
  { value: 'DISCOVERING_PLACES', label: 'Discovering places' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'GOALS', label: 'Goals' },
  { value: 'MONEY', label: 'Money' },
  { value: 'COMMUNITIES', label: 'Communities' },
  { value: 'OPPORTUNITIES', label: 'Opportunities' },
] as const;


function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200',
        active
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {active ? <Check className="size-3.5" /> : null}
      {children}
    </button>
  );
}

export function OnboardingWizard({
  interestGroups,
  startStep,
  displayName,
}: {
  interestGroups: InterestGroup[];
  startStep: number;
  displayName: string;
}) {
  const router = useRouter();

  const [step, setStep] = useState(Math.min(Math.max(startStep, 1), 5));
  const [userType, setUserType] = useState<string>('STUDENT');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlockInput[]>([]);
  const [help, setHelp] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  const canAdvance =
    step === 1
      ? Boolean(userType)
      : step === 2
        ? interests.length >= 3
        : step === 3
          ? goals.length >= 1
          : step === 4
            ? true
            : help.length >= 1;

  async function next() {
    setError(null);
    setPending(true);

    try {
      const payload =
        step === 1
          ? { step, userType, occupation: occupation || undefined, city: city || undefined }
          : step === 2
            ? { step, interestSlugs: interests }
            : step === 3
              ? { step, goalAreas: goals }
              : step === 4
                ? { step, scheduleBlocks: blocks }
                : { step, helpAreas: help };

      await profileClient.saveStep(payload);

      if (step === 5) {
        await profileClient.complete();
        router.replace('/home');
        router.refresh();
        return;
      }

      setStep(step + 1);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  }

  const t = useT();
  const errorText = useErrorText();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,0.85fr)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-ink-subtle font-mono text-xs">Step {step} of 5</span>
        </div>

        <div
          className="mt-6 flex gap-1.5"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={5}
        >
          {[1, 2, 3, 4, 5].map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-500',
                index < step ? 'bg-accent' : 'bg-surface-hover',
              )}
            />
          ))}
        </div>

        <div className="flex flex-1 flex-col py-10">
          <Eyebrow tint="var(--accent)">{t('onboarding.build')}</Eyebrow>
          <h1 className="t-h1 mt-3">
            {step === 1 ? t('onboarding.welcome', { name: displayName.split(' ')[0] ?? '' }) : t(`onboarding.steps.s${step as 1 | 2 | 3 | 4 | 5}.title`)}
          </h1>
          <p className="text-ink-muted mt-2.5 text-[0.9375rem]">
            {step === 1 ? t('onboarding.steps.s1.title') : t(`onboarding.steps.s${step as 1 | 2 | 3 | 4 | 5}.caption`)}
          </p>

          <div className="mt-8 flex-1">
            {step === 1 ? (
              <div className="flex flex-col gap-6">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {USER_TYPES.map((type) => {
                    const Icon = type.icon;
                    const active = userType === type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setUserType(type.value)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-200',
                          active
                            ? 'border-accent bg-accent-soft'
                            : 'border-line bg-surface hover:border-line-strong',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-md',
                            active
                              ? 'bg-accent text-accent-ink'
                              : 'bg-surface-raised text-ink-muted',
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{t(`onboarding.types.${type.value}`)}</span>
                          <span className="text-ink-muted mt-0.5 block text-xs">{t(`onboarding.blurbs.${type.value}`)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('onboarding.whatDo')} hint={t('common.optional')}>
                    <Input
                      placeholder={t('onboarding.whatDoPlaceholder')}
                      value={occupation}
                      onChange={(event) => setOccupation(event.target.value)}
                    />
                  </Field>
                  <Field label={t('onboarding.where')} hint={t('common.optional')}>
                    <Input
                      placeholder="Kigali"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col gap-7">
                {interestGroups.map((group) => (
                  <div key={group.category}>
                    <p className="text-micro text-ink-subtle mb-3 font-semibold uppercase">
                      {interestCategory(t, group.category)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.interests.map((interest) => (
                        <Chip
                          key={interest.slug}
                          active={interests.includes(interest.slug)}
                          onClick={() => toggle(interests, interest.slug, setInterests)}
                        >
                          {interestLabel(t, interest.slug, interest.label)}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-ink-subtle text-xs">
                  {t('onboarding.selected', { n: interests.length })}{interests.length < 3 ? t('onboarding.pickThree') : ''}
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-wrap gap-2">
                {GOALS.map((goal) => (
                  <Chip
                    key={goal.value}
                    active={goals.includes(goal.value)}
                    onClick={() => toggle(goals, goal.value, setGoals)}
                  >
                    {t(`onboarding.goals.${goal.value}`)}
                  </Chip>
                ))}
              </div>
            ) : null}

            {step === 4 ? <ScheduleBuilder blocks={blocks} onChange={setBlocks} /> : null}

            {step === 5 ? (
              <div className="flex flex-wrap gap-2">
                {HELP.map((item) => (
                  <Chip
                    key={item.value}
                    active={help.includes(item.value)}
                    onClick={() => toggle(help, item.value, setHelp)}
                  >
                    {t(`onboarding.help.${item.value}`)}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="border-danger/35 mb-4 rounded-md border bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3.5 py-3">
              <p className="text-sm">{errorText(error)}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
                <ArrowLeft /> {t('common.back')}
              </Button>
            ) : null}

            <Button
              onClick={next}
              loading={pending}
              disabled={!canAdvance}
              size="lg"
              className="ml-auto"
            >
              {step === 5 ? t('onboarding.finish') : t('onboarding.continue')}
              {step === 5 ? <Lightbulb /> : <ArrowRight />}
            </Button>
          </div>
        </div>
      </div>

      <aside className="border-line bg-surface-raised sticky top-0 hidden h-dvh overflow-hidden border-l lg:block">
        <div className="relative flex h-full flex-col justify-center p-10">
          <p className="t-eyebrow text-ink-muted">{t('onboarding.shaping')}</p>
          <div className="mt-4 border-line bg-surface rounded-xl border p-6">
            <div className="flex items-center gap-3">
              <span className="bg-accent text-accent-ink grid size-12 place-items-center rounded-full text-lg font-semibold">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{displayName}</div>
                <div className="truncate text-sm text-ink-muted">
                  {[occupation || (USER_TYPES.some((type) => type.value === userType) ? t(`onboarding.types.${userType as (typeof USER_TYPES)[number]['value']}`) : ''), city]
                    .filter(Boolean)
                    .join(' · ') || t('onboarding.tellUs')}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('onboarding.interests')}
              </div>
              <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
                {interests.length === 0 ? (
                  <span className="text-sm text-ink-muted">
                    {t('onboarding.pickFew')}
                  </span>
                ) : (
                  interestGroups
                    .flatMap((group) => group.interests)
                    .filter((interest) => interests.includes(interest.slug))
                    .slice(0, 10)
                    .map((interest) => (
                      <span
                        key={interest.slug}
                        className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium"
                      >
                        {interestLabel(t, interest.slug, interest.label)}
                      </span>
                    ))
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('onboarding.goalsTitle')}
              </div>
              <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
                {goals.length === 0 ? (
                  <span className="text-sm text-ink-muted">{t('onboarding.thisYear')}</span>
                ) : (
                  GOALS.filter((goal) => goals.includes(goal.value)).map((goal) => (
                    <span
                      key={goal.value}
                      className="bg-accent-soft text-accent rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {t(`onboarding.goals.${goal.value}`)}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                [interests.length, t('onboarding.countInterests')],
                [goals.length, t('onboarding.countGoals')],
                [blocks.length, t('onboarding.countBlocks')],
              ].map(([value, label]) => (
                <div key={label as string} className="rounded-2xl bg-surface-raised px-2 py-3">
                  <div className="num text-xl font-bold">{value}</div>
                  <div className="text-[11px] text-ink-muted">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
