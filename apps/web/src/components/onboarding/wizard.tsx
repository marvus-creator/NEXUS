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

const USER_TYPES = [
  { value: 'STUDENT', label: 'Student', icon: GraduationCap, blurb: 'Classes, exams, revision' },
  { value: 'PROFESSIONAL', label: 'Professional', icon: Briefcase, blurb: 'Work, growth, network' },
  { value: 'CREATOR', label: 'Creator', icon: Sparkles, blurb: 'Projects, audience, output' },
  { value: 'BUSINESS_OWNER', label: 'Business owner', icon: Briefcase, blurb: 'Customers, products' },
  { value: 'ENTREPRENEUR', label: 'Entrepreneur', icon: Rocket, blurb: 'Building something new' },
  { value: 'ATHLETE', label: 'Athlete', icon: Dumbbell, blurb: 'Training, fixtures, form' },
  { value: 'OTHER', label: 'Something else', icon: User, blurb: 'Tell Nexus in your own words' },
];

const GOALS = [
  { value: 'CAREER', label: 'Career' },
  { value: 'SCHOOL', label: 'School' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FITNESS', label: 'Fitness' },
  { value: 'LEARNING', label: 'Learning' },
  { value: 'MONEY', label: 'Money' },
  { value: 'CREATIVE', label: 'Creative projects' },
  { value: 'PERSONAL', label: 'Personal goals' },
];

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
];

const STEPS = [
  { title: 'Who are you?', caption: 'So Nexus knows which world to build.' },
  { title: 'What are you into?', caption: 'Pick at least three. You can change these any time.' },
  { title: 'What are you working toward?', caption: 'Goals connect to your tasks and calendar.' },
  { title: 'What does your week look like?', caption: 'Fixed things stay fixed. Nexus plans around them.' },
  { title: 'What should Nexus help with?', caption: 'This shapes what your home page leads with.' },
];

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

  const current = STEPS[step - 1]!;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-ink-subtle font-mono text-xs">Step {step} of 5</span>
      </div>

      <div className="mt-6 flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5}>
        {STEPS.map((_, index) => (
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
        <Eyebrow className="text-accent">Build your Nexus</Eyebrow>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {step === 1 ? `Welcome, ${displayName.split(' ')[0]}.` : current.title}
        </h1>
        <p className="text-ink-muted mt-2.5 text-[0.9375rem]">
          {step === 1 ? current.title : current.caption}
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
                          active ? 'bg-accent text-accent-ink' : 'bg-surface-raised text-ink-muted',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{type.label}</span>
                        <span className="text-ink-muted mt-0.5 block text-xs">{type.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="What do you do?" hint="Optional">
                  <Input
                    placeholder="Software engineering student"
                    value={occupation}
                    onChange={(event) => setOccupation(event.target.value)}
                  />
                </Field>
                <Field label="Where are you?" hint="Optional">
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
                    {group.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.interests.map((interest) => (
                      <Chip
                        key={interest.slug}
                        active={interests.includes(interest.slug)}
                        onClick={() => toggle(interests, interest.slug, setInterests)}
                      >
                        {interest.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-ink-subtle text-xs">
                {interests.length} selected{interests.length < 3 ? ' · pick at least three' : ''}
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
                  {goal.label}
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
                  {item.label}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="border-danger/35 mb-4 rounded-md border bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3.5 py-3">
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
              <ArrowLeft /> Back
            </Button>
          ) : null}

          <Button
            onClick={next}
            loading={pending}
            disabled={!canAdvance}
            size="lg"
            className="ml-auto"
          >
            {step === 5 ? 'Finish' : 'Continue'}
            {step === 5 ? <Lightbulb /> : <ArrowRight />}
          </Button>
        </div>
      </div>
    </div>
  );
}
