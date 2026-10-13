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
import { useFormatDate, useT } from '@/i18n/client';
import { translateReason } from '@/i18n/reasons';
import type { messages } from '@/i18n/messages';

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
  CIRCLE: { icon: UsersRound, tint: 'var(--module-home)', label: 'Circle', href: '/circles/' },
  PERSON: { icon: UserPlus, tint: 'var(--module-people)', label: 'Person', href: '/u/' },
  LISTING: { icon: ShoppingBag, tint: 'var(--module-discover)', label: 'Listing', href: '/market' },
} as const;

function hrefFor(item: Recommendation) {
  if (item.kind === 'EVENT') return `/events/${item.slug}`;
  if (item.kind === 'CIRCLE') return `/circles/${item.slug}`;
  if (item.kind === 'PERSON') return `/u/${item.slug}`;
  if (item.kind === 'LISTING') return `/market?listing=${item.slug}`;

  return `/nearby?place=${item.slug}`;
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

type PlaceKey = keyof (typeof messages)['enums']['place'];

function RecommendationCard({ item, featured }: { item: Recommendation; featured?: boolean }) {
  const t = useT();
  const format = useFormatDate();
  const kind = KIND[item.kind];
  const Icon = item.kind === 'EVENT' && item.meta.isOnline ? Video : kind.icon;
  const image = imageFor(item);

  const when =
    item.kind === 'EVENT' && typeof item.meta.startAt === 'string'
      ? `${format(item.meta.startAt, 'dayMonthShort')} ${format(item.meta.startAt, 'time')}`
      : null;

  const price =
    item.kind === 'LISTING' && item.meta.price && typeof item.meta.price === 'object'
      ? (item.meta.price as { display: string }).display
      : null;

  const rating =
    item.kind === 'PLACE' && typeof item.meta.rating === 'number' ? item.meta.rating : null;

  return (
    <Link
      href={hrefFor(item)}
      className={cn(
        'border-line bg-surface hover:border-line-strong flex flex-col overflow-hidden rounded-xl border transition-colors',
        featured && 'sm:col-span-2',
      )}
    >
      {image ? <img src={image} alt="" className={cn('w-full object-cover', featured ? 'h-56' : 'h-40')} /> : null}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="text-ink-muted inline-flex items-center gap-1.5 text-xs font-medium">
            <Icon className="size-3.5" style={{ color: kind.tint }} />
            {t(`discover.kind.${item.kind}`)}
          </span>
          {price ? <span className="num ml-auto text-sm font-semibold">{price}</span> : null}
        </div>
        <h3 className={cn('mt-2 font-semibold leading-snug tracking-tight', featured ? 'text-xl sm:text-2xl' : 'text-base')}>
          {item.title}
        </h3>
        {when || item.subtitle ? (
          <p className="text-ink-muted mt-1 line-clamp-1 text-sm">{[when, item.subtitle].filter(Boolean).join(' · ')}</p>
        ) : null}
        {item.reasons[0] ? (
          <p className="text-ink-muted mt-3 flex items-center gap-1.5 text-xs">
            <Sparkles className="text-accent size-3.5 shrink-0" />
            <span className="line-clamp-1 first-letter:uppercase">{translateReason(item.reasons[0], t)}</span>
          </p>
        ) : null}
        <div className="text-ink-subtle mt-auto flex items-center gap-3 pt-3 text-xs">
          {rating !== null ? (
            <span className="flex items-center gap-1">
              <Star className="fill-module-events text-module-events size-3.5" />
              <span className="num font-medium">{rating}</span>
            </span>
          ) : null}
          {item.kind === 'EVENT' && typeof item.meta.goingCount === 'number' ? (
            <span className="num">{t('events.status.goingCount', { n: item.meta.goingCount })}</span>
          ) : null}
          {item.kind === 'CIRCLE' && typeof item.meta.members === 'number' ? (
            <span className="num">{t(item.meta.members === 1 ? 'circles.memberOne' : 'circles.memberMany', { n: item.meta.members })}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function ForYou({ feed }: { feed: ForYouFeed }) {
  const [explaining, setExplaining] = useState(false);
  const t = useT();

  if (feed.items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-ink-muted text-[0.875rem]">
          {t('discover.nothing')}
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
              ? t('discover.rankedSignals', { n: feed.signals })
              : t('discover.rankedInterests')
            : t('discover.off')}
        </p>

        <button
          type="button"
          onClick={() => setExplaining((value) => !value)}
          className="text-ink-subtle hover:text-ink flex items-center gap-1.5 text-xs transition-colors"
        >
          <Info className="size-3.5" />
          {explaining ? t('discover.hide') : t('discover.why')}
        </button>
      </div>

      {explaining ? (
        <Card className="bg-surface-raised mt-3 p-4">
          <p className="text-ink-muted text-[0.8125rem] leading-relaxed">{feed.note}</p>

          {feed.topCategories.length > 0 ? (
            <p className="text-ink-subtle mt-2 text-xs">
              {t('discover.signals')}{' '}
              {feed.topCategories.map((entry) => t(`enums.place.${entry as PlaceKey}`)).join(', ')}.
            </p>
          ) : null}

          <p className="text-ink-subtle mt-2 text-xs leading-relaxed">
            {t('discover.explain1')}{' '}
            <Link href="/settings" className="text-accent hover:underline">
              {t('discover.settings')}
            </Link>{' '}
            {t('discover.explain2')}
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
