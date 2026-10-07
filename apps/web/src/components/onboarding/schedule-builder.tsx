'use client';

import { Badge, Button, Field, Input, cn } from '@nexus/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ScheduleBlockInput } from '@/lib/profile-client';
import { useT } from '@/i18n/client';

const DAYS = [
  { index: 1, key: 'd0' },
  { index: 2, key: 'd1' },
  { index: 3, key: 'd2' },
  { index: 4, key: 'd3' },
  { index: 5, key: 'd4' },
  { index: 6, key: 'd5' },
  { index: 0, key: 'd6' },
] as const;

const KINDS: { value: ScheduleBlockInput['kind']; label: string }[] = [
  { value: 'CLASS', label: 'Classes' },
  { value: 'WORK', label: 'Work' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'COMMITMENT', label: 'Commitment' },
  { value: 'OTHER', label: 'Other' },
];

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function ScheduleBuilder({
  blocks,
  onChange,
}: {
  blocks: ScheduleBlockInput[];
  onChange: (blocks: ScheduleBlockInput[]) => void;
}) {
  const [label, setLabel] = useState('Classes');
  const t = useT();
  const [kind, setKind] = useState<ScheduleBlockInput['kind']>('CLASS');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('07:30');
  const [end, setEnd] = useState('17:20');
  const [error, setError] = useState<string | null>(null);

  const startMinute = toMinutes(start);
  const endMinute = toMinutes(end);

  function toggleDay(index: number) {
    setDays((current) =>
      current.includes(index) ? current.filter((day) => day !== index) : [...current, index],
    );
  }

  function add() {
    setError(null);

    if (!label.trim()) {
      setError(t('onboarding.schedule.nameIt'));
      return;
    }

    if (days.length === 0) {
      setError(t('onboarding.schedule.pickDay'));
      return;
    }

    if (endMinute <= startMinute) {
      setError(t('onboarding.schedule.endAfter'));
      return;
    }

    const additions = days.map((dayOfWeek) => ({
      label: label.trim(),
      kind,
      dayOfWeek,
      startMinute,
      endMinute,
    }));

    const merged = [...blocks];

    for (const addition of additions) {
      const clash = merged.some(
        (block) =>
          block.dayOfWeek === addition.dayOfWeek &&
          addition.startMinute < block.endMinute &&
          block.startMinute < addition.endMinute,
      );

      if (!clash) merged.push(addition);
    }

    merged.sort((a, b) =>
      a.dayOfWeek === b.dayOfWeek ? a.startMinute - b.startMinute : a.dayOfWeek - b.dayOfWeek,
    );

    if (merged.length === blocks.length) {
      setError(t('onboarding.schedule.overlaps'));
      return;
    }

    onChange(merged);
  }

  function remove(target: ScheduleBlockInput) {
    onChange(blocks.filter((block) => block !== target));
  }

  const grouped = DAYS.map((day) => ({
    ...day,
    entries: blocks.filter((block) => block.dayOfWeek === day.index),
  })).filter((day) => day.entries.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-line bg-surface rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('onboarding.schedule.what')}>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>

          <Field label={t('onboarding.schedule.type')}>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    kind === option.value
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {t(`onboarding.schedule.kinds.${option.value}`)}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <p className="text-ink mb-2 text-sm font-medium">{t('onboarding.schedule.whichDays')}</p>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((day) => (
              <button
                key={day.index}
                type="button"
                onClick={() => toggleDay(day.index)}
                aria-pressed={days.includes(day.index)}
                className={cn(
                  'w-14 rounded-md border py-2 text-xs font-medium transition-colors',
                  days.includes(day.index)
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {t(`onboarding.schedule.days.${day.key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t('onboarding.schedule.starts')}>
            <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field label={t('onboarding.schedule.ends')}>
            <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </Field>
        </div>

        {error ? <p className="text-danger mt-3 text-xs">{error}</p> : null}

        <Button type="button" variant="secondary" onClick={add} className="mt-4 w-full">
          <Plus /> {t('onboarding.schedule.add')}
        </Button>
      </div>

      {grouped.length > 0 ? (
        <div className="flex flex-col gap-3">
          {grouped.map((day) => (
            <div key={day.index} className="flex items-start gap-4">
              <span className="text-ink-subtle w-10 shrink-0 pt-2 font-mono text-xs">
                {t(`onboarding.schedule.days.${day.key}`)}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                {day.entries.map((entry, index) => (
                  <div
                    key={`${day.index}-${index}`}
                    className="border-line bg-surface-raised flex items-center gap-3 rounded-md border px-3.5 py-2.5"
                  >
                    <span className="flex-1 truncate text-sm">{entry.label}</span>
                    <span className="text-ink-muted shrink-0 font-mono text-xs">
                      {toTime(entry.startMinute)}–{toTime(entry.endMinute)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(entry)}
                      aria-label={t('onboarding.schedule.remove', { label: entry.label, day: t(`onboarding.schedule.days.${day.key}`) })}
                      className="text-ink-subtle hover:text-danger transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Badge size="sm" className="self-start">
            {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} on your week
          </Badge>
        </div>
      ) : (
        <p className="text-ink-subtle text-sm">
          {t('onboarding.schedule.empty')}
          
        </p>
      )}
    </div>
  );
}
