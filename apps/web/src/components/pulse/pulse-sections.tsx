import { Badge, Button, Card, Progress, cn } from '@nexus/ui';
import { ArrowRight, MapPin, Sparkles, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Imagery } from '@/lib/imagery';
import {
  KIND_TINT,
  formatDuration,
  formatMinutes,
  type FreeWindow,
  type ScheduleBlock,
} from '@/lib/schedule';

export function SampleNotice({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-line text-ink-subtle inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem]">
      {children}
    </span>
  );
}

export function PulseHeading({
  title,
  caption,
  action,
  sample,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
  sample?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {sample ? <SampleNotice>{sample}</SampleNotice> : null}
        </div>
        {caption ? <p className="text-ink-muted mt-1 text-sm">{caption}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function TodayTimeline({
  blocks,
  windows,
  nowMinute,
  isToday,
}: {
  blocks: ScheduleBlock[];
  windows: FreeWindow[];
  nowMinute: number;
  isToday: boolean;
}) {
  if (blocks.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-ink-muted text-sm leading-relaxed">
          Nothing fixed on your calendar today. Once your classes or work hours are in, Nexus shows
          them here and plans around the gaps.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-5">
          <Link href="/profile">Add your week</Link>
        </Button>
      </Card>
    );
  }

  const merged = [
    ...blocks.map((block) => ({ type: 'block' as const, start: block.startMinute, block })),
    ...windows.map((window) => ({ type: 'free' as const, start: window.startMinute, window })),
  ].sort((a, b) => a.start - b.start);

  return (
    <Card className="p-6">
      <div className="flex flex-col">
        {merged.map((entry, index) => {
          const last = index === merged.length - 1;

          if (entry.type === 'free') {
            return (
              <div key={`free-${entry.start}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="bg-module-nearby mt-1.5 size-2 shrink-0 rounded-full" />
                  {!last ? <span className="bg-line w-px flex-1" /> : null}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-xs">{formatMinutes(entry.window.startMinute)}</span>
                    <span className="text-ink-muted text-sm">Free</span>
                    <Badge variant="success" size="sm">
                      {formatDuration(entry.window.minutes)}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          }

          const active =
            isToday &&
            entry.block.startMinute <= nowMinute &&
            entry.block.endMinute > nowMinute;
          const past = isToday && entry.block.endMinute <= nowMinute;

          return (
            <div key={entry.block.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', past && 'opacity-40')}
                  style={{ backgroundColor: KIND_TINT[entry.block.kind] }}
                />
                {!last ? <span className="bg-line w-px flex-1" /> : null}
              </div>
              <div className={cn('flex-1 pb-6', past && 'opacity-50')}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-xs">
                    {formatMinutes(entry.block.startMinute)}–{formatMinutes(entry.block.endMinute)}
                  </span>
                  <span className="text-sm font-medium">{entry.block.label}</span>
                  {active ? (
                    <Badge variant="accent" size="sm">
                      Now
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function AiInsight({
  windows,
  isToday,
  interests,
}: {
  windows: FreeWindow[];
  isToday: boolean;
  interests: string[];
}) {
  const best = [...windows].sort((a, b) => b.minutes - a.minutes)[0];

  const message = best
    ? `${isToday ? 'Today' : 'On a normal day'} you have ${formatDuration(best.minutes)} free from ${formatMinutes(best.startMinute)}. That is enough for a focused session${interests.length > 0 ? ` on ${interests[0]}` : ''}.`
    : 'Add your fixed commitments and Nexus can find the gaps worth using.';

  return (
    <Card className="relative overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: 'var(--module-ai)' }}
      />
      <div className="relative flex items-start gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklab, var(--module-ai) 16%, transparent)',
            color: 'var(--module-ai)',
          }}
        >
          <Sparkles className="size-4.5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-sm font-semibold">Nexus AI</p>
            <SampleNotice>Reading your real schedule</SampleNotice>
          </div>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">{message}</p>
          <p className="text-ink-subtle mt-3 text-xs leading-relaxed">
            Planning and rescheduling arrive in Phase 6. Nothing will move in your calendar without
            your confirmation.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function ForYouRail({
  cards,
}: {
  cards: { image: Imagery; tag: string; title: string; meta: string }[];
}) {
  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6">
      {cards.map((card) => (
        <article
          key={card.title}
          className="group border-line bg-surface relative w-64 shrink-0 snap-start overflow-hidden rounded-lg border"
        >
          <div className="relative h-36 overflow-hidden">
            <Image
              src={card.image.src}
              alt={card.image.alt}
              fill
              sizes="256px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="scrim-bottom absolute inset-0" />
            <Badge variant="accent" size="sm" className="absolute top-3 left-3">
              {card.tag}
            </Badge>
          </div>
          <div className="p-4">
            <p className="truncate text-sm font-medium">{card.title}</p>
            <p className="text-ink-muted mt-1 truncate text-xs">{card.meta}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function NearYouCard({
  places,
}: {
  places: { name: string; category: string; distance: string; open: boolean }[];
}) {
  return (
    <Card className="divide-y divide-[var(--border)]">
      {places.map((place) => (
        <div key={place.name} className="flex items-center gap-4 p-4">
          <span className="bg-accent-soft text-module-nearby flex size-9 shrink-0 items-center justify-center rounded-md">
            <MapPin className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{place.name}</p>
            <p className="text-ink-muted mt-0.5 text-xs">
              {place.category} · {place.distance}
            </p>
          </div>
          <Badge variant={place.open ? 'success' : 'neutral'} size="sm">
            {place.open ? 'Open' : 'Closed'}
          </Badge>
        </div>
      ))}
    </Card>
  );
}

export function CirclesCard({
  circles,
}: {
  circles: { name: string; members: string; activity: string }[];
}) {
  return (
    <Card className="divide-y divide-[var(--border)]">
      {circles.map((circle) => (
        <div key={circle.name} className="flex items-center gap-4 p-4">
          <span className="bg-accent-soft text-accent flex size-9 shrink-0 items-center justify-center rounded-md">
            <Users className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{circle.name}</p>
            <p className="text-ink-muted mt-0.5 truncate text-xs">{circle.activity}</p>
          </div>
          <span className="text-ink-subtle shrink-0 font-mono text-xs">{circle.members}</span>
        </div>
      ))}
    </Card>
  );
}

export function PriorityList({
  items,
}: {
  items: { title: string; blurb: string; href?: string; cta?: string; tone: 'warning' | 'accent' | 'neutral' }[];
}) {
  if (items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-ink-muted text-sm">
          Nothing needs your attention right now. That is the goal.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Card
          key={item.title}
          className={cn(
            'p-5',
            item.tone === 'warning' &&
              'border-warning/35 bg-[color-mix(in_oklab,var(--warning)_7%,transparent)]',
            item.tone === 'accent' && 'border-accent-line bg-accent-soft',
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-ink-muted mt-1 text-sm leading-relaxed">{item.blurb}</p>
            </div>
            {item.href && item.cta ? (
              <Button asChild variant={item.tone === 'accent' ? 'primary' : 'secondary'} size="sm" className="shrink-0">
                <Link href={item.href}>
                  {item.cta} <ArrowRight />
                </Link>
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ProgressCard({
  completeness,
  interestCount,
  blockCount,
}: {
  completeness: number;
  interestCount: number;
  blockCount: number;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.9375rem] font-semibold">Your Nexus</p>
        <span className="font-mono text-sm font-medium">{completeness}%</span>
      </div>
      <Progress value={completeness} className="mt-4" />
      <dl className="mt-5 flex flex-col gap-2.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-muted">Interests</dt>
          <dd className="font-medium">{interestCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-muted">Fixed blocks</dt>
          <dd className="font-medium">{blockCount}</dd>
        </div>
      </dl>
    </Card>
  );
}
