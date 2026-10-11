'use client';

import { Button, cn } from '@nexus/ui';
import { CalendarPlus, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { plannerClient, type SuggestedSlot, type Task } from '@/lib/planner-client';
import { useErrorText, useFormatDate, useT } from '@/i18n/client';

const LENGTHS = [30, 60, 90] as const;

type Booked = { id: string; startAt: string; endAt: string };

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function FindTime({
  task,
  onBooked,
  onClose,
}: {
  task: Task;
  onBooked: (event: Booked, clash: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();
  const format = useFormatDate();
  const errorText = useErrorText();
  const [minutes, setMinutes] = useState<(typeof LENGTHS)[number]>(60);
  const [slots, setSlots] = useState<SuggestedSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setSlots(null);
    setError(null);

    plannerClient
      .suggestSlots(minutes)
      .then((result) => {
        if (live) setSlots(result.slots);
      })
      .catch((caught: Error) => {
        if (live) setError(errorText(caught.message));
      });

    return () => {
      live = false;
    };
  }, [minutes, errorText]);

  function dayName(start: Date) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    if (dayKey(start) === dayKey(now)) return t('tasks.findTime.today');
    if (dayKey(start) === dayKey(tomorrow)) return t('tasks.findTime.tomorrow');
    return format(start, 'dayMonthShort');
  }

  async function book(slot: SuggestedSlot) {
    setBooking(slot.startAt);
    setError(null);

    try {
      const result = await plannerClient.createEvent({
        title: task.title,
        kind: 'TASK',
        taskId: task.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
      });
      onBooked({ id: result.event.id, startAt: slot.startAt, endAt: slot.endAt }, result.clashesWith?.title ?? null);
    } catch (caught) {
      setError(errorText((caught as Error).message));
      setBooking(null);
    }
  }

  return (
    <section
      aria-label={t('tasks.findTime.title', { title: task.title })}
      className="border-line bg-surface-raised mt-3 rounded-xl border p-4"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('tasks.findTime.title', { title: task.title })}</p>
          <p className="text-ink-subtle mt-0.5 text-xs">{t('tasks.findTime.body')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('tasks.findTime.close')}
          className="text-ink-subtle hover:text-ink hover:bg-surface-hover grid size-8 shrink-0 place-items-center rounded-lg"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('tasks.findTime.length')}>
        <span className="text-ink-muted mr-1 text-xs">{t('tasks.findTime.length')}</span>
        {LENGTHS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={minutes === value}
            onClick={() => setMinutes(value)}
            className={cn(
              'min-h-8 rounded-full border px-3 text-xs font-medium transition-colors',
              minutes === value ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-muted hover:text-ink',
            )}
          >
            {t('tasks.findTime.minutes', { n: value })}
          </button>
        ))}
      </div>

      <div className="mt-3" aria-live="polite">
        {slots === null && !error ? (
          <p className="text-ink-subtle flex items-center gap-2 py-3 text-sm">
            <Loader2 className="size-4 animate-spin" /> {t('tasks.findTime.loading')}
          </p>
        ) : null}

        {error ? <p className="text-danger py-2 text-sm" role="alert">{error}</p> : null}

        {slots && slots.length === 0 ? (
          <p className="text-ink-muted py-3 text-sm">{t('tasks.findTime.none', { n: minutes })}</p>
        ) : null}

        {slots && slots.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {slots.map((slot) => {
              const start = new Date(slot.startAt);
              const end = new Date(slot.endAt);
              const roomEnd = new Date(start.getTime() + slot.roomMinutes * 60000);
              const range = `${format(start, 'time')}–${format(end, 'time')}`;

              return (
                <li key={slot.startAt}>
                  <button
                    type="button"
                    disabled={booking !== null}
                    onClick={() => void book(slot)}
                    aria-label={t('tasks.findTime.book', { time: `${dayName(start)} ${range}` })}
                    className="border-line bg-surface hover:border-accent-line focus-visible:ring-accent-line flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                  >
                    <span className="text-accent grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)]">
                      {booking === slot.startAt ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {dayName(start)} · {range}
                      </span>
                      <span className="text-ink-subtle block truncate text-xs">
                        {t('tasks.findTime.room', { time: format(roomEnd, 'time') })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {slots && slots.length === 0 && minutes > 30 ? (
        <Button size="sm" variant="secondary" className="mt-1" onClick={() => setMinutes(30)}>
          {t('tasks.findTime.minutes', { n: 30 })}
        </Button>
      ) : null}
    </section>
  );
}
