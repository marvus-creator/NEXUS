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
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { eventImage } from '@/lib/photos';
import { placesClient, type EventSummary, type PlaceSummary } from '@/lib/places-client';

const SCOPES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'going', label: 'Your events' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'past', label: 'Past' },
] as const;

export function eventWhen(startAt: string, endAt: string | null) {
  const start = new Date(startAt);
  const date = start.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (!endAt) return `${date} · ${time}`;

  const end = new Date(endAt);
  const endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return `${date} · ${time}–${endTime}`;
}

function statusLine(event: EventSummary) {
  if (event.isHost) return 'You are hosting';
  if (event.myStatus === 'GOING') return 'You are going';
  if (event.myStatus === 'INTERESTED') return 'You are interested';
  return `${event.goingCount} going`;
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

export function FeaturedEvent({ event }: { event: EventSummary }) {
  const where = event.place?.name ?? event.locationText;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative block h-[380px] overflow-hidden rounded-3xl"
    >
      <img
        src={eventImage(event)}
        alt=""
        className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,13,16,.92)_0%,rgba(11,13,16,.55)_45%,transparent_80%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="relative flex h-full max-w-xl flex-col justify-end p-6 text-white md:p-10">
        <span className="bg-module-events/20 text-module-events border-module-events/30 mb-4 w-fit rounded-full border px-3 py-1 text-xs font-semibold">
          Featured · {new Date(event.startAt).toLocaleDateString('en-GB', { weekday: 'long' })}
        </span>
        <h2 className="t-d2">{event.title}</h2>
        {event.description ? (
          <p className="mt-3 line-clamp-2 text-white/75">{event.description}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="bg-accent inline-flex h-11 items-center rounded-xl px-5 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(59,130,246,.75)]">
            {event.myStatus === 'GOING' || event.isHost ? 'View details' : 'RSVP'}
          </span>
          <Faces event={event} size={32} />
          <span className="text-white/85">{statusLine(event)}</span>
          {event.spotsLeft !== null ? (
            <span className="bg-module-events/90 num rounded-md px-2 py-1 text-xs font-semibold text-black">
              {event.spotsLeft} spots left
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" /> {eventWhen(event.startAt, event.endAt)}
          </span>
          {where ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {where}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  const where = event.place?.name ?? event.locationText;
  const start = new Date(event.startAt);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative block h-[400px] overflow-hidden rounded-2xl"
    >
      <img
        src={eventImage(event)}
        alt=""
        className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div className="absolute left-4 top-4 rounded-xl bg-white/95 px-3 py-2 text-center text-black">
        <div className="font-mono text-[10px] font-semibold uppercase">
          {start.toLocaleDateString('en-GB', { month: 'short' })}
        </div>
        <div className="font-display text-2xl font-extrabold leading-none">{start.getDate()}</div>
      </div>
      <div className="absolute right-4 top-4 flex gap-1.5">
        {event.isHost ? (
          <span className="bg-accent rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-white">
            Hosting
          </span>
        ) : null}
        {event.myStatus === 'GOING' && !event.isHost ? (
          <span className="bg-success rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-black">
            Going
          </span>
        ) : null}
        {event.visibility !== 'PUBLIC' ? (
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold capitalize text-white backdrop-blur-md">
            {event.visibility.toLowerCase()}
          </span>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <div className="text-module-events text-xs font-semibold">{statusLine(event)}</div>
        <div className="font-display mt-1 text-2xl font-bold leading-tight tracking-tight">
          {event.title}
        </div>
        <div className="mt-1 line-clamp-1 text-sm text-white/70">
          {start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          {where ? ` · ${where}` : ''}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Faces event={event} />
          {event.spotsLeft !== null ? (
            <span className="num text-xs text-white/80">{event.spotsLeft} spots left</span>
          ) : (
            <span className="num text-xs text-white/80">{event.goingCount} going</span>
          )}
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

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [placeSlug, setPlaceSlug] = useState('');
  const [locationText, setLocationText] = useState('');
  const [capacity, setCapacity] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
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
            key={item.value}
            type="button"
            onClick={() => router.push(`/events?scope=${item.value}`)}
            className={cn(
              'inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition',
              scope === item.value
                ? 'bg-ink text-ground border-transparent'
                : 'border-line bg-surface text-ink hover:border-line-strong',
            )}
          >
            {item.label}
          </button>
        ))}

        <Button
          size="sm"
          className="ml-auto"
          variant={composing ? 'secondary' : 'primary'}
          onClick={() => setComposing((value) => !value)}
        >
          {composing ? <X /> : <Plus />}
          {composing ? 'Cancel' : 'New event'}
        </Button>
      </div>

      {composing ? (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-4">
            <Field label="What is happening?">
              <Input
                autoFocus
                value={title}
                placeholder="Kigali Tech Night"
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>

            <Field label="Details" hint="Optional">
              <Textarea
                value={description}
                placeholder="What should people expect?"
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </Field>
              <Field label="Ends" hint="Optional">
                <Input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Where" hint="Pick a known place">
                <select
                  value={placeSlug}
                  onChange={(event) => setPlaceSlug(event.target.value)}
                  className="border-line bg-surface-raised text-ink hover:border-line-strong focus:border-accent-line h-11 w-full rounded-md border px-3.5 text-sm outline-none focus:ring-4 focus:ring-[var(--accent-soft)]"
                >
                  <option value="">No place</option>
                  {places.map((place) => (
                    <option key={place.id} value={place.slug}>
                      {place.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Or describe it" hint="Optional">
                <Input
                  value={locationText}
                  placeholder="Norrsken House, Kigali"
                  onChange={(event) => setLocationText(event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Capacity" hint="Leave empty for no limit">
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  placeholder="40"
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </Field>

              <div>
                <p className="text-ink mb-2 text-sm font-medium">Who can see it?</p>
                <div className="flex gap-1.5">
                  {(['PUBLIC', 'PRIVATE'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVisibility(value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                        visibility === value
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-line text-ink-muted hover:text-ink',
                      )}
                    >
                      {value.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <p className="text-danger text-sm">{error}</p> : null}

            <Button
              onClick={create}
              loading={busy}
              disabled={!title.trim() || !startAt}
              className="self-start"
            >
              <Ticket /> Create event
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
                ? 'You have not said you are going to anything'
                : scope === 'hosting'
                  ? 'You are not hosting anything'
                  : scope === 'past'
                    ? 'Nothing has happened yet'
                    : 'No events coming up'
            }
            description="Create one and invite the people who should be there."
            action={
              <Button size="sm" onClick={() => setComposing(true)}>
                <Plus /> New event
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
