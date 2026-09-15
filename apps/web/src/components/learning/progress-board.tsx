'use client';

import { Card, cn } from '@nexus/ui';
import {
  CalendarCheck,
  CheckCircle2,
  Flame,
  GraduationCap,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ProgressOverview } from '@/lib/learning-client';

function hours(minutes: number) {
  if (minutes === 0) return '0';
  if (minutes < 60) return `${minutes}m`;

  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${whole}h` : `${whole}h ${rest}m`;
}

function Delta({ now, before, unit }: { now: number; before: number; unit: string }) {
  if (before === 0 && now === 0) {
    return <span className="text-ink-subtle text-xs">nothing last week either</span>;
  }

  if (before === 0) {
    return (
      <span className="text-nearby flex items-center gap-1 text-xs">
        <TrendingUp className="size-3.5" /> new this week
      </span>
    );
  }

  const change = Math.round(((now - before) / before) * 100);

  if (change === 0) {
    return <span className="text-ink-subtle text-xs">same as last week</span>;
  }

  const up = change > 0;

  return (
    <span className={cn('flex items-center gap-1 text-xs', up ? 'text-nearby' : 'text-ink-subtle')}>
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {Math.abs(change)}% {up ? 'more' : 'less'} {unit} than last week
    </span>
  );
}

function Heatmap({ series, timezone }: { series: ProgressOverview['series']; timezone: string }) {
  const max = Math.max(1, ...series.map((day) => day.tasks + day.modules + day.sessions));
  const weeks: ProgressOverview['series'][] = [];

  const leading = new Date(`${series[0]!.date}T12:00:00Z`).getUTCDay();
  let current: ProgressOverview['series'] = new Array(leading).fill(null);

  for (const day of series) {
    current.push(day);

    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }

  if (current.length > 0) weeks.push(current);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
  });

  const monthFor = (week: ProgressOverview['series']) => {
    const first = week.find(Boolean);

    if (!first) return null;

    const date = new Date(`${first.date}T12:00:00Z`);

    return date.getUTCDate() <= 7
      ? new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date)
      : null;
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <div className="text-ink-subtle grid shrink-0 grid-rows-7 gap-1 pt-[1.125rem] text-[0.625rem]">
        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, index) => (
          <span key={index} className="flex h-4 items-center leading-none">
            {label}
          </span>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid shrink-0 grid-rows-[0.875rem_repeat(7,1rem)] gap-1">
          <span className="text-ink-subtle text-[0.625rem] leading-none whitespace-nowrap">
            {monthFor(week)}
          </span>

          {week.map((day, dayIndex) => {
            if (!day) return <span key={dayIndex} className="size-4" />;

            const total = day.tasks + day.modules + day.sessions;
            const intensity = total === 0 ? 0 : 0.2 + (total / max) * 0.8;

            return (
              <span
                key={day.date}
                title={
                  total === 0
                    ? `${formatter.format(new Date(`${day.date}T12:00:00Z`))} — nothing logged`
                    : `${formatter.format(new Date(`${day.date}T12:00:00Z`))} — ${day.tasks} tasks, ${day.modules} modules, ${hours(day.minutes)} studied`
                }
                className="border-border/60 size-4 rounded-[3px] border"
                style={
                  total === 0
                    ? undefined
                    : {
                        background: `color-mix(in oklab, var(--module-learn) ${Math.round(intensity * 100)}%, transparent)`,
                        borderColor: 'transparent',
                      }
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ProgressBoard({ progress }: { progress: ProgressOverview }) {
  const { totals, week, previousWeek } = progress;

  const stats = [
    {
      label: 'Tasks completed',
      value: String(totals.tasksCompleted),
      caption: `${totals.tasksOpen} still open`,
      icon: CheckCircle2,
      tint: 'var(--accent)',
    },
    {
      label: 'Time studied',
      value: hours(totals.studyMinutes),
      caption: `across ${totals.pathsActive + totals.pathsCompleted} ${totals.pathsActive + totals.pathsCompleted === 1 ? 'path' : 'paths'}`,
      icon: Timer,
      tint: 'var(--module-learn)',
    },
    {
      label: 'Goals achieved',
      value: String(totals.goalsAchieved),
      caption: `${totals.goalsActive} in progress · ${totals.milestonesDone} milestones`,
      icon: Target,
      tint: 'var(--module-people)',
    },
    {
      label: 'Events attended',
      value: String(totals.eventsAttended),
      caption: 'checked in at the door',
      icon: CalendarCheck,
      tint: 'var(--module-events)',
    },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2">
              <stat.icon className="size-4" style={{ color: stat.tint }} />
              <p className="text-ink-muted text-xs font-medium">{stat.label}</p>
            </div>
            <p className="mt-2.5 text-3xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
            <p className="text-ink-subtle mt-1 text-xs">{stat.caption}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.9375rem] font-semibold">The last twelve weeks</h2>
            <p className="text-ink-subtle text-xs">
              {progress.activeDays} active {progress.activeDays === 1 ? 'day' : 'days'} of{' '}
              {progress.windowDays}
            </p>
          </div>

          <div className="mt-4">
            <Heatmap series={progress.series} timezone={progress.timezone} />
          </div>

          <p className="text-ink-subtle mt-3 text-xs">
            A square fills in on any day you finished a task, completed a module, or logged study
            time. Counted in {progress.timezone.replace('_', ' ')}.
          </p>
        </Card>

        <aside className="space-y-5">
          <Card
            className="p-5"
            style={{ background: 'color-mix(in oklab, var(--module-events) 8%, var(--surface))' }}
          >
            <div className="flex items-center gap-2">
              <Flame className="size-4" style={{ color: 'var(--module-events)' }} />
              <p className="text-ink-muted text-xs font-medium">Current streak</p>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
              {progress.streak}
            </p>
            <p className="text-ink-subtle mt-1 text-xs">
              {progress.streak === 0
                ? 'Finish one thing today to start it.'
                : `consecutive ${progress.streak === 1 ? 'day' : 'days'} with something done`}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-[0.9375rem] font-semibold">This week</h2>

            <dl className="mt-3.5 space-y-3.5">
              <div>
                <dt className="flex items-baseline justify-between">
                  <span className="text-ink-muted text-[0.8125rem]">Tasks done</span>
                  <span className="font-semibold tabular-nums">{week.tasks}</span>
                </dt>
                <dd className="mt-0.5">
                  <Delta now={week.tasks} before={previousWeek.tasks} unit="done" />
                </dd>
              </div>

              <div>
                <dt className="flex items-baseline justify-between">
                  <span className="text-ink-muted text-[0.8125rem]">Studied</span>
                  <span className="font-semibold tabular-nums">{hours(week.minutes)}</span>
                </dt>
                <dd className="mt-0.5">
                  <Delta now={week.minutes} before={previousWeek.minutes} unit="studied" />
                </dd>
              </div>

              <div>
                <dt className="flex items-baseline justify-between">
                  <span className="text-ink-muted text-[0.8125rem]">Modules finished</span>
                  <span className="font-semibold tabular-nums">{week.modules}</span>
                </dt>
                <dd className="mt-0.5">
                  <Delta now={week.modules} before={previousWeek.modules} unit="finished" />
                </dd>
              </div>
            </dl>
          </Card>

          {progress.attended.length > 0 ? (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                <GraduationCap className="size-4" style={{ color: 'var(--module-events)' }} />
                Rooms you turned up in
              </h2>
              <ul className="mt-3 space-y-2.5">
                {progress.attended.slice(0, 5).map((entry) => (
                  <li key={`${entry.title}-${entry.startAt}`} className="text-[0.8125rem]">
                    <p className="truncate font-medium">{entry.title}</p>
                    <p className="text-ink-subtle text-xs">
                      {new Intl.DateTimeFormat('en-GB', {
                        timeZone: progress.timezone,
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(entry.startAt))}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
