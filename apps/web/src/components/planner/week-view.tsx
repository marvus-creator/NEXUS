'use client';

import { Badge, Button, Card, Field, Input, cn } from '@nexus/ui';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { plannerClient, type CalendarDay } from '@/lib/planner-client';
import { useErrorText, useFormatDate, useT } from '@/i18n/client';

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const SPAN = DAY_END - DAY_START;

const KIND_TINT: Record<string, string> = {
  CLASS: 'var(--module-learn)',
  WORK: 'var(--accent)',
  TRAINING: 'var(--module-nearby)',
  COMMITMENT: 'var(--module-events)',
  OTHER: 'var(--ink-subtle)',
  STUDY: 'var(--module-learn)',
  PERSONAL: 'var(--accent)',
  TASK: 'var(--module-events)',
};

function label(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function position(startMinute: number, endMinute: number) {
  const top = ((Math.max(startMinute, DAY_START) - DAY_START) / SPAN) * 100;
  const height = ((Math.min(endMinute, DAY_END) - Math.max(startMinute, DAY_START)) / SPAN) * 100;

  return { top: `${top}%`, height: `${Math.max(height, 2.5)}%` };
}

export function WeekView({
  days,
  weekStartIso,
  todayKey,
}: {
  days: CalendarDay[];
  weekStartIso: string;
  todayKey: string;
}) {
  const router = useRouter();
  const t = useT();
  const format = useFormatDate();
  const errorText = useErrorText();

  const [composing, setComposing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('20:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clash, setClash] = useState<string | null>(null);

  const weekStart = new Date(weekStartIso);

  function shiftWeek(weeks: number) {
    const next = new Date(weekStart.getTime() + weeks * 7 * 86400000);
    router.push(`/calendar?week=${next.toISOString().slice(0, 10)}`);
  }

  async function addEvent(dateKey: string) {
    if (!title.trim()) return;

    setBusy(true);
    setError(null);
    setClash(null);

    try {
      const result = await plannerClient.createEvent({
        title: title.trim(),
        kind: 'PERSONAL',
        startAt: new Date(`${dateKey}T${start}:00`).toISOString(),
        endAt: new Date(`${dateKey}T${end}:00`).toISOString(),
      });

      if (result.clashesWith) {
        setClash(t('calendar.clash', { title: result.clashesWith.title }));
      }

      setTitle('');
      setComposing(null);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(id: string) {
    try {
      await plannerClient.deleteEvent(id);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, index) => DAY_START + index * 60);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon-sm" onClick={() => shiftWeek(-1)} aria-label={t('calendar.previous')}>
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="icon-sm" onClick={() => shiftWeek(1)} aria-label={t('calendar.next')}>
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/calendar')}>
            {t('calendar.thisWeek')}
          </Button>
        </div>

        <div className="text-ink-muted flex flex-wrap items-center gap-3 text-xs">
          {[
            { label: 'Fixed', tint: 'var(--module-learn)' },
            { label: 'Events', tint: 'var(--accent)' },
            { label: 'Free', tint: 'var(--module-nearby)' },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.tint }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {clash ? (
        <div className="border-warning/35 mt-4 rounded-md border bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] px-3.5 py-3">
          <p className="text-sm">{clash}</p>
        </div>
      ) : null}

      {error ? <p className="text-danger mt-4 text-sm">{errorText(error)}</p> : null}

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-[46rem]">
            <div className="border-line w-14 shrink-0 border-r pt-11">
              {hours.slice(0, -1).map((hour) => (
                <div key={hour} className="text-ink-subtle relative h-14 pr-2 text-right font-mono text-[0.625rem]">
                  <span className="absolute -top-1.5 right-2">{label(hour)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-1">
              {days.map((day) => {
                const isToday = day.dateKey === todayKey;
                const dayNumber = Number(day.dateKey.slice(8, 10));

                return (
                  <div key={day.dateKey} className="border-line min-w-0 flex-1 border-r last:border-r-0">
                    <div
                      className={cn(
                        'border-line flex h-11 flex-col items-center justify-center border-b',
                        isToday && 'bg-accent-soft',
                      )}
                    >
                      <span className="text-micro text-ink-subtle font-semibold uppercase">
                        {format(`${day.dateKey}T12:00:00Z`, 'weekdayShort', 'UTC')}
                      </span>
                      <span className={cn('text-xs font-medium', isToday && 'text-accent')}>
                        {dayNumber}
                      </span>
                    </div>

                    <div className="relative" style={{ height: `${((DAY_END - DAY_START) / 60) * 3.5}rem` }}>
                      {hours.slice(0, -1).map((hour, index) => (
                        <div
                          key={hour}
                          className="border-line/60 absolute inset-x-0 border-t"
                          style={{ top: `${(index / ((DAY_END - DAY_START) / 60)) * 100}%` }}
                        />
                      ))}

                      {day.gaps.map((gap) => (
                        <div
                          key={`gap-${gap.startMinute}`}
                          className="absolute inset-x-1 rounded-sm"
                          style={{
                            ...position(gap.startMinute, gap.endMinute),
                            backgroundColor: 'color-mix(in oklab, var(--module-nearby) 7%, transparent)',
                          }}
                          title={`${duration(gap.minutes)} free`}
                        />
                      ))}

                      {day.fixed.map((block) => (
                        <div
                          key={block.id}
                          className="absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1"
                          style={{
                            ...position(block.startMinute, block.endMinute),
                            backgroundColor: `color-mix(in oklab, ${KIND_TINT[block.kind] ?? 'var(--accent)'} 22%, transparent)`,
                            borderLeft: `2px solid ${KIND_TINT[block.kind] ?? 'var(--accent)'}`,
                          }}
                        >
                          <p className="truncate text-[0.625rem] font-medium">{block.label}</p>
                          <p className="text-ink-muted truncate font-mono text-[0.5625rem]">
                            {label(block.startMinute)}
                          </p>
                        </div>
                      ))}

                      {day.events.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => void removeEvent(event.id)}
                          title={t('calendar.clickRemove', { title: event.title })}
                          className="absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-left"
                          style={{
                            ...position(event.startMinute, event.endMinute),
                            backgroundColor: `color-mix(in oklab, ${KIND_TINT[event.kind] ?? 'var(--accent)'} 32%, transparent)`,
                            borderLeft: `2px solid ${KIND_TINT[event.kind] ?? 'var(--accent)'}`,
                          }}
                        >
                          <p className="truncate text-[0.625rem] font-medium">{event.title}</p>
                          <p className="text-ink-muted truncate font-mono text-[0.5625rem]">
                            {label(event.startMinute)}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="border-line border-t p-1.5">
                      {day.tasks.length > 0 ? (
                        <div className="mb-1.5 flex flex-col gap-1">
                          {day.tasks.slice(0, 3).map((task) => (
                            <span
                              key={task.id}
                              className="border-line bg-surface-raised truncate rounded px-1.5 py-1 text-[0.5625rem]"
                              title={task.title}
                            >
                              {task.title}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {composing === day.dateKey ? (
                        <div className="flex flex-col gap-1.5">
                          <Input
                            autoFocus
                            value={title}
                            placeholder={t('calendar.eventPlaceholder')}
                            className="h-7 px-2 text-[0.625rem]"
                            onChange={(event) => setTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') void addEvent(day.dateKey);
                              if (event.key === 'Escape') setComposing(null);
                            }}
                          />
                          <div className="flex gap-1">
                            <Input
                              type="time"
                              value={start}
                              className="h-7 px-1 text-[0.5625rem]"
                              onChange={(event) => setStart(event.target.value)}
                            />
                            <Input
                              type="time"
                              value={end}
                              className="h-7 px-1 text-[0.5625rem]"
                              onChange={(event) => setEnd(event.target.value)}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-7 flex-1 text-[0.625rem]"
                              loading={busy}
                              onClick={() => void addEvent(day.dateKey)}
                            >
                              {t('calendar.add')}
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="h-7"
                              onClick={() => setComposing(null)}
                            >
                              <X />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setComposing(day.dateKey)}
                          className="text-ink-subtle hover:text-ink hover:bg-surface-hover flex w-full items-center justify-center gap-1 rounded py-1.5 text-[0.625rem] transition-colors"
                        >
                          <Plus className="size-3" /> {t('calendar.event')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5 flex flex-wrap gap-3">
        {days
          .filter((day) => day.dateKey === todayKey)
          .map((day) => (
            <Card key={day.dateKey} className="flex-1 p-5">
              <p className="text-[0.9375rem] font-semibold">{t('calendar.glance')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge size="sm">{t('calendar.fixed', { n: day.fixed.length })}</Badge>
                <Badge variant="accent" size="sm">
                  {t('calendar.events', { n: day.events.length })}
                </Badge>
                <Badge variant="success" size="sm">
                  {day.gaps.reduce((total, gap) => total + gap.minutes, 0) >= 60
                    ? t('calendar.free', { duration: duration(day.gaps.reduce((total, gap) => total + gap.minutes, 0)) })
                    : t('calendar.littleFree')}
                </Badge>
                {day.tasks.length > 0 ? (
                  <Badge variant="warning" size="sm">
                    {t('calendar.due', { n: day.tasks.length })}
                  </Badge>
                ) : null}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
