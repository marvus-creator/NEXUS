'use client';

import { Badge, Button, Card, EmptyState, cn } from '@nexus/ui';
import { BadgeCheck, CalendarDays, Layers, MapPin, Newspaper, Search, ShoppingBag, Store, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { control, type ContentRow, type ContentType } from '@/lib/control-client';
import { useFormatDate, useT } from '@/i18n/client';

const TYPES: { value: ContentType; icon: typeof Layers; href?: (row: ContentRow) => string }[] = [
  { value: 'posts', icon: Newspaper },
  { value: 'events', icon: CalendarDays, href: (row) => `/events/${row.slug}` },
  { value: 'circles', icon: UsersRound, href: (row) => `/circles/${row.slug}` },
  { value: 'places', icon: MapPin, href: () => '/nearby' },
  { value: 'listings', icon: ShoppingBag, href: () => '/market' },
  { value: 'businesses', icon: Store },
];

const STATES = [
  { value: 'live', },
  { value: 'removed', },
  { value: 'all', },
] as const;

export function ContentManager() {
  const t = useT();
  const format = useFormatDate();
  const [type, setType] = useState<ContentType>('posts');
  const [state, setState] = useState<'live' | 'removed' | 'all'>('live');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ContentRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    const timer = window.setTimeout(() => {
      control
        .content(type, { q: query, state })
        .then((result) => !cancelled && setRows(result))
        .catch((caught: Error) => !cancelled && (setError(caught.message), setRows([])));
    }, query ? 300 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [type, state, query]);

  async function toggleRemoved(row: ContentRow) {
    setBusy(row.id);
    setError(null);
    try {
      await control.setRemoved(type, row.id, !row.removed);
      setRows((current) =>
        (current ?? [])
          .map((entry) => (entry.id === row.id ? { ...entry, removed: !row.removed } : entry))
          .filter((entry) => state === 'all' || (state === 'live' ? !entry.removed : entry.removed)),
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleVerified(row: ContentRow) {
    if (type !== 'places' && type !== 'businesses') return;
    setBusy(`v-${row.id}`);
    try {
      await control.setVerified(type, row.id, !row.verified);
      setRows((current) => (current ?? []).map((entry) => (entry.id === row.id ? { ...entry, verified: !row.verified } : entry)));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const current = TYPES.find((entry) => entry.value === type)!;

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setType(entry.value)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition',
              type === entry.value ? 'bg-ink text-ground border-transparent' : 'border-line bg-surface text-ink hover:border-line-strong',
            )}
          >
            <entry.icon className="size-3.5" />
            {t(`admin.content.types.${entry.value}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="border-line bg-surface flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border px-3">
          <Search className="text-ink-muted size-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.content.search', { type: t(`admin.content.types.${current.value}`).toLowerCase() })}
            className="placeholder:text-ink-subtle h-full w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="border-line bg-surface flex rounded-xl border p-1">
          {STATES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setState(entry.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                state === entry.value ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t(`admin.content.states.${entry.value}`)}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-danger mt-3 text-sm">{error}</p> : null}

      <Card className="mt-4 overflow-hidden">
        {rows === null ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="bg-surface-raised h-14 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Layers />} title={t('admin.content.none', { type: t(`admin.content.types.${current.value}`).toLowerCase() })} description={t('admin.content.tryAnother')} />
        ) : (
          <div className="divide-line divide-y">
            {rows.map((row) => (
              <div key={row.id} className={cn('flex flex-wrap items-center gap-3 p-4', row.removed && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {current.href && row.slug && !row.removed ? (
                      <Link href={current.href(row)} className="truncate font-semibold hover:underline">
                        {row.title}
                      </Link>
                    ) : (
                      <span className={cn('truncate font-semibold', row.removed && 'line-through')}>{row.title}</span>
                    )}
                    {row.verified ? (
                      <Badge size="sm" variant="success">
                        <BadgeCheck /> {t('admin.content.verified')}
                      </Badge>
                    ) : null}
                    {row.removed ? <Badge size="sm" variant="danger">{t('admin.content.removed')}</Badge> : null}
                  </div>
                  <p className="text-ink-muted mt-0.5 truncate text-xs">
                    {row.subtitle}
                    {row.author ? ` · by ${row.author.displayName} (@${row.author.username})` : ''} ·{' '}
                    {format(row.createdAt, 'dayShort')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {row.verified !== null && !row.removed ? (
                    <Button size="sm" variant="secondary" loading={busy === `v-${row.id}`} onClick={() => void toggleVerified(row)}>
                      <BadgeCheck /> {row.verified ? t('admin.content.unverify') : t('admin.content.verify')}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant={row.removed ? 'secondary' : 'danger'}
                    loading={busy === row.id}
                    onClick={() => void toggleRemoved(row)}
                  >
                    {row.removed ? t('admin.content.restore') : t('admin.content.remove')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
