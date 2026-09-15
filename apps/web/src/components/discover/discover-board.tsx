'use client';

import { Avatar, AvatarStack, Badge, Button, Card, EmptyState, Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@nexus/ui';
import { CalendarDays, Compass, MapPin, Navigation, Star, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import type { CircleSummary } from '@/lib/community-client';
import type { EventSummary, PlaceSummary } from '@/lib/places-client';
import type { PersonSummary } from '@/lib/social-client';

export type DiscoverData = {
  places: PlaceSummary[];
  events: EventSummary[];
  circles: CircleSummary[];
  people: PersonSummary[];
};

function when(startAt: string) {
  const start = new Date(startAt);
  return `${start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function EventItem({ event }: { event: EventSummary }) {
  return (
    <Card interactive className="p-5">
      <div className="flex items-start gap-4">
        <div className="border-line bg-surface-raised flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border">
          <span className="text-micro text-ink-subtle font-semibold uppercase">
            {new Date(event.startAt).toLocaleDateString('en-GB', { month: 'short' })}
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
            {when(event.startAt)}
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
            <span className="text-ink-subtle text-xs">{event.goingCount} going</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PlaceItem({ place }: { place: PlaceSummary }) {
  return (
    <Card interactive className="p-5">
      <div className="flex items-start gap-3.5">
        <span className="bg-accent-soft text-module-nearby flex size-10 shrink-0 items-center justify-center rounded-lg">
          <MapPin className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{place.name}</p>
          <p className="text-ink-subtle mt-0.5 truncate text-xs capitalize">
            {place.category.toLowerCase()}
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
            {place.eventCount > 0 ? <Badge size="sm">{place.eventCount} upcoming</Badge> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CircleItem({ circle }: { circle: CircleSummary }) {
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
            {circle.members} {circle.members === 1 ? 'member' : 'members'} · {circle.posts} posts
          </p>
          {circle.description ? (
            <p className="text-ink-muted mt-2 line-clamp-2 text-sm leading-relaxed">
              {circle.description}
            </p>
          ) : null}
        </div>
        {circle.myRole ? <Badge size="sm" className="capitalize">{circle.myRole.toLowerCase()}</Badge> : null}
      </div>
    </Card>
  );
}

function PersonItem({ person }: { person: PersonSummary }) {
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
            <p className="text-ink-muted mt-1.5 truncate text-xs">{person.reasons.join(' · ')}</p>
          ) : null}
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href={`/u/${person.username}`}>View</Link>
        </Button>
      </div>
    </Card>
  );
}

export function DiscoverBoard({ data }: { data: DiscoverData }) {
  const forYou = useMemo(() => {
    const entries: { key: string; node: React.ReactNode; score: number }[] = [];

    for (const event of data.events.slice(0, 8)) {
      const hours = (new Date(event.startAt).getTime() - Date.now()) / 3600000;
      entries.push({
        key: `event-${event.id}`,
        node: <EventItem event={event} />,
        score: 40 + event.goingCount * 2 - Math.max(0, hours) * 0.05,
      });
    }

    for (const person of data.people.slice(0, 6)) {
      entries.push({
        key: `person-${person.id}`,
        node: <PersonItem person={person} />,
        score: 20 + (person.mutualFriends ?? 0) * 8 + (person.sharedInterests ?? 0) * 2,
      });
    }

    for (const circle of data.circles.slice(0, 6)) {
      entries.push({
        key: `circle-${circle.id}`,
        node: <CircleItem circle={circle} />,
        score: 18 + circle.members * 0.4 + circle.posts * 0.6,
      });
    }

    for (const place of data.places.slice(0, 8)) {
      entries.push({
        key: `place-${place.id}`,
        node: <PlaceItem place={place} />,
        score: 12 + (place.rating ?? 0) * 3 + place.eventCount * 4,
      });
    }

    return entries.sort((a, b) => b.score - a.score);
  }, [data]);

  const tabs = [
    { value: 'for-you', label: 'For You', count: forYou.length },
    { value: 'events', label: 'Events', count: data.events.length },
    { value: 'places', label: 'Places', count: data.places.length },
    { value: 'circles', label: 'Circles', count: data.circles.length },
    { value: 'people', label: 'People', count: data.people.length },
  ];

  return (
    <Tabs defaultValue="for-you">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            {tab.count > 0 ? (
              <span className="bg-surface-hover ml-2 rounded-full px-1.5 text-[0.625rem] font-semibold">
                {tab.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="for-you" className="pt-7">
        {forYou.length === 0 ? (
          <EmptyState
            icon={<Compass />}
            title="Nothing to discover yet"
            description="Add a place, create an event or start a circle and this page fills in."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {forYou.map((entry) => (
              <div key={entry.key}>{entry.node}</div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="events" className="pt-7">
        {data.events.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title="No events coming up"
            description="Create one and invite the people who should be there."
            action={
              <Button asChild size="sm">
                <Link href="/events">Go to events</Link>
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
            title="No places yet"
            description="Add the cafés and venues you actually use."
            action={
              <Button asChild size="sm">
                <Link href="/nearby">Go to nearby</Link>
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
            title="No circles yet"
            description="Start a community around something you care about."
            action={
              <Button asChild size="sm">
                <Link href="/circles">Go to circles</Link>
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
            title="No suggestions yet"
            description="Suggestions come from mutual friends, shared interests and your city."
            action={
              <Button asChild size="sm">
                <Link href="/people">Go to people</Link>
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
