import { Badge, Card } from '@nexus/ui';
import { Download, Search } from 'lucide-react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import { getDirectory } from '@/lib/control-server';
import { getSession } from '@/lib/session';
import { getI18n } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  DEACTIVATED: 'neutral',
} as const;

const ROLE_VARIANT = { ADMIN: 'ai', MODERATOR: 'accent', BUSINESS: 'events', USER: 'neutral' } as const;

const select =
  'border-line bg-surface text-ink h-10 rounded-xl border px-3 text-sm outline-none focus:border-[var(--accent)]';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; city?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getSession();
  const { t, date: format } = await getI18n();
  const date = (iso: string | null) => (iso ? `${format(iso, 'dayMonth')} ${new Date(iso).getFullYear()}` : t('admin.directory.never'));
  const directory = await getDirectory({
    q: params.q ?? '',
    role: params.role ?? '',
    status: params.status ?? '',
    city: params.city ?? '',
    sort: params.sort ?? 'newest',
    includeDeleted: params.status === 'DELETED' ? 'true' : '',
  });

  return (
    <div>
      <form className="flex flex-wrap items-center gap-2" action="/admin/people">
        <label className="border-line bg-surface focus-within:border-accent flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3">
          <Search className="text-ink-muted size-4" />
          <input
            name="q"
            defaultValue={params.q}
            placeholder={t('admin.directory.search')}
            className="placeholder:text-ink-subtle h-full w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select name="role" defaultValue={params.role ?? ''} className={select} aria-label={t('admin.directory.role')}>
          <option value="">{t('admin.directory.anyRole')}</option>
          <option value="USER">{t('admin.directory.users')}</option>
          <option value="BUSINESS">{t('admin.directory.business')}</option>
          <option value="MODERATOR">{t('admin.directory.moderators')}</option>
          <option value="ADMIN">{t('admin.directory.admins')}</option>
        </select>
        <select name="status" defaultValue={params.status ?? ''} className={select} aria-label={t('admin.directory.status')}>
          <option value="">{t('admin.directory.anyStatus')}</option>
          <option value="ACTIVE">{t('admin.directory.active')}</option>
          <option value="PENDING">{t('admin.directory.notVerified')}</option>
          <option value="SUSPENDED">{t('admin.directory.suspended')}</option>
          <option value="DELETED">{t('admin.directory.deleted')}</option>
        </select>
        <select name="sort" defaultValue={params.sort ?? 'newest'} className={select} aria-label={t('admin.directory.sort')}>
          <option value="newest">{t('admin.directory.newest')}</option>
          <option value="oldest">{t('admin.directory.oldest')}</option>
          <option value="active">{t('admin.directory.recent')}</option>
          <option value="name">{t('admin.directory.name')}</option>
        </select>
        <input
          name="city"
          defaultValue={params.city}
          placeholder={t('admin.directory.city')}
          className={`${select} w-28`}
        />
        <button className="bg-accent h-10 rounded-xl px-4 text-sm font-semibold text-accent-ink">{t('admin.directory.apply')}</button>
        {viewer?.role === 'ADMIN' ? (
          <a
            href={`${API_BASE}/admin/control/people.csv`}
            className="border-line bg-surface hover:border-line-strong flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium"
          >
            <Download className="size-4" /> {t('admin.directory.export')}
          </a>
        ) : null}
      </form>

      <p className="text-ink-muted mt-4 text-sm">
        <span className="num text-ink font-semibold">{directory.total}</span>{' '}
        {directory.total === 1 ? t('admin.directory.person') : t('admin.directory.people')}
        {directory.users.length < directory.total ? t('admin.directory.showing', { n: directory.users.length }) : ''}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {directory.users.map((person) => {
          const profile = person.profile;
          const status = person.deletedAt ? 'DELETED' : person.status;

          return (
            <Link key={person.id} href={`/admin/people/${person.id}`}>
              <Card interactive className={`h-full p-4 ${person.deletedAt ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="bg-surface-raised grid size-12 shrink-0 place-items-center rounded-full text-sm font-semibold">
                      {(profile?.displayName ?? person.email).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{profile?.displayName ?? t('admin.directory.noProfile')}</div>
                    <div className="text-ink-muted truncate text-xs">
                      {profile ? `@${profile.username} · ` : ''}
                      {person.email}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge size="sm" variant={ROLE_VARIANT[person.role]}>
                        {t(`admin.roles.${person.role}`)}
                      </Badge>
                      <Badge
                        size="sm"
                        variant={status === 'DELETED' ? 'neutral' : STATUS_VARIANT[person.status]}
                      >
                        {t(`admin.directory.statusNames.${status}`)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-ink-muted mt-3 line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed">
                  {profile?.bio ?? profile?.occupation ?? t('admin.directory.noDescription')}
                </p>

                {profile && profile.interests.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {profile.interests.map((interest) => (
                      <span key={interest} className="bg-surface-raised text-ink-muted rounded-full px-2 py-0.5 text-[11px]">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="border-line text-ink-subtle mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-center text-[11px]">
                  {[
                    [t('admin.directory.counts.posts'), profile?._count.posts ?? 0],
                    [t('admin.directory.counts.circles'), profile?._count.circleMemberships ?? 0],
                    [t('admin.directory.counts.events'), profile?._count.eventsHosted ?? 0],
                    [t('admin.directory.counts.listings'), profile?._count.listings ?? 0],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="num text-ink text-sm font-semibold">{value}</div>
                      {label}
                    </div>
                  ))}
                </div>

                <div className="text-ink-subtle mt-3 flex justify-between text-[11px]">
                  <span>{t('admin.directory.joined', { date: date(person.createdAt) })}</span>
                  <span>{t('admin.directory.lastSeen', { date: date(person.lastLoginAt) })}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
