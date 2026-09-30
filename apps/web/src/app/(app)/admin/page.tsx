import { Card } from '@nexus/ui';
import { ArrowRight, Ban, Clock, Flag, MailCheck, Megaphone, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { AnalyticsPanel } from '@/components/admin/analytics-panel';
import { getAnalytics, getReportQueue } from '@/lib/admin-server';
import { getDirectory, getFullAudit, getPlatformSettings } from '@/lib/control-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function ControlOverview() {
  const user = await getSession();
  const isAdmin = user?.role === 'ADMIN';

  const [directory, queue, audit, settings, analytics] = await Promise.all([
    getDirectory({ sort: 'newest' }),
    getReportQueue('OPEN'),
    getFullAudit(),
    getPlatformSettings(),
    isAdmin ? getAnalytics() : Promise.resolve(null),
  ]);

  const tiles = [
    { label: 'People on NEXUS', value: directory.total, icon: Users, tint: 'var(--accent)', href: '/admin/people' },
    { label: 'Active', value: directory.byStatus.ACTIVE ?? 0, icon: UserCheck, tint: 'var(--module-nearby)', href: '/admin/people?status=ACTIVE' },
    { label: 'Waiting to verify', value: directory.byStatus.PENDING ?? 0, icon: MailCheck, tint: 'var(--module-events)', href: '/admin/people?status=PENDING' },
    { label: 'Suspended', value: directory.byStatus.SUSPENDED ?? 0, icon: Ban, tint: 'var(--danger)', href: '/admin/people?status=SUSPENDED' },
    { label: 'Open reports', value: queue.reports.length, icon: Flag, tint: 'var(--module-people)', href: '/admin/reports' },
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
            {!settings.registrationOpen ? <p className="font-semibold">New sign-ups are paused.</p> : null}
            {settings.announcement?.active ? (
              <p className="text-ink-muted">Banner live: “{settings.announcement.message}”</p>
            ) : null}
          </div>
          <Link href="/admin/platform" className="text-accent text-sm font-medium hover:underline">
            Platform settings
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Newest people</h2>
            <Link href="/admin/people" className="text-accent flex items-center gap-1 text-[13px] font-medium hover:underline">
              Everyone <ArrowRight className="size-3.5" />
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
                <span className="text-ink-subtle num shrink-0 text-xs">{ago(person.createdAt)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest activity</h2>
            <Link href="/admin/audit" className="text-accent flex items-center gap-1 text-[13px] font-medium hover:underline">
              Audit log <ArrowRight className="size-3.5" />
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
                    · {entry.actor?.profile?.displayName ?? entry.actor?.email ?? 'system'}
                  </span>
                </div>
                <span className="text-ink-subtle num shrink-0 text-xs">{ago(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {analytics ? <AnalyticsPanel analytics={analytics} /> : null}
    </div>
  );
}
