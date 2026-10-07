'use client';

import { Avatar, AvatarStack, Badge, Button, Card, EmptyState, Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@nexus/ui';
import { CalendarDays, Compass, MapPin, Navigation, Star, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { ForYou, type ForYouFeed } from './for-you';
import type { CircleSummary } from '@/lib/community-client';
import type { EventSummary, PlaceSummary } from '@/lib/places-client';
import type { PersonSummary } from '@/lib/social-client';
import { useFormatDate, useT } from '@/i18n/client';
import { translateReason } from '@/i18n/reasons';
import type { messages } from '@/i18n/messages';

export type DiscoverData = {
  places: PlaceSummary[];
  events: EventSummary[];
  circles: CircleSummary[];
  people: PersonSummary[];
};

type PlaceKey = keyof (typeof messages)['enums']['place'];

function EventItem({ event }: { event: EventSummary }) {
  const t = useT();
  const format = useFormatDate();
  return (
    <Card interactive className="p-5">
      <div className="flex items-start gap-4">
        <div className="border-line bg-surface-raised flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border">
          <span className="text-micro text-ink-subtle font-semibold uppercase">
            {format(event.startAt, 'monthShort')}
          </span>
          <span className="font-mono text-base leading-none font-semibold">
            {new Date(event.startAt).getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <Link href={`/events/${event.slug}`} className="truncate text-sm font-semibold hover:underline">
            {event.title}
          </Link>
          <p className="text-ink-subtle mt-1 truncate text-xs">
            {`${format(event.startAt, 'dayMonthShort')} · ${format(event.startAt, 'time')}`}
            {event.place ? ` · ${event.place.name}` : event.locationText ? ` · ${event.locationText}` : ''}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            {event.attendees.length > 0 ? (
              <AvatarStack
                people={event.attendees.map((person) => ({
                  name: person.displayName,
                  src: person.avatarUrl ?? undefined,
                }))}
                max={3}
                size="xs"
              />
            ) : null}
            <span className="text-ink-subtle text-xs">{t('events.status.goingCount', { n: event.goingCount })}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PlaceItem({ place }: { place: PlaceSummary }) {
  const t = useT();
  return (
    <Card interactive className="p-5">
      <div className="flex items-start gap-3.5">
        <span className="bg-accent-soft text-module-nearby flex size-10 shrink-0 items-center justify-center rounded-lg">
          <MapPin className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{place.name}</p>
          <p className="text-ink-subtle mt-0.5 truncate text-xs">
            {t(`enums.place.${place.category as PlaceKey}`)}
            {place.address ? ` · ${place.address}` : ''}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
            {place.rating !== null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="text-warning size-3 fill-current" />
                <span className="font-mono">{place.rating}</span>
              </span>
            ) : null}
            {place.distanceKm !== null ? (
              <span className="text-ink-muted inline-flex items-center gap-1">
                <Navigation className="size-3" />
                {place.distanceKm < 1 ? `${Math.round(place.distanceKm * 1000)} m` : `${place.distanceKm} km`}
              </span>
            ) : null}
            {place.eventCount > 0 ? <Badge size="sm">{t('places.upcoming', { n: place.eventCount })}</Badge> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CircleItem({ circle }: { circle: CircleSummary }) {
  const t = useT();
  return (
    <Card interactive className="p-5">
      <div className="flex items-start gap-3.5">
        <span className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-lg">
          <UsersRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/circles/${circle.slug}`} className="truncate text-sm font-semibold hover:underline">
            {circle.name}
          </Link>
          <p className="text-ink-subtle mt-0.5 text-xs">
            {t(circle.members === 1 ? 'circles.memberOne' : 'circles.memberMany', { n: circle.members })} · {t(circle.posts === 1 ? 'circles.postOne' : 'circles.postMany', { n: circle.posts })}
          </p>
          {circle.description ? (
            <p className="text-ink-muted mt-2 line-clamp-2 text-sm leading-relaxed">
              {circle.description}
            </p>
          ) : null}
        </div>
        {circle.myRole ? <Badge size="sm">{t(`enums.circleRole.${circle.myRole}`)}</Badge> : null}
      </div>
    </Card>
  );
}

function PersonItem({ person }: { person: PersonSummary }) {
  const t = useT();
  return (
    <Card interactive className="p-5">
      <div className="flex items-center gap-3.5">
        <Link href={`/u/${person.username}`}>
          <Avatar name={person.displayName} src={person.avatarUrl ?? undefined} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${person.username}`} className="truncate text-sm font-semibold hover:underline">
            {person.displayName}
          </Link>
          <p className="text-ink-subtle truncate text-xs">
            @{person.username}
            {person.occupation ? ` · ${person.occupation}` : ''}
          </p>
          {person.reasons && person.reasons.length > 0 ? (
            <p className="text-ink-muted mt-1.5 truncate text-xs">{person.reasons.map((entry) => translateReason(entry, t)).join(' · ')}</p>
          ) : null}
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href={`/u/${person.username}`}>{t('discover.view')}</Link>
        </Button>
      </div>
    </Card>
  );
}

export function DiscoverBoard({ data, feed }: { data: DiscoverData; feed: ForYouFeed }) {
  const t = useT();

  const tabs = [
    { value: 'for-you', count: feed.items.length },
    { value: 'events', count: data.events.length },
    { value: 'places', count: data.places.length },
    { value: 'circles', count: data.circles.length },
    { value: 'people', count: data.people.length },
  ];

  return (
    <Tabs defaultValue="for-you">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {t(`discover.tabs.${tab.value as 'for-you' | 'events' | 'places' | 'circles' | 'people'}`)}
            {tab.count > 0 ? (
              <span className="bg-surface-hover ml-2 rounded-full px-1.5 text-[0.625rem] font-semibold">
                {tab.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="for-you" className="pt-7">
        <ForYou feed={feed} />
      </TabsContent>

      <TabsContent value="events" className="pt-7">
        {data.events.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title={t('discover.empty.eventsTitle')}
            description={t('discover.empty.eventsBody')}
            action={
              <Button asChild size="sm">
                <Link href="/events">{t('discover.empty.eventsGo')}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="places" className="pt-7">
        {data.places.length === 0 ? (
          <EmptyState
            icon={<MapPin />}
            title={t('discover.empty.placesTitle')}
            description={t('discover.empty.placesBody')}
            action={
              <Button asChild size="sm">
                <Link href="/nearby">{t('discover.empty.placesGo')}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.places.map((place) => (
              <PlaceItem key={place.id} place={place} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="circles" className="pt-7">
        {data.circles.length === 0 ? (
          <EmptyState
            icon={<UsersRound />}
            title={t('discover.empty.circlesTitle')}
            description={t('discover.empty.circlesBody')}
            action={
              <Button asChild size="sm">
                <Link href="/circles">{t('discover.empty.circlesGo')}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.circles.map((circle) => (
              <CircleItem key={circle.id} circle={circle} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="people" className="pt-7">
        {data.people.length === 0 ? (
          <EmptyState
            icon={<Compass />}
            title={t('discover.empty.peopleTitle')}
            description={t('discover.empty.peopleBody')}
            action={
              <Button asChild size="sm">
                <Link href="/people">{t('discover.empty.peopleGo')}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.people.map((person) => (
              <PersonItem key={person.id} person={person} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
