'use client';

import { AvatarStack, Badge, Button, Card, EmptyState, Field, Input, Textarea, cn } from '@nexus/ui';
import { CalendarDays, Clock, MapPin, Plus, Ticket, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { placesClient, type EventSummary, type PlaceSummary } from '@/lib/places-client';

const SCOPES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'going', label: 'Your events' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'past', label: 'Past' },
] as const;

export function eventWhen(startAt: string, endAt: string | null) {
  const start = new Date(startAt);
  const date = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (!endAt) return `${date} · ${time}`;

  const end = new Date(endAt);
  const endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return `${date} · ${time}–${endTime}`;
}

export function EventCard({ event }: { event: EventSummary }) {
  const where = event.place?.name ?? event.locationText;

  return (
    <Card interactive className="flex flex-col p-5">
      <div className="flex items-start gap-4">
        <div className="border-line bg-surface-raised flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border">
          <span className="text-micro text-ink-subtle font-semibold uppercase">
            {new Date(event.startAt).toLocaleDateString('en-GB', { month: 'short' })}
          </span>
          <span className="font-mono text-lg leading-none font-semibold">
            {new Date(event.startAt).getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/events/${event.slug}`} className="truncate text-[0.9375rem] font-semibold hover:underline">
              {event.title}
            </Link>
            {event.isHost ? <Badge variant="accent" size="sm">Hosting</Badge> : null}
            {event.myStatus === 'GOING' && !event.isHost ? (
              <Badge variant="success" size="sm">Going</Badge>
            ) : null}
            {event.myStatus === 'INTERESTED' ? <Badge size="sm">Interested</Badge> : null}
            {event.visibility !== 'PUBLIC' ? (
              <Badge size="sm" className="capitalize">{event.visibility.toLowerCase()}</Badge>
            ) : null}
          </div>

          <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {eventWhen(event.startAt, event.endAt)}
            </span>
            {where ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {where}
              </span>
            ) : null}
          </div>

          {event.description ? (
            <p className="text-ink-muted mt-2.5 line-clamp-2 text-sm leading-relaxed">
              {event.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-line mt-4 flex items-center justify-between gap-3 border-t pt-3.5">
        <div className="flex items-center gap-3">
          {event.attendees.length > 0 ? (
            <AvatarStack
              people={event.attendees.map((person) => ({
                name: person.displayName,
                src: person.avatarUrl ?? undefined,
              }))}
              max={4}
              size="xs"
            />
          ) : null}
          <span className="text-ink-subtle text-xs">
            {event.goingCount} going
            {event.spotsLeft !== null ? ` · ${event.spotsLeft} left` : ''}
          </span>
        </div>

        <Button asChild size="sm" variant="secondary">
          <Link href={`/events/${event.slug}`}>Open</Link>
        </Button>
      </div>
    </Card>
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
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              scope === item.value
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
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

      <div className="mt-6 flex flex-col gap-4">
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
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
