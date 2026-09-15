'use client';

import { Badge, Card, cn } from '@nexus/ui';
import {
  CalendarDays,
  Compass,
  Info,
  MapPin,
  ShoppingBag,
  Sparkles,
  UserPlus,
  UsersRound,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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
  CIRCLE: { icon: UsersRound, tint: 'var(--module-people)', label: 'Circle', href: '/circles/' },
  PERSON: { icon: UserPlus, tint: 'var(--accent)', label: 'Person', href: '/u/' },
  LISTING: { icon: ShoppingBag, tint: 'var(--module-discover)', label: 'For sale', href: '/market' },
} as const;

function hrefFor(item: Recommendation) {
  if (item.kind === 'EVENT') return `/events/${item.slug}`;
  if (item.kind === 'CIRCLE') return `/circles/${item.slug}`;
  if (item.kind === 'PERSON') return `/u/${item.slug}`;
  if (item.kind === 'LISTING') return '/market';

  return '/nearby';
}

function RecommendationCard({ item }: { item: Recommendation }) {
  const kind = KIND[item.kind];
  const Icon = item.kind === 'EVENT' && item.meta.isOnline ? Video : kind.icon;

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

  return (
    <Card className="p-4 transition-colors hover:border-[color:var(--ink-subtle)]">
      <Link href={hrefFor(item)} className="flex items-start gap-3.5">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `color-mix(in oklab, ${kind.tint} 14%, transparent)` }}
        >
          <Icon className="size-4.5" style={{ color: kind.tint }} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-[0.9375rem] font-semibold">{item.title}</h3>
            <Badge style={{ color: kind.tint }}>{kind.label}</Badge>
          </div>

          {when || item.subtitle || price ? (
            <p className="text-ink-muted mt-0.5 truncate text-[0.8125rem]">
              {[when, item.subtitle, price].filter(Boolean).join(' · ')}
            </p>
          ) : null}

          <ul className="mt-2.5 space-y-1">
            {item.reasons.slice(0, 2).map((reason) => (
              <li
                key={reason}
                className="text-ink-subtle flex items-start gap-1.5 text-xs leading-relaxed"
              >
                <Sparkles className="mt-0.5 size-3 shrink-0" style={{ color: kind.tint }} />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </Card>
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {feed.items.map((item) => (
          <RecommendationCard key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}
