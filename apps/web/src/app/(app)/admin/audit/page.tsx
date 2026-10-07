import { Card, cn } from '@nexus/ui';
import Link from 'next/link';
import { getFullAudit } from '@/lib/control-server';
import { getI18n } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { value: '', key: 'all' as const },
  { value: 'auth.', key: 'auth' as const },
  { value: 'admin.', key: 'admin' as const },
  { value: 'moderation.', key: 'moderation' as const },
];

function tone(action: string) {
  if (/failed|locked|suspended|deleted|removed/.test(action)) return 'var(--danger)';
  if (/admin\.|moderation\./.test(action)) return 'var(--accent)';
  if (/success|verified|restored|reinstated/.test(action)) return 'var(--success)';
  return 'var(--ink-subtle)';
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action = '' } = await searchParams;
  const { t, date: format } = await getI18n();
  const entries = await getFullAudit(action || undefined);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/audit?action=${filter.value}` : '/admin/audit'}
            className={cn(
              'inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition',
              action === filter.value ? 'bg-ink text-ground border-transparent' : 'border-line bg-surface text-ink hover:border-line-strong',
            )}
          >
            {t(`admin.audit.filters.${filter.key}`)}
          </Link>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-muted border-line border-b text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">{t('admin.audit.when')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.audit.what')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.audit.who')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.audit.on')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.audit.ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-raised/60">
                  <td className="num text-ink-muted px-4 py-2.5 text-xs whitespace-nowrap">
                    {`${format(entry.createdAt, 'dayShort')} ${format(entry.createdAt, 'time')}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2 font-mono text-[12.5px]">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: tone(entry.action) }} />
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {entry.actor ? (
                      <Link href={`/admin/people/${entry.actor.id}`} className="hover:underline">
                        {entry.actor.profile?.displayName ?? entry.actor.email}
                      </Link>
                    ) : (
                      <span className="text-ink-subtle">{t('admin.overview.system')}</span>
                    )}
                  </td>
                  <td className="text-ink-muted px-4 py-2.5 text-xs whitespace-nowrap">
                    {entry.entityType === 'user' && entry.entityId ? (
                      <Link href={`/admin/people/${entry.entityId}`} className="hover:underline">
                        person
                      </Link>
                    ) : (
                      entry.entityType ?? '—'
                    )}
                  </td>
                  <td className="num text-ink-subtle px-4 py-2.5 text-xs">{entry.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
