'use client';

import { Badge, Button, Card, EmptyState, Input, cn } from '@nexus/ui';
import {
  AlertTriangle,
  Ban,
  Check,
  FileText,
  Flag,
  Gavel,
  MessageSquare,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  actOnReport,
  setUserStatus,
  type AdminUser,
  type AuditEntry,
  type ModerationReport,
  type ReportQueue,
} from '@/lib/admin-client';
import { useT } from '@/i18n/client';
import type { Translate } from '@/i18n/types';

const TARGET_ICON = {
  PROFILE: UserIcon,
  POST: FileText,
  COMMENT: MessageSquare,
} as const;

function when(iso: string, t: Translate) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);

  if (hours < 1) return t('notifications.ago.minutes', { n: Math.max(1, Math.floor(diff / 60_000)) });
  if (hours < 24) return t('notifications.ago.hours', { n: hours });

  return t('notifications.ago.days', { n: Math.floor(hours / 24) });
}

function ReportCard({ report, onDone }: { report: ModerationReport; onDone: (id: string) => void }) {
  const router = useRouter();
  const t = useT();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const Icon = TARGET_ICON[report.target.type];
  const author = report.target.author;

  async function act(action: 'DISMISS' | 'REMOVE_CONTENT' | 'SUSPEND' | 'WARN') {
    setBusy(true);
    setError(null);

    try {
      await actOnReport(report.id, { action, note: note.trim() || undefined, days: 7 });
      onDone(report.id);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.moderation.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{ background: 'color-mix(in oklab, var(--module-events) 14%, transparent)' }}
        >
          <Icon className="size-4" style={{ color: 'var(--module-events)' }} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.9375rem] font-semibold">{report.reason}</span>
            <Badge>{t(`admin.moderation.target.${report.target.type}`)}</Badge>
            {report.target.removed ? <Badge>{t('admin.moderation.alreadyRemoved')}</Badge> : null}
          </div>

          <p className="text-ink-subtle mt-1 text-xs">
            {t('admin.moderation.reportedBy')}{' '}
            <Link href={`/u/${report.reporter.username}`} className="hover:text-ink transition-colors">
              {report.reporter.displayName}
            </Link>{' '}
            · {when(report.createdAt, t)}
            {author ? (
              <>
                {' '}
                · {t('admin.moderation.about')}{' '}
                <Link href={`/u/${author.username}`} className="hover:text-ink transition-colors">
                  @{author.username}
                </Link>
              </>
            ) : null}
          </p>

          {report.details ? (
            <p className="text-ink-muted mt-2 text-[0.8125rem]">{report.details}</p>
          ) : null}

          {report.target.preview ? (
            <blockquote className="border-border bg-surface-raised text-ink-muted mt-2.5 rounded-lg border-l-2 px-3 py-2 text-[0.8125rem] leading-relaxed">
              {report.target.preview}
            </blockquote>
          ) : (
            <p className="text-ink-subtle mt-2.5 text-[0.8125rem] italic">
              {t('admin.moderation.gone')}
            </p>
          )}

          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('admin.moderation.note')}
            className="mt-3 h-9 text-[0.8125rem]"
          />

          {error ? <p className="text-danger mt-2 text-xs">{error}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void act('DISMISS')} disabled={busy}>
              <Check className="size-4" /> {t('admin.moderation.dismiss')}
            </Button>

            {report.target.exists && report.target.type !== 'PROFILE' && !report.target.removed ? (
              <Button variant="ghost" size="sm" onClick={() => void act('REMOVE_CONTENT')} disabled={busy}>
                <Trash2 className="size-4" /> {t('admin.moderation.remove')}
              </Button>
            ) : null}

            {report.target.exists && author ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => void act('WARN')} disabled={busy}>
                  <AlertTriangle className="size-4" /> {t('admin.moderation.warn')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void act('SUSPEND')} disabled={busy}>
                  <Ban className="size-4" /> {t('admin.moderation.suspend7')}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function UserRow({ user, canModerate }: { user: AdminUser; canModerate: boolean }) {
  const router = useRouter();
  const t = useT();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(user.status);

  async function toggle() {
    setBusy(true);
    setError(null);

    try {
      const next = status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const result = await setUserStatus(user.id, { status: next, days: 7 });
      setStatus(result.status as AdminUser['status']);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.moderation.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[0.875rem] font-medium">
            {user.profile?.displayName ?? user.email}
          </span>
          {user.profile ? (
            <span className="text-ink-subtle truncate text-xs">@{user.profile.username}</span>
          ) : null}
          {user.role !== 'USER' ? <Badge>{t(`admin.roles.${user.role}`)}</Badge> : null}
          {status === 'SUSPENDED' ? (
            <Badge style={{ color: 'var(--danger)' }}>{t('admin.moderation.suspended')}</Badge>
          ) : status === 'PENDING' ? (
            <Badge>{t('admin.moderation.unverified')}</Badge>
          ) : null}
        </div>
        <p className="text-ink-subtle mt-0.5 truncate text-xs">
          {user.email} · {t('admin.moderation.joined', { when: when(user.createdAt, t) })}
          {user.lastLoginAt ? t('admin.moderation.lastIn', { when: when(user.lastLoginAt, t) }) : t('admin.moderation.never')}
          {user.suspendedReason ? ` · ${user.suspendedReason}` : ''}
        </p>
        {error ? <p className="text-danger mt-1 text-xs">{error}</p> : null}
      </div>

      {canModerate ? (
        <Button variant="ghost" size="sm" onClick={() => void toggle()} disabled={busy}>
          {status === 'SUSPENDED' ? t('admin.moderation.reinstate') : t('admin.moderation.suspend')}
        </Button>
      ) : null}
    </Card>
  );
}

export function AdminBoard({
  queue,
  users,
  audit,
  viewerRole,
}: {
  queue: ReportQueue;
  users: AdminUser[];
  audit: AuditEntry[];
  viewerRole: string;
}) {
  const t = useT();
  const [tab, setTab] = useState<'reports' | 'users' | 'audit'>('reports');
  const [reports, setReports] = useState(queue.reports);
  const [search, setSearch] = useState('');

  const visibleUsers = users.filter((user) => {
    if (search.trim().length < 2) return true;

    const term = search.trim().toLowerCase();

    return (
      user.email.toLowerCase().includes(term) ||
      (user.profile?.username ?? '').toLowerCase().includes(term) ||
      (user.profile?.displayName ?? '').toLowerCase().includes(term)
    );
  });

  const tabs = [
    { value: 'reports' as const, count: reports.length },
    { value: 'users' as const, count: users.length },
    { value: 'audit' as const, count: audit.length },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTab(entry.value)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab === entry.value
                ? 'border-transparent bg-accent text-white'
                : 'border-border text-ink-muted hover:text-ink hover:border-ink-subtle',
            )}
          >
            {t(`admin.moderation.tabs.${entry.value}`)}
            <span
              className={cn(
                'grid min-w-4.5 place-items-center rounded-full px-1 text-[0.625rem] font-semibold',
                tab === entry.value ? 'bg-white/25' : 'bg-surface-raised',
              )}
            >
              {entry.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'reports' ? (
        reports.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<ShieldCheck className="size-6" />}
            title={t('admin.moderation.nothingTitle')}
            description={t('admin.moderation.nothingBody')}
          />
        ) : (
          <div className="mt-6 space-y-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onDone={(id) => setReports((current) => current.filter((entry) => entry.id !== id))}
              />
            ))}
          </div>
        )
      ) : null}

      {tab === 'users' ? (
        <div className="mt-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.moderation.search')}
          />

          <div className="mt-4 space-y-2">
            {visibleUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                canModerate={viewerRole === 'ADMIN' || viewerRole === 'MODERATOR'}
              />
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'audit' ? (
        audit.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Gavel className="size-6" />}
            title={t('admin.moderation.noActionsTitle')}
            description={t('admin.moderation.noActionsBody')}
          />
        ) : (
          <div className="mt-6 space-y-2">
            {audit.map((entry) => (
              <Card key={entry.id} className="flex items-center gap-3 p-3">
                <Flag className="text-ink-subtle size-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem]">
                    <span className="font-medium">{entry.action.replace('moderation.', '')}</span>
                    {entry.entityType ? (
                      <span className="text-ink-subtle">{t('admin.moderation.onEntity', { entity: entry.entityType.toLowerCase() })}</span>
                    ) : null}
                  </p>
                  <p className="text-ink-subtle truncate text-xs">
                    {entry.actor
                      ? `${entry.actor.username ? `@${entry.actor.username}` : entry.actor.email}`
                      : 'system'}{' '}
                    · {when(entry.createdAt, t)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
