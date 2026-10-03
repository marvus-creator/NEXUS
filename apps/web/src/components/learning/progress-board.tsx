'use client';

import { Card, cn } from '@nexus/ui';
import {
  CalendarCheck,
  CheckCircle2,
  Flame,
  GraduationCap,
  Lightbulb,
  Minus,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ProgressOverview } from '@/lib/learning-client';
import { useFormatDate, useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/types';

function hours(minutes: number) {
  if (minutes === 0) return '0';
  if (minutes < 60) return `${minutes}m`;

  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${whole}h` : `${whole}h ${rest}m`;
}

function Delta({ now, before }: { now: number; before: number }) {
  const t = useT();

  if (before === 0 && now === 0) {
    return <span className="text-ink-subtle text-xs">{t('progress.delta.nothing')}</span>;
  }

  if (before === 0) {
    return (
      <span className="text-nearby flex items-center gap-1 text-xs">
        <TrendingUp className="size-3.5" /> {t('progress.delta.new')}
      </span>
    );
  }

  const change = Math.round(((now - before) / before) * 100);

  if (change === 0) {
    return <span className="text-ink-subtle text-xs">{t('progress.delta.same')}</span>;
  }

  const up = change > 0;

  return (
    <span className={cn('flex items-center gap-1 text-xs', up ? 'text-nearby' : 'text-ink-subtle')}>
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {t(up ? 'progress.delta.more' : 'progress.delta.less', { n: Math.abs(change) })}
    </span>
  );
}

function Heatmap({ series, timezone }: { series: ProgressOverview['series']; timezone: string }) {
  const t = useT();
  const format = useFormatDate();
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


  const monthFor = (week: ProgressOverview['series']) => {
    const first = week.find(Boolean);

    if (!first) return null;

    const date = new Date(`${first.date}T12:00:00Z`);

    return date.getUTCDate() <= 7
      ? format(date, 'monthShort')
      : null;
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <div className="text-ink-subtle grid shrink-0 grid-rows-7 gap-1 pt-[1.125rem] text-[0.625rem]">
        {['', t('progress.heatmap.mon'), '', t('progress.heatmap.wed'), '', t('progress.heatmap.fri'), ''].map((label, index) => (
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
                    ? t('progress.heatmap.nothing', { date: format(`${day.date}T12:00:00Z`, 'dayShort', timezone) })
                    : t('progress.heatmap.day', { date: format(`${day.date}T12:00:00Z`, 'dayShort', timezone), tasks: day.tasks, modules: day.modules, studied: hours(day.minutes) })
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
  const t = useT();
  const format = useFormatDate();
  const { totals, week, previousWeek } = progress;

  const stats = [
    {
      label: t('progress.stats.tasks'),
      value: String(totals.tasksCompleted),
      caption: t('progress.stats.tasksCaption', { n: totals.tasksOpen }),
      icon: CheckCircle2,
      tint: 'var(--accent)',
    },
    {
      label: t('progress.stats.time'),
      value: hours(totals.studyMinutes),
      caption: t(totals.pathsActive + totals.pathsCompleted === 1 ? 'progress.stats.timeCaptionOne' : 'progress.stats.timeCaptionMany', { n: totals.pathsActive + totals.pathsCompleted }),
      icon: Timer,
      tint: 'var(--module-learn)',
    },
    {
      label: t('progress.stats.goals'),
      value: String(totals.goalsAchieved),
      caption: t('progress.stats.goalsCaption', { active: totals.goalsActive, milestones: totals.milestonesDone }),
      icon: Target,
      tint: 'var(--module-people)',
    },
    {
      label: t('progress.stats.events'),
      value: String(totals.eventsAttended),
      caption: t('progress.stats.eventsCaption'),
      icon: CalendarCheck,
      tint: 'var(--module-events)',
    },
  ];

  const insightText = (insight: ProgressOverview['insights'][number]) => {
    if (!insight.key) return insight.text;
    const vars = { ...insight.vars };
    if (insight.key === 'bestDay') {
      vars.day = format(Date.UTC(2026, 0, 4 + Number(vars.day), 12), 'weekday', 'UTC');
    }
    const text = t(`progress.insights.${insight.key}` as MessageKey, vars);
    return text.startsWith('progress.insights.') ? insight.text : text;
  };

  const tones = {
    up: { icon: TrendingUp, color: 'var(--color-nearby, #22C55E)' },
    down: { icon: TrendingDown, color: '#F97316' },
    steady: { icon: Minus, color: 'var(--ink-muted)' },
    tip: { icon: Lightbulb, color: '#F59E0B' },
  } as const;

  return (
    <div>
      {progress.insights.length > 0 ? (
        <Card className="mb-6 p-5">
          <h2 className="text-[0.9375rem] font-semibold">{t('progress.week.title')}</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {progress.insights.map((insight) => {
              const tone = tones[insight.tone];
              return (
                <li key={insight.text} className="bg-surface-raised/60 flex items-start gap-3 rounded-xl p-3 text-sm">
                  <tone.icon className="mt-0.5 size-4 shrink-0" style={{ color: tone.color }} />
                  <span className="leading-relaxed">{insightText(insight)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

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
            <h2 className="text-[0.9375rem] font-semibold">{t('progress.week.twelve')}</h2>
            <p className="text-ink-subtle text-xs">
              {t(progress.activeDays === 1 ? 'progress.week.activeDay' : 'progress.week.activeDays', { n: progress.activeDays, total: progress.windowDays })}
            </p>
          </div>

          <div className="mt-4">
            <Heatmap series={progress.series} timezone={progress.timezone} />
          </div>

          <p className="text-ink-subtle mt-3 text-xs">
            {t('progress.week.legend', { zone: progress.timezone.replace('_', ' ') })}
          </p>
        </Card>

        <aside className="space-y-5">
          <Card
            className="p-5"
            style={{ background: 'color-mix(in oklab, var(--module-events) 8%, var(--surface))' }}
          >
            <div className="flex items-center gap-2">
              <Flame className="size-4" style={{ color: 'var(--module-events)' }} />
              <p className="text-ink-muted text-xs font-medium">{t('progress.week.streak')}</p>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
              {progress.streak}
            </p>
            <p className="text-ink-subtle mt-1 text-xs">
              {progress.streak === 0
                ? t('progress.week.streakStart')
                : t(progress.streak === 1 ? 'progress.week.streakDay' : 'progress.week.streakDays')}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-[0.9375rem] font-semibold">{t('progress.week.thisWeek')}</h2>

            <dl className="mt-3.5 space-y-3.5">
              <div>
                <dt className="flex items-baseline justify-between">
                  <span className="text-ink-muted text-[0.8125rem]">{t('progress.week.tasksDone')}</span>
                  <span className="font-semibold tabular-nums">{week.tasks}</span>
                </dt>
                <dd className="mt-0.5">
                  <Delta now={week.tasks} before={previousWeek.tasks} />
                </dd>
              </div>

              <div>
                <dt className="flex items-baseline justify-between">
                  <span className="text-ink-muted text-[0.8125rem]">{t('progress.week.studied')}</span>
                  <span className="font-semibold tabular-nums">{hours(week.minutes)}</span>
                </dt>
                <dd className="mt-0.5">
                  <Delta now={week.minutes} before={previousWeek.minutes} />
                </dd>
              </div>

              <div>
                <dt className="flex items-baseline justify-between">
                  <span className="text-ink-muted text-[0.8125rem]">{t('progress.week.modules')}</span>
                  <span className="font-semibold tabular-nums">{week.modules}</span>
                </dt>
                <dd className="mt-0.5">
                  <Delta now={week.modules} before={previousWeek.modules} />
                </dd>
              </div>
            </dl>
          </Card>

          {progress.attended.length > 0 ? (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                <GraduationCap className="size-4" style={{ color: 'var(--module-events)' }} />
                {t('progress.week.rooms')}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {progress.attended.slice(0, 5).map((entry) => (
                  <li key={`${entry.title}-${entry.startAt}`} className="text-[0.8125rem]">
                    <p className="truncate font-medium">{entry.title}</p>
                    <p className="text-ink-subtle text-xs">
                      {format(entry.startAt, 'dayShort', progress.timezone)}
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
