'use client';

import { Card } from '@nexus/ui';
import { CalendarDays, MessageSquare, ShoppingBag, UserCheck, Users } from 'lucide-react';
import type { Analytics } from '@/lib/admin-client';
import { useT } from '@/i18n/client';

function Sparkline({ series, tint }: { series: { date: string; count: number }[]; tint: string }) {
  const max = Math.max(1, ...series.map((point) => point.count));

  return (
    <div className="mt-3 flex h-12 items-end gap-[2px]">
      {series.map((point) => (
        <span
          key={point.date}
          title={`${point.date} — ${point.count}`}
          className="min-w-0 flex-1 rounded-[2px]"
          style={{
            height: `${Math.max(3, (point.count / max) * 100)}%`,
            background:
              point.count === 0
                ? 'color-mix(in oklab, var(--ink-subtle) 20%, transparent)'
                : `color-mix(in oklab, ${tint} 70%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: Analytics }) {
  const { people, content, commerce } = analytics;
  const t = useT();

  const tiles = [
    {
      label: t('admin.analytics.people'),
      value: people.total.toLocaleString(),
      caption: t('admin.analytics.peopleCaption', { active: people.active, verified: people.verified, suspended: people.suspended }),
      icon: Users,
      tint: 'var(--accent)',
    },
    {
      label: t('admin.analytics.joined', { n: analytics.windowDays }),
      value: people.newInWindow.toLocaleString(),
      caption: t('admin.analytics.joinedCaption', { n: people.signedInInWindow }),
      icon: UserCheck,
      tint: 'var(--module-people)',
    },
    {
      label: t('admin.analytics.happening'),
      value: (content.events + content.circles).toLocaleString(),
      caption: t('admin.analytics.happeningCaption', { events: content.events, circles: content.circles, places: content.places }),
      icon: CalendarDays,
      tint: 'var(--module-events)',
    },
    {
      label: t('admin.analytics.conversation'),
      value: (content.posts + content.messages).toLocaleString(),
      caption: t('admin.analytics.conversationCaption', { posts: content.posts, messages: content.messages }),
      icon: MessageSquare,
      tint: 'var(--module-discover)',
    },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <div className="flex items-center gap-2">
              <tile.icon className="size-4" style={{ color: tile.tint }} />
              <p className="text-ink-muted text-xs font-medium">{tile.label}</p>
            </div>
            <p className="mt-2.5 text-3xl font-semibold tracking-tight tabular-nums">{tile.value}</p>
            <p className="text-ink-subtle mt-1 text-xs">{tile.caption}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-[0.8125rem] font-semibold">{t('admin.analytics.signups')}</p>
          <p className="text-ink-subtle text-xs">{t('admin.analytics.lastDays', { n: analytics.windowDays })}</p>
          <Sparkline series={analytics.series.signups} tint="var(--accent)" />
        </Card>

        <Card className="p-4">
          <p className="text-[0.8125rem] font-semibold">{t('admin.analytics.posts')}</p>
          <p className="text-ink-subtle text-xs">{t('admin.analytics.lastDays', { n: analytics.windowDays })}</p>
          <Sparkline series={analytics.series.posts} tint="var(--module-discover)" />
        </Card>

        <Card className="p-4">
          <p className="text-[0.8125rem] font-semibold">{t('admin.analytics.lastSignIn')}</p>
          <p className="text-ink-subtle text-xs">{t('admin.analytics.lastSignInBody')}</p>
          <Sparkline series={analytics.series.logins} tint="var(--module-people)" />
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-4" style={{ color: 'var(--module-nearby)' }} />
          <p className="text-[0.8125rem] font-semibold">{t('admin.analytics.marketplace')}</p>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{commerce.activeListings}</p>
            <p className="text-ink-subtle text-xs">{t('admin.analytics.listings')}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {commerce.paidOrders}
              <span className="text-ink-subtle text-sm font-normal">{t('admin.analytics.of', { n: commerce.orders })}</span>
            </p>
            <p className="text-ink-subtle text-xs">{t('admin.analytics.ordersPaid')}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {commerce.settled.length > 0
                ? commerce.settled.map((entry) => entry.display).join(' · ')
                : '—'}
            </p>
            <p className="text-ink-subtle text-xs">{t('admin.analytics.settled')}</p>
          </div>
        </div>

        <p className="text-ink-subtle mt-3.5 text-xs leading-relaxed">
          {t('admin.analytics.settledNote')}
          
        </p>
      </Card>
    </div>
  );
}
