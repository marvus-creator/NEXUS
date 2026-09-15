'use client';

import { Avatar, Badge, Button, Card, Field, Input, cn } from '@nexus/ui';
import {
  CalendarDays,
  Check,
  Clock,
  MapPin,
  QrCode,
  Send,
  Star,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { placesClient, type EventSummary } from '@/lib/places-client';

type Attendee = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  checkedIn?: boolean;
};

function when(startAt: string, endAt: string | null) {
  const start = new Date(startAt);
  const date = start.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (!endAt) return `${date} at ${time}`;

  const end = new Date(endAt);
  return `${date} · ${time}–${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function countdown(startAt: string) {
  const diff = new Date(startAt).getTime() - Date.now();

  if (diff < 0) return null;

  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return `in ${Math.max(1, Math.round(diff / 60000))} minutes`;
  if (hours < 24) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export function EventDetail({
  event,
  attendees,
  friends,
}: {
  event: EventSummary;
  attendees: Attendee[];
  friends: { username: string; displayName: string }[];
}) {
  const router = useRouter();

  const [status, setStatus] = useState(event.myStatus);
  const [code, setCode] = useState('');
  const [checkedIn, setCheckedIn] = useState(event.checkedIn);
  const [rating, setRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [invited, setInvited] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const going = attendees.filter((person) => person.status === 'GOING');
  const interested = attendees.filter((person) => person.status === 'INTERESTED');
  const starts = countdown(event.startAt);

  async function rsvp(next: 'GOING' | 'INTERESTED' | 'DECLINED') {
    setBusy('rsvp');
    setError(null);

    try {
      await placesClient.rsvp(event.slug, next);
      setStatus(next);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function checkIn() {
    setBusy('checkin');
    setError(null);

    try {
      await placesClient.checkIn(event.slug, code.trim());
      setCheckedIn(true);
      setNotice('Checked in. Have a good one.');
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submitReview() {
    if (rating === 0) return;

    setBusy('review');
    setError(null);

    try {
      await placesClient.reviewEvent(event.slug, rating, reviewBody.trim() || undefined);
      setNotice('Thanks for the review.');
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function invite(username: string) {
    setBusy(`invite-${username}`);

    try {
      await placesClient.invite(event.slug, [username]);
      setInvited((current) => [...current, username]);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy('cancel');

    try {
      await placesClient.cancel(event.slug);
      router.push('/events');
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(null);
    }
  }

  return (
    <div>
      <div
        className="relative h-40 overflow-hidden rounded-xl sm:h-56"
        style={{
          background:
            'linear-gradient(120deg, color-mix(in oklab, var(--module-events) 26%, var(--surface)) 0%, color-mix(in oklab, var(--accent) 20%, var(--surface)) 60%, var(--surface) 100%)',
        }}
      >
        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="flex flex-wrap items-center gap-2">
            {event.isHost ? <Badge variant="accent" size="sm">You are hosting</Badge> : null}
            {event.hasEnded ? <Badge size="sm">Ended</Badge> : starts ? <Badge variant="success" size="sm">{starts}</Badge> : null}
            {event.visibility !== 'PUBLIC' ? (
              <Badge size="sm" className="capitalize">{event.visibility.toLowerCase()}</Badge>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{event.title}</h1>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-6">
            <div className="flex flex-col gap-3.5 text-sm">
              <div className="flex items-start gap-3">
                <CalendarDays className="text-ink-subtle mt-0.5 size-4 shrink-0" />
                <span>{when(event.startAt, event.endAt)}</span>
              </div>

              {event.place || event.locationText ? (
                <div className="flex items-start gap-3">
                  <MapPin className="text-ink-subtle mt-0.5 size-4 shrink-0" />
                  <span>
                    {event.place ? (
                      <>
                        <span className="font-medium">{event.place.name}</span>
                        {event.place.address ? (
                          <span className="text-ink-muted"> · {event.place.address}</span>
                        ) : null}
                      </>
                    ) : (
                      event.locationText
                    )}
                  </span>
                </div>
              ) : null}

              <div className="flex items-start gap-3">
                <Users className="text-ink-subtle mt-0.5 size-4 shrink-0" />
                <span>
                  {event.goingCount} going
                  {event.interestedCount > 0 ? ` · ${event.interestedCount} interested` : ''}
                  {event.spotsLeft !== null ? ` · ${event.spotsLeft} spots left` : ''}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <Avatar
                  name={event.host.displayName}
                  src={event.host.avatarUrl ?? undefined}
                  size="xs"
                  className="mt-0.5"
                />
                <span className="text-ink-muted">
                  Hosted by{' '}
                  <Link href={`/u/${event.host.username}`} className="text-ink hover:underline">
                    {event.host.displayName}
                  </Link>
                </span>
              </div>
            </div>

            {event.description ? (
              <p className="text-ink-muted border-line mt-5 border-t pt-5 text-sm leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            ) : null}
          </Card>

          {going.length > 0 || interested.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">Who is coming</h2>

              <div className="mt-4 flex flex-col gap-2.5">
                {[...going, ...interested].map((person) => (
                  <div key={person.id} className="flex items-center gap-3">
                    <Avatar name={person.displayName} src={person.avatarUrl ?? undefined} size="sm" />
                    <Link
                      href={`/u/${person.username}`}
                      className="min-w-0 flex-1 truncate text-sm hover:underline"
                    >
                      {person.displayName}
                    </Link>
                    {person.checkedIn ? (
                      <Badge variant="success" size="sm">
                        <Check /> Checked in
                      </Badge>
                    ) : (
                      <Badge
                        variant={person.status === 'GOING' ? 'accent' : 'neutral'}
                        size="sm"
                        className="capitalize"
                      >
                        {person.status.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {event.hasEnded && status === 'GOING' ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">How was it?</h2>
              <div className="mt-4 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} stars`}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'size-6',
                        value <= rating ? 'text-warning fill-current' : 'text-ink-subtle',
                      )}
                    />
                  </button>
                ))}
              </div>
              <Field label="Anything to add?" hint="Optional" className="mt-4">
                <Input
                  value={reviewBody}
                  placeholder="Worth going again?"
                  onChange={(event) => setReviewBody(event.target.value)}
                />
              </Field>
              <Button
                className="mt-4"
                size="sm"
                loading={busy === 'review'}
                disabled={rating === 0}
                onClick={() => void submitReview()}
              >
                Leave review
              </Button>
            </Card>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {!event.isHost && !event.hasEnded ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">Are you going?</h2>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant={status === 'GOING' ? 'primary' : 'secondary'}
                  loading={busy === 'rsvp'}
                  onClick={() => void rsvp('GOING')}
                  disabled={status !== 'GOING' && event.spotsLeft === 0}
                >
                  <Check /> {status === 'GOING' ? 'You are going' : 'Going'}
                </Button>
                <Button
                  variant={status === 'INTERESTED' ? 'primary' : 'secondary'}
                  loading={busy === 'rsvp'}
                  onClick={() => void rsvp('INTERESTED')}
                >
                  Interested
                </Button>
                {status ? (
                  <Button variant="ghost" size="sm" onClick={() => void rsvp('DECLINED')}>
                    <X /> Not going
                  </Button>
                ) : null}
              </div>

              {event.spotsLeft === 0 && status !== 'GOING' ? (
                <p className="text-ink-subtle mt-3 text-xs">
                  This event is full, but you can still mark yourself interested.
                </p>
              ) : null}
            </Card>
          ) : null}

          {event.isHost ? (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <QrCode className="text-accent size-4" />
                <h2 className="text-[0.9375rem] font-semibold">Check-in code</h2>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Attendees enter this at the door. Only you can see it.
              </p>
              <p className="border-accent-line bg-accent-soft mt-4 rounded-lg border px-4 py-3 text-center font-mono text-2xl font-semibold tracking-[0.3em]">
                {event.checkInCode}
              </p>
              <p className="text-ink-subtle mt-3 text-xs">
                {event.checkedInCount} of {event.goingCount} checked in · opens two hours before the
                start.
              </p>

              <Button
                variant="ghost"
                size="sm"
                className="text-danger mt-4"
                loading={busy === 'cancel'}
                onClick={() => void cancel()}
              >
                Cancel event
              </Button>
            </Card>
          ) : status === 'GOING' && !event.hasEnded ? (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <Ticket className="text-accent size-4" />
                <h2 className="text-[0.9375rem] font-semibold">Check in</h2>
              </div>

              {checkedIn ? (
                <p className="text-success mt-3 inline-flex items-center gap-2 text-sm">
                  <Check className="size-4" /> You are checked in
                </p>
              ) : (
                <>
                  <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                    The host will give you a code when you arrive.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Input
                      value={code}
                      placeholder="ABC123"
                      className="font-mono tracking-widest uppercase"
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                    />
                    <Button
                      loading={busy === 'checkin'}
                      disabled={code.trim().length < 4}
                      onClick={() => void checkIn()}
                    >
                      Go
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ) : null}

          {friends.length > 0 && !event.hasEnded ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">Invite friends</h2>
              <div className="mt-4 flex flex-col gap-2">
                {friends.slice(0, 6).map((friend) => (
                  <div key={friend.username} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{friend.displayName}</span>
                    {invited.includes(friend.username) ? (
                      <Badge variant="success" size="sm">
                        Invited
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === `invite-${friend.username}`}
                        onClick={() => void invite(friend.username)}
                      >
                        <Send /> Invite
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {event.rating !== null ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">Rating</h2>
              <p className="mt-3 flex items-center gap-2">
                <Star className="text-warning size-5 fill-current" />
                <span className="font-mono text-lg font-semibold">{event.rating}</span>
                <span className="text-ink-subtle text-xs">
                  from {event.reviewCount} {event.reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              </p>
            </Card>
          ) : null}
        </div>
      </div>

      {notice ? <p className="text-success mt-4 text-sm">{notice}</p> : null}
      {error ? <p className="text-danger mt-4 text-sm">{error}</p> : null}
    </div>
  );
}
