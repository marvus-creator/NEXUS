'use client';

import { AvatarStack, Badge, Button, Eyebrow } from '@nexus/ui';
import { ArrowRight, Clock, MapPin, Navigation, Star, Users } from 'lucide-react';
import { imagery } from '@/lib/imagery';
import { Reveal } from './reveal';
import { ImagePanel, Section, SectionIntro } from './section-shell';

const discoverCards = [
  { image: imagery.liveEvent, tag: 'Events', title: 'Live music, Friday', meta: '41 going · Nyamirambo' },
  { image: imagery.cafeFriends, tag: 'Places', title: 'Quiet cafés to work in', meta: '12 saved near you' },
  { image: imagery.team, tag: 'Circles', title: 'Kigali Developers', meta: '2,481 members' },
  { image: imagery.travel, tag: 'Experiences', title: 'Sunrise hike', meta: 'Sunday · 05:30' },
  { image: imagery.storefront, tag: 'Businesses', title: 'New shops this month', meta: '8 opened nearby' },
];

const attendees = [
  { name: 'Aline Uwase' },
  { name: 'Kevin Mugisha' },
  { name: 'Sandrine Ingabire' },
  { name: 'Eric Habimana' },
  { name: 'Diane Umutoni' },
  { name: 'Patrick Nsengiyumva' },
];

const places = [
  { name: 'Question Coffee', category: 'Café', distance: '650 m', rating: '4.8', open: true },
  { name: 'Kigali Heights', category: 'Venue', distance: '1.2 km', rating: '4.6', open: true },
  { name: 'Repub Lounge', category: 'Restaurant', distance: '2.4 km', rating: '4.7', open: false },
];

export function DiscoverSection() {
  return (
    <Section tone="deep" className="overflow-hidden">
      <SectionIntro
        eyebrow="Discover"
        title="Everything worth finding, in one exploration engine"
        description="For You, Trending, Places, Events, People, Circles, Opportunities, Businesses and Experiences — filtered by where you are and what you have told Nexus you care about."
      />

      <Reveal delay={0.1} className="mt-14">
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8">
          {discoverCards.map((card) => (
            <article
              key={card.title}
              className="group relative w-[75vw] shrink-0 snap-start sm:w-80"
            >
              <ImagePanel
                image={card.image}
                sizes="(max-width: 640px) 75vw, 320px"
                className="h-96 w-full"
              >
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <Badge variant="accent" size="sm" className="mb-3">
                    {card.tag}
                  </Badge>
                  <h3 className="text-lg font-semibold tracking-tight text-white">{card.title}</h3>
                  <p className="mt-1 text-sm text-white/65">{card.meta}</p>
                </div>
              </ImagePanel>
            </article>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

export function PeopleSection() {
  return (
    <Section id="circles">
      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="group lg:col-span-7">
          <div className="relative">
            <ImagePanel
              image={imagery.community}
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="h-[26rem] w-full sm:h-[32rem]"
            />
            <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">
              <Eyebrow className="mb-3 text-white/55">People</Eyebrow>
              <h3 className="text-balance-heading max-w-md text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Following is one-way. Friendship is mutual. Both matter.
              </h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
                Find people by interest, skill, school or city. Suggestions come from mutual
                friends, shared circles and events you both attended — never from private data.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <AvatarStack people={attendees} max={5} />
                <span className="text-xs text-white/55">4 mutual connections</span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Reveal delay={0.1} className="group flex-1">
            <div className="relative h-full">
              <ImagePanel
                image={imagery.students}
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="h-64 w-full sm:h-full sm:min-h-[15rem]"
              />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <Eyebrow className="mb-2 text-white/55">Circles</Eyebrow>
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  Communities with real structure
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Posts, discussions, events, polls, shared resources, chat and moderation. Public,
                  private or invite-only.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="border-line bg-surface rounded-xl border p-6">
              <div className="flex items-center gap-3">
                <span className="bg-accent-soft text-accent flex size-9 items-center justify-center rounded-lg">
                  <Users className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Kigali Developers</p>
                  <p className="text-ink-muted text-xs">2,481 members · 14 events</p>
                </div>
              </div>
              <p className="text-ink-muted mt-4 text-sm leading-relaxed">
                Circles connect to events, messages and your calendar, so joining one actually
                changes what your week looks like.
              </p>
              <Button variant="secondary" size="sm" className="mt-5 w-full">
                Browse circles <ArrowRight />
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

export function EventsSection() {
  return (
    <Section id="events" tone="deep">
      <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal className="group order-2 lg:order-1">
          <div className="relative">
            <ImagePanel
              image={imagery.liveEvent}
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="h-[24rem] w-full sm:h-[30rem]"
              overlay={false}
            />
            <div className="from-ground-deep absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

            <div className="border-line bg-surface/92 absolute right-5 bottom-5 left-5 rounded-lg border p-5 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-semibold">Kigali Tech Night</p>
                  <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" /> Saturday · 18:00
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> Norrsken House
                    </span>
                  </div>
                </div>
                <Badge variant="accent" size="sm">
                  Going
                </Badge>
              </div>
              <div className="border-line mt-4 flex items-center justify-between border-t pt-4">
                <AvatarStack people={attendees} max={4} />
                <span className="text-ink-muted text-xs">41 attending</span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionIntro
            eyebrow="Events"
            title="From discovering an event to standing in the room"
            description="Create or find an event, invite friends, chat with attendees beforehand, check in with a QR code and leave a review after. Every event connects to a circle, a place and your calendar."
          />
          <Reveal delay={0.12} className="mt-8">
            <ul className="flex flex-col gap-3">
              {[
                'Event chat opens for attendees before the day',
                'QR check-in at the door, no separate ticketing app',
                'Added to your calendar, with travel time considered',
                'Related circles and nearby businesses surface automatically',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="bg-accent mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <span className="text-ink-muted">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

export function NearbySection() {
  return (
    <Section>
      <SectionIntro
        eyebrow="Nearby"
        title="The city around you, not a separate map app"
        description="Restaurants, cafés, stores, sports, attractions, services and activities — as a map or a list, with the places you saved always one tap away."
        align="center"
        className="mx-auto"
      />

      <Reveal delay={0.12} className="mt-14">
        <div className="border-line bg-surface relative overflow-hidden rounded-xl border">
          <div className="grid lg:grid-cols-[1.4fr_1fr]">
            <div className="relative min-h-[22rem] lg:min-h-[28rem]">
              <ImagePanel
                image={imagery.outdoors}
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="absolute inset-0 rounded-none"
                overlay={false}
              />
              <div className="bg-ground-deep/45 absolute inset-0" />

              {[
                { top: '28%', left: '32%', tint: 'var(--module-nearby)' },
                { top: '52%', left: '58%', tint: 'var(--accent)' },
                { top: '68%', left: '24%', tint: 'var(--module-events)' },
              ].map((pin) => (
                <span
                  key={`${pin.top}-${pin.left}`}
                  className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/85 shadow-lg"
                  style={{ top: pin.top, left: pin.left, backgroundColor: pin.tint }}
                >
                  <MapPin className="size-3.5 text-white" />
                </span>
              ))}

              <div className="border-line bg-surface/92 absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium backdrop-blur-xl">
                <Navigation className="text-accent size-3.5" />
                Kigali · 3 km radius
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
              {places.map((place) => (
                <div
                  key={place.name}
                  className="border-line bg-surface-raised hover:border-line-strong flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{place.name}</p>
                    <p className="text-ink-muted mt-1 text-xs">
                      {place.category} · {place.distance}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="inline-flex items-center gap-1 font-mono text-xs">
                      <Star className="text-warning size-3 fill-current" />
                      {place.rating}
                    </span>
                    <Badge variant={place.open ? 'success' : 'neutral'} size="sm">
                      {place.open ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
