'use client';

import {
  AvatarStack,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Textarea,
  cn,
} from '@nexus/ui';
import { CalendarDays, Clock, MapPin, Plus, Ticket, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { eventImage } from '@/lib/photos';
import { placesClient, type EventSummary, type PlaceSummary } from '@/lib/places-client';
import { ImagePicker } from '@/components/app/image-picker';
import { useErrorText, useFormatDate, useT } from '@/i18n/client';
import type { Translate } from '@/i18n/types';

const SCOPES = ['upcoming', 'going', 'hosting', 'past'] as const;

function useEventWhen() {
  const format = useFormatDate();

  return (startAt: string, endAt: string | null) => {
    const date = format(startAt, 'dayMonthShort');
    const time = format(startAt, 'time');
    if (!endAt) return `${date} · ${time}`;
    return `${date} · ${time}–${format(endAt, 'time')}`;
  };
}

function statusLine(event: EventSummary, t: Translate) {
  if (event.isHost) return t('events.status.hosting');
  if (event.myStatus === 'GOING') return t('events.status.going');
  if (event.myStatus === 'INTERESTED') return t('events.status.interested');
  return t('events.status.goingCount', { n: event.goingCount });
}

function Faces({ event, size = 28 }: { event: EventSummary; size?: number }) {
  if (event.attendees.length === 0) return null;

  return (
    <AvatarStack
      people={event.attendees.map((person) => ({
        name: person.displayName,
        src: person.avatarUrl ?? undefined,
      }))}
      max={4}
      size={size > 28 ? 'sm' : 'xs'}
    />
  );
}

function DateTile({ startAt, large = false }: { startAt: string; large?: boolean }) {
  const format = useFormatDate();
  const start = new Date(startAt);

  return (
    <div
      className={cn(
        'border-line grid shrink-0 place-items-center rounded-lg border text-center leading-none',
        large ? 'size-16' : 'size-12',
      )}
    >
      <div>
        <div className="text-ink-muted text-[10px] font-medium uppercase">{format(start, 'monthShort')}</div>
        <div className={cn('num mt-0.5 font-semibold', large ? 'text-2xl' : 'text-base')}>{start.getDate()}</div>
      </div>
    </div>
  );
}

export function FeaturedEvent({ event }: { event: EventSummary }) {
  const t = useT();
  const format = useFormatDate();
  const eventWhen = useEventWhen();
  const where = event.place?.name ?? event.locationText;
  const cover = eventImage(event);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="border-line bg-surface hover:border-line-strong group block overflow-hidden rounded-xl border transition-colors"
    >
      {cover ? <img src={cover} alt="" className="h-48 w-full object-cover md:h-56" /> : null}
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:p-8">
        <DateTile startAt={event.startAt} large />
        <div className="min-w-0 flex-1">
          <p className="text-ink-muted text-xs font-medium">{t('events.featured', { day: format(event.startAt, 'weekday') })}</p>
          <h2 className="t-h1 mt-1">{event.title}</h2>
          {event.description ? <p className="text-ink-muted mt-2 line-clamp-2 max-w-2xl">{event.description}</p> : null}
          <div className="text-ink-muted mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {eventWhen(event.startAt, event.endAt)}
            </span>
            {where ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" /> {where}
              </span>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="bg-accent text-accent-ink group-hover:bg-accent-strong inline-flex h-10 items-center rounded-lg px-4 font-medium transition-colors">
              {event.myStatus === 'GOING' || event.isHost ? t('events.viewDetails') : t('events.rsvp')}
            </span>
            <Faces event={event} size={32} />
            <span className="text-ink-muted">{statusLine(event, t)}</span>
            {event.spotsLeft !== null ? (
              <Badge variant="warning" size="sm">
                {t('events.status.spotsLeft', { n: event.spotsLeft })}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  const t = useT();
  const format = useFormatDate();
  const where = event.place?.name ?? event.locationText;
  const cover = eventImage(event);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="border-line bg-surface hover:border-line-strong flex flex-col overflow-hidden rounded-xl border transition-colors"
    >
      {cover ? <img src={cover} alt="" className="h-36 w-full object-cover" /> : null}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <DateTile startAt={event.startAt} />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 font-medium leading-snug">{event.title}</div>
            <div className="text-ink-muted mt-1 line-clamp-1 text-sm">
              {format(event.startAt, 'time')}
              {where ? ` · ${where}` : ''}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.isHost ? (
            <Badge variant="accent" size="sm">
              {t('events.status.hostingBadge')}
            </Badge>
          ) : null}
          {event.myStatus === 'GOING' && !event.isHost ? (
            <Badge variant="success" size="sm">
              {t('events.status.goingBadge')}
            </Badge>
          ) : null}
          {event.visibility !== 'PUBLIC' ? (
            <Badge variant="neutral" size="sm">
              {t(`events.visibility.${event.visibility}`)}
            </Badge>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <Faces event={event} />
          <span className="num text-ink-muted text-xs">
            {event.spotsLeft !== null
              ? t('events.status.spotsLeft', { n: event.spotsLeft })
              : t('events.status.goingCount', { n: event.goingCount })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function EventsBoard({
  events,
  scope,
  places,
}: {
  events: EventSummary[];
  scope: string;
  places: PlaceSummary[];
}) {
  const router = useRouter();
  const t = useT();
  const errorText = useErrorText();

  const params = useSearchParams();
  const [composing, setComposing] = useState(params.get('new') === '1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [placeSlug, setPlaceSlug] = useState('');
  const [locationText, setLocationText] = useState('');
  const [capacity, setCapacity] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!title.trim() || !startAt) return;

    setBusy(true);
    setError(null);

    try {
      const created = await placesClient.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        placeSlug: placeSlug || undefined,
        locationText: locationText.trim() || undefined,
        capacity: capacity ? Number(capacity) : undefined,
        visibility,
        coverUrl: cover ?? undefined,
      });

      router.push(`/events/${created.slug}`);
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => router.push(`/events?scope=${item}`)}
            className={cn(
              'inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition',
              scope === item
                ? 'bg-ink text-ground border-transparent'
                : 'border-line bg-surface text-ink hover:border-line-strong',
            )}
          >
            {t(`events.scopes.${item}`)}
          </button>
        ))}

        <Button
          size="sm"
          className="ml-auto"
          variant={composing ? 'secondary' : 'primary'}
          onClick={() => setComposing((value) => !value)}
        >
          {composing ? <X /> : <Plus />}
          {composing ? t('common.cancel') : t('events.newEvent')}
        </Button>
      </div>

      {composing ? (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-4">
            <ImagePicker folder="events" value={cover} onChange={setCover} label={t('social.picker.eventPoster')} />

            <Field label={t('events.form.title')}>
              <Input
                autoFocus
                value={title}
                placeholder={t('events.form.titlePlaceholder')}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>

            <Field label={t('events.form.details')} hint={t('common.optional')}>
              <Textarea
                value={description}
                placeholder={t('events.form.detailsPlaceholder')}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('events.form.starts')}>
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </Field>
              <Field label={t('events.form.ends')} hint={t('common.optional')}>
                <Input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('events.form.where')} hint={t('events.form.whereHint')}>
                <select
                  value={placeSlug}
                  onChange={(event) => setPlaceSlug(event.target.value)}
                  className="border-line bg-surface-raised text-ink hover:border-line-strong focus:border-accent-line h-11 w-full rounded-md border px-3.5 text-sm outline-none focus:ring-4 focus:ring-[var(--accent-soft)]"
                >
                  <option value="">{t('events.form.noPlace')}</option>
                  {places.map((place) => (
                    <option key={place.id} value={place.slug}>
                      {place.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t('events.form.describe')} hint={t('common.optional')}>
                <Input
                  value={locationText}
                  placeholder="Norrsken House, Kigali"
                  onChange={(event) => setLocationText(event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('events.form.capacity')} hint={t('events.form.capacityHint')}>
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  placeholder="40"
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </Field>

              <div>
                <p className="text-ink mb-2 text-sm font-medium">{t('events.form.who')}</p>
                <div className="flex gap-1.5">
                  {(['PUBLIC', 'PRIVATE'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVisibility(value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        visibility === value
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-line text-ink-muted hover:text-ink',
                      )}
                    >
                      {t(`events.visibility.${value}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <p className="text-danger text-sm">{errorText(error)}</p> : null}

            <Button
              onClick={create}
              loading={busy}
              disabled={!title.trim() || !startAt}
              className="self-start"
            >
              <Ticket /> {t('events.form.create')}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6">
        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title={
              scope === 'going'
                ? t('events.empty.going')
                : scope === 'hosting'
                  ? t('events.empty.hosting')
                  : scope === 'past'
                    ? t('events.empty.past')
                    : t('events.empty.upcoming')
            }
            description={t('events.empty.body')}
            action={
              <Button size="sm" onClick={() => setComposing(true)}>
                <Plus /> {t('events.newEvent')}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {scope === 'upcoming' ? <FeaturedEvent event={events[0]!} /> : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(scope === 'upcoming' ? events.slice(1) : events).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
