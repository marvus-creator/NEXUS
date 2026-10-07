import { Card } from '@nexus/ui';
import { ArrowRight, Ban, Clock, Flag, MailCheck, Megaphone, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { AnalyticsPanel } from '@/components/admin/analytics-panel';
import { getAnalytics, getReportQueue } from '@/lib/admin-server';
import { getDirectory, getFullAudit, getPlatformSettings } from '@/lib/control-server';
import { getSession } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import type { Translate } from '@/i18n/types';

export const dynamic = 'force-dynamic';

function ago(iso: string, t: Translate) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('notifications.ago.minutes', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('notifications.ago.hours', { n: hours });
  return t('notifications.ago.days', { n: Math.round(hours / 24) });
}

export default async function ControlOverview() {
  const user = await getSession();
  const { t } = await getI18n();
  const isAdmin = user?.role === 'ADMIN';

  const [directory, queue, audit, settings, analytics] = await Promise.all([
    getDirectory({ sort: 'newest' }),
    getReportQueue('OPEN'),
    getFullAudit(),
    getPlatformSettings(),
    isAdmin ? getAnalytics() : Promise.resolve(null),
  ]);

  const tiles = [
    { label: t('admin.overview.total'), value: directory.total, icon: Users, tint: 'var(--accent)', href: '/admin/people' },
    { label: t('admin.overview.active'), value: directory.byStatus.ACTIVE ?? 0, icon: UserCheck, tint: 'var(--module-nearby)', href: '/admin/people?status=ACTIVE' },
    { label: t('admin.overview.waiting'), value: directory.byStatus.PENDING ?? 0, icon: MailCheck, tint: 'var(--module-events)', href: '/admin/people?status=PENDING' },
    { label: t('admin.overview.suspended'), value: directory.byStatus.SUSPENDED ?? 0, icon: Ban, tint: 'var(--danger)', href: '/admin/people?status=SUSPENDED' },
    { label: t('admin.overview.reports'), value: queue.reports.length, icon: Flag, tint: 'var(--module-people)', href: '/admin/reports' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card interactive className="h-full p-4" tint={tile.tint}>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted text-[13px]">{tile.label}</span>
                <span
                  className="grid size-8 place-items-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${tile.tint} 16%, transparent)`, color: tile.tint }}
                >
                  <tile.icon className="size-4" />
                </span>
              </div>
              <div className="num font-display mt-3 text-4xl font-extrabold tracking-tight">{tile.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      {!settings.registrationOpen || settings.announcement?.active ? (
        <Card className="flex flex-wrap items-center gap-3 p-4" tint="#F5A524">
          <Megaphone className="text-module-events size-5" />
          <div className="min-w-0 flex-1 text-sm">
            {!settings.registrationOpen ? <p className="font-semibold">{t('admin.overview.paused')}</p> : null}
            {settings.announcement?.active ? (
              <p className="text-ink-muted">{t('admin.overview.bannerLive', { message: settings.announcement.message })}</p>
            ) : null}
          </div>
          <Link href="/admin/platform" className="text-accent text-sm font-medium hover:underline">
            {t('admin.overview.settings')}
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('admin.overview.newest')}</h2>
            <Link href="/admin/people" className="text-accent flex items-center gap-1 text-[13px] font-medium hover:underline">
              {t('admin.overview.everyone')} <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="divide-line divide-y">
            {directory.users.slice(0, 7).map((person) => (
              <Link
                key={person.id}
                href={`/admin/people/${person.id}`}
                className="hover:bg-surface-raised -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition"
              >
                {person.profile?.avatarUrl ? (
                  <img src={person.profile.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <span className="bg-surface-raised grid size-10 place-items-center rounded-full text-xs font-semibold">
                    {(person.profile?.displayName ?? person.email).slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{person.profile?.displayName ?? person.email}</div>
                  <div className="text-ink-muted truncate text-xs">
                    {person.profile?.occupation ?? person.email}
                    {person.profile?.city ? ` · ${person.profile.city}` : ''}
                  </div>
                </div>
                <span className="text-ink-subtle num shrink-0 text-xs">{ago(person.createdAt, t)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('admin.overview.latest')}</h2>
            <Link href="/admin/audit" className="text-accent flex items-center gap-1 text-[13px] font-medium hover:underline">
              {t('admin.overview.audit')} <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {audit.slice(0, 9).map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5 text-[13px]">
                <Clock className="text-ink-subtle mt-0.5 size-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{entry.action}</span>
                  <span className="text-ink-muted">
                    {' '}
                    · {entry.actor?.profile?.displayName ?? entry.actor?.email ?? t('admin.overview.system')}
                  </span>
                </div>
                <span className="text-ink-subtle num shrink-0 text-xs">{ago(entry.createdAt, t)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {analytics ? <AnalyticsPanel analytics={analytics} /> : null}
    </div>
  );
}
