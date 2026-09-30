'use client';

import { Card, cn } from '@nexus/ui';
import {
  CalendarDays,
  Info,
  MapPin,
  ShoppingBag,
  Sparkles,
  Star,
  UserPlus,
  UsersRound,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { circleImage, eventImage, listingImage, placeImage } from '@/lib/photos';

export type Recommendation = {
  kind: 'EVENT' | 'PLACE' | 'CIRCLE' | 'PERSON' | 'LISTING';
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  score: number;
  reasons: string[];
  meta: Record<string, unknown>;
};

export type ForYouFeed = {
  personalized: boolean;
  signals: number;
  note: string;
  topCategories: string[];
  items: Recommendation[];
};

const KIND = {
  EVENT: { icon: CalendarDays, tint: 'var(--module-events)', label: 'Event', href: '/events/' },
  PLACE: { icon: MapPin, tint: 'var(--module-nearby)', label: 'Place', href: '/nearby' },
  CIRCLE: { icon: UsersRound, tint: '#60A5FA', label: 'Circle', href: '/circles/' },
  PERSON: { icon: UserPlus, tint: 'var(--module-people)', label: 'Person', href: '/u/' },
  LISTING: { icon: ShoppingBag, tint: '#C084FC', label: 'Listing', href: '/market' },
} as const;

function hrefFor(item: Recommendation) {
  if (item.kind === 'EVENT') return `/events/${item.slug}`;
  if (item.kind === 'CIRCLE') return `/circles/${item.slug}`;
  if (item.kind === 'PERSON') return `/u/${item.slug}`;
  if (item.kind === 'LISTING') return '/market';

  return '/nearby';
}

function imageFor(item: Recommendation) {
  if (item.kind === 'EVENT')
    return eventImage({ title: item.title, slug: item.slug, coverUrl: item.imageUrl });
  if (item.kind === 'CIRCLE')
    return circleImage({ name: item.title, slug: item.slug, coverUrl: item.imageUrl });
  if (item.kind === 'LISTING')
    return listingImage({ title: item.title, id: item.id, imageUrl: item.imageUrl });
  if (item.kind === 'PLACE')
    return placeImage({
      category: typeof item.meta.category === 'string' ? item.meta.category : 'OTHER',
      slug: item.slug,
      coverUrl: item.imageUrl,
    });
  return item.imageUrl;
}

function ordered(items: Recommendation[]) {
  const lead = items.findIndex((item) => item.kind !== 'PERSON' && imageFor(item));
  if (lead <= 0) return items;
  return [items[lead]!, ...items.slice(0, lead), ...items.slice(lead + 1)];
}

function RecommendationCard({ item, featured }: { item: Recommendation; featured?: boolean }) {
  const kind = KIND[item.kind];
  const Icon = item.kind === 'EVENT' && item.meta.isOnline ? Video : kind.icon;
  const image = imageFor(item);

  const when =
    item.kind === 'EVENT' && typeof item.meta.startAt === 'string'
      ? new Intl.DateTimeFormat('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(item.meta.startAt))
      : null;

  const price =
    item.kind === 'LISTING' && item.meta.price && typeof item.meta.price === 'object'
      ? (item.meta.price as { display: string }).display
      : null;

  const rating =
    item.kind === 'PLACE' && typeof item.meta.rating === 'number' ? item.meta.rating : null;
  const initials = item.title
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={hrefFor(item)}
      className={cn(
        'group relative block overflow-hidden rounded-2xl',
        featured ? 'h-[440px] sm:col-span-2' : 'h-[360px]',
      )}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            background: `radial-gradient(120% 90% at 30% 20%, color-mix(in oklab, ${kind.tint} 55%, #0b0d10), #0b0d10)`,
          }}
        >
          <span className="font-display text-7xl font-extrabold text-white/85">{initials}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur-md">
        <Icon className="size-3.5" style={{ color: kind.tint }} />
        {kind.label}
      </span>
      {price ? (
        <span className="num absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-black">
          {price}
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        {item.reasons[0] ? (
          <div
            className="flex items-center gap-1.5 text-[12.5px] font-semibold"
            style={{ color: kind.tint }}
          >
            <Sparkles className="size-3.5 shrink-0" />
            <span className="line-clamp-1 first-letter:uppercase">{item.reasons[0]}</span>
          </div>
        ) : null}
        <h3
          className={cn(
            'font-display mt-1 font-bold leading-tight tracking-tight',
            featured ? 'text-3xl sm:text-4xl' : 'text-2xl',
          )}
        >
          {item.title}
        </h3>
        {when || item.subtitle ? (
          <p className="mt-1 line-clamp-1 text-sm text-white/75">
            {[when, item.subtitle].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-3 text-xs text-white/80">
          {rating !== null ? (
            <span className="flex items-center gap-1">
              <Star className="fill-module-events text-module-events size-3.5" />
              <span className="num font-semibold">{rating}</span>
            </span>
          ) : null}
          {item.kind === 'EVENT' && typeof item.meta.goingCount === 'number' ? (
            <span className="num">{item.meta.goingCount} going</span>
          ) : null}
          {item.kind === 'CIRCLE' && typeof item.meta.members === 'number' ? (
            <span className="num">{item.meta.members} members</span>
          ) : null}
          {item.reasons[1] ? (
            <span className="line-clamp-1 text-white/60">{item.reasons[1]}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function ForYou({ feed }: { feed: ForYouFeed }) {
  const [explaining, setExplaining] = useState(false);

  if (feed.items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-ink-muted text-[0.875rem]">
          Nothing to suggest yet. As places, events and circles appear around you, this fills in.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink-subtle text-xs">
          {feed.personalized
            ? feed.signals > 0
              ? `Ranked against ${feed.signals} things you have done`
              : 'Ranked on what you said you are interested in'
            : 'Personalisation is off'}
        </p>

        <button
          type="button"
          onClick={() => setExplaining((value) => !value)}
          className="text-ink-subtle hover:text-ink flex items-center gap-1.5 text-xs transition-colors"
        >
          <Info className="size-3.5" />
          {explaining ? 'Hide' : 'Why these?'}
        </button>
      </div>

      {explaining ? (
        <Card
          className="mt-3 p-4"
          style={{ background: 'color-mix(in oklab, var(--module-ai) 7%, var(--surface))' }}
        >
          <p className="text-ink-muted text-[0.8125rem] leading-relaxed">{feed.note}</p>

          {feed.topCategories.length > 0 ? (
            <p className="text-ink-subtle mt-2 text-xs">
              Strongest signals right now:{' '}
              {feed.topCategories.map((entry) => entry.toLowerCase()).join(', ')}.
            </p>
          ) : null}

          <p className="text-ink-subtle mt-2 text-xs leading-relaxed">
            Every card says why it is there. You can turn personalisation off in{' '}
            <Link href="/settings" className="text-accent hover:underline">
              settings
            </Link>{' '}
            and this becomes a plain popular-and-nearby list.
          </p>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered(feed.items).map((item, index) => (
          <RecommendationCard key={`${item.kind}-${item.id}`} item={item} featured={index === 0} />
        ))}
      </div>
    </div>
  );
}
