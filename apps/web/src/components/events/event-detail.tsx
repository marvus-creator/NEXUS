'use client';

import { Avatar, Badge, Button, Card, Field, Input, cn } from '@nexus/ui';
import { eventImage } from '@/lib/photos';
import { CoverButton } from '@/components/app/cover-button';
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
import { useErrorText, useFormatDate, useT } from '@/i18n/client';
import type { Translate } from '@/i18n/types';

type Attendee = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  checkedIn?: boolean;
};

function countdown(startAt: string, t: Translate) {
  const diff = new Date(startAt).getTime() - Date.now();

  if (diff < 0) return null;

  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return t('events.detail.inMinutes', { n: Math.max(1, Math.round(diff / 60000)) });
  if (hours < 24) return t(hours === 1 ? 'events.detail.inHour' : 'events.detail.inHours', { n: hours });

  const days = Math.round(hours / 24);
  return t(days === 1 ? 'events.detail.inDay' : 'events.detail.inDays', { n: days });
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
  const t = useT();
  const format = useFormatDate();
  const errorText = useErrorText();

  const when = (startAt: string, endAt: string | null) => {
    const date = `${format(startAt, 'weekday')}, ${format(startAt, 'dayMonth')}`;
    const time = format(startAt, 'time');
    if (!endAt) return t('events.detail.at', { date, time });
    return `${date} · ${time}–${format(endAt, 'time')}`;
  };

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
  const starts = countdown(event.startAt, t);

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
      setNotice(t('events.detail.checkedInNotice'));
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
      setNotice(t('events.detail.reviewNotice'));
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
      <div className="relative h-[340px] overflow-hidden rounded-3xl sm:h-[420px]">
        <img src={eventImage(event)} alt="" className="absolute inset-0 size-full object-cover" />
        {event.isHost ? (
          <CoverButton target={{ kind: 'event', slug: event.slug }} className="absolute top-5 right-5 z-10" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,.15)_0%,rgba(11,13,16,.35)_45%,rgba(11,13,16,.92)_100%)]" />
        <div className="absolute top-5 left-5 rounded-2xl bg-white/95 px-4 py-2.5 text-center text-black shadow-lg">
          <div className="font-mono text-[11px] font-semibold uppercase">
            {format(event.startAt, 'monthShort')}
          </div>
          <div className="font-display text-3xl leading-none font-extrabold">
            {new Date(event.startAt).getDate()}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {event.isHost ? <Badge variant="accent">{t('events.status.hosting')}</Badge> : null}
            {event.hasEnded ? <Badge>{t('events.detail.ended')}</Badge> : starts ? <Badge variant="success">{starts}</Badge> : null}
            {event.visibility !== 'PUBLIC' ? (
              <Badge>{t(`events.visibility.${event.visibility}`)}</Badge>
            ) : null}
          </div>
          <h1 className="t-d2 mt-3 max-w-3xl">{event.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" /> {when(event.startAt, event.endAt)}
            </span>
            {event.place || event.locationText ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {event.place?.name ?? event.locationText}
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <Users className="size-4" /> {t('events.status.goingCount', { n: event.goingCount })}
            </span>
          </div>
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
                  {t('events.status.goingCount', { n: event.goingCount })}
                  {event.interestedCount > 0 ? ` · ${t('events.status.interestedCount', { n: event.interestedCount })}` : ''}
                  {event.spotsLeft !== null ? ` · ${t('events.status.spotsLeft', { n: event.spotsLeft })}` : ''}
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
                  {t('events.detail.hostedBy')}{' '}
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
              <h2 className="text-[0.9375rem] font-semibold">{t('events.detail.whoIsComing')}</h2>

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
                        <Check /> {t('events.detail.checkedIn')}
                      </Badge>
                    ) : (
                      <Badge
                        variant={person.status === 'GOING' ? 'accent' : 'neutral'}
                        size="sm"
                      >
                        {person.status === 'GOING' || person.status === 'INTERESTED' || person.status === 'DECLINED'
                          ? t(`events.detail.attendee.${person.status}`)
                          : person.status.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {event.hasEnded && status === 'GOING' ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">{t('events.detail.howWasIt')}</h2>
              <div className="mt-4 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={t('events.detail.stars', { n: value })}
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
              <Field label={t('events.detail.anythingToAdd')} hint={t('common.optional')} className="mt-4">
                <Input
                  value={reviewBody}
                  placeholder={t('events.detail.worthIt')}
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
                {t('events.detail.leaveReview')}
              </Button>
            </Card>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {!event.isHost && !event.hasEnded ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">{t('events.detail.areYouGoing')}</h2>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant={status === 'GOING' ? 'primary' : 'secondary'}
                  loading={busy === 'rsvp'}
                  onClick={() => void rsvp('GOING')}
                  disabled={status !== 'GOING' && event.spotsLeft === 0}
                >
                  <Check /> {status === 'GOING' ? t('events.status.going') : t('events.detail.going')}
                </Button>
                <Button
                  variant={status === 'INTERESTED' ? 'primary' : 'secondary'}
                  loading={busy === 'rsvp'}
                  onClick={() => void rsvp('INTERESTED')}
                >
                  {t('events.detail.interested')}
                </Button>
                {status ? (
                  <Button variant="ghost" size="sm" onClick={() => void rsvp('DECLINED')}>
                    <X /> {t('events.detail.notGoing')}
                  </Button>
                ) : null}
              </div>

              {event.spotsLeft === 0 && status !== 'GOING' ? (
                <p className="text-ink-subtle mt-3 text-xs">
                  {t('events.detail.full')}
                </p>
              ) : null}
            </Card>
          ) : null}

          {event.isHost ? (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <QrCode className="text-accent size-4" />
                <h2 className="text-[0.9375rem] font-semibold">{t('events.detail.codeTitle')}</h2>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                {t('events.detail.codeBody')}
              </p>
              <p className="border-accent-line bg-accent-soft mt-4 rounded-lg border px-4 py-3 text-center font-mono text-2xl font-semibold tracking-[0.3em]">
                {event.checkInCode}
              </p>
              <p className="text-ink-subtle mt-3 text-xs">
                {t('events.detail.codeStats', { checked: event.checkedInCount, going: event.goingCount })}
              </p>

              <Button
                variant="ghost"
                size="sm"
                className="text-danger mt-4"
                loading={busy === 'cancel'}
                onClick={() => void cancel()}
              >
                {t('events.detail.cancelEvent')}
              </Button>
            </Card>
          ) : status === 'GOING' && !event.hasEnded ? (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <Ticket className="text-accent size-4" />
                <h2 className="text-[0.9375rem] font-semibold">{t('events.detail.checkInTitle')}</h2>
              </div>

              {checkedIn ? (
                <p className="text-success mt-3 inline-flex items-center gap-2 text-sm">
                  <Check className="size-4" /> {t('events.detail.youAreIn')}
                </p>
              ) : (
                <>
                  <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                    {t('events.detail.hostGives')}
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
                      {t('events.detail.go')}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ) : null}

          {friends.length > 0 && !event.hasEnded ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">{t('events.detail.inviteFriends')}</h2>
              <div className="mt-4 flex flex-col gap-2">
                {friends.slice(0, 6).map((friend) => (
                  <div key={friend.username} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{friend.displayName}</span>
                    {invited.includes(friend.username) ? (
                      <Badge variant="success" size="sm">
                        {t('events.detail.invited')}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === `invite-${friend.username}`}
                        onClick={() => void invite(friend.username)}
                      >
                        <Send /> {t('events.detail.invite')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {event.rating !== null ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">{t('events.detail.rating')}</h2>
              <p className="mt-3 flex items-center gap-2">
                <Star className="text-warning size-5 fill-current" />
                <span className="font-mono text-lg font-semibold">{event.rating}</span>
                <span className="text-ink-subtle text-xs">
                  {t(event.reviewCount === 1 ? 'events.detail.fromReview' : 'events.detail.fromReviews', { n: event.reviewCount })}
                </span>
              </p>
            </Card>
          ) : null}
        </div>
      </div>

      {notice ? <p className="text-success mt-4 text-sm">{notice}</p> : null}
      {error ? <p className="text-danger mt-4 text-sm">{errorText(error)}</p> : null}
    </div>
  );
}
