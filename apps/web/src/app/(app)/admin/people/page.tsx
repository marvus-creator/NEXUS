import { Badge, Card } from '@nexus/ui';
import { Download, Search } from 'lucide-react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import { getDirectory } from '@/lib/control-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  DEACTIVATED: 'neutral',
} as const;

const ROLE_VARIANT = { ADMIN: 'ai', MODERATOR: 'accent', BUSINESS: 'events', USER: 'neutral' } as const;

function date(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const select =
  'border-line bg-surface text-ink h-10 rounded-xl border px-3 text-sm outline-none focus:border-[var(--accent)]';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; city?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getSession();
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
            placeholder="Search name, username, email, job or bio"
            className="placeholder:text-ink-subtle h-full w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select name="role" defaultValue={params.role ?? ''} className={select} aria-label="Role">
          <option value="">Any role</option>
          <option value="USER">Users</option>
          <option value="BUSINESS">Business</option>
          <option value="MODERATOR">Moderators</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select name="status" defaultValue={params.status ?? ''} className={select} aria-label="Status">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Not verified</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DELETED">Deleted</option>
        </select>
        <select name="sort" defaultValue={params.sort ?? 'newest'} className={select} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="active">Recently active</option>
          <option value="name">Name A–Z</option>
        </select>
        <input
          name="city"
          defaultValue={params.city}
          placeholder="City"
          className={`${select} w-28`}
        />
        <button className="bg-accent h-10 rounded-xl px-4 text-sm font-semibold text-white">Apply</button>
        {viewer?.role === 'ADMIN' ? (
          <a
            href={`${API_BASE}/admin/control/people.csv`}
            className="border-line bg-surface hover:border-line-strong flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium"
          >
            <Download className="size-4" /> Export CSV
          </a>
        ) : null}
      </form>

      <p className="text-ink-muted mt-4 text-sm">
        <span className="num text-ink font-semibold">{directory.total}</span>{' '}
        {directory.total === 1 ? 'person' : 'people'}
        {directory.users.length < directory.total ? `, showing the first ${directory.users.length}` : ''}
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
                    <div className="truncate font-semibold">{profile?.displayName ?? 'No profile'}</div>
                    <div className="text-ink-muted truncate text-xs">
                      {profile ? `@${profile.username} · ` : ''}
                      {person.email}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge size="sm" variant={ROLE_VARIANT[person.role]}>
                        {person.role.toLowerCase()}
                      </Badge>
                      <Badge
                        size="sm"
                        variant={status === 'DELETED' ? 'neutral' : STATUS_VARIANT[person.status]}
                      >
                        {status === 'PENDING' ? 'not verified' : status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-ink-muted mt-3 line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed">
                  {profile?.bio ?? profile?.occupation ?? 'No description yet.'}
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
                    ['posts', profile?._count.posts ?? 0],
                    ['circles', profile?._count.circleMemberships ?? 0],
                    ['events', profile?._count.eventsHosted ?? 0],
                    ['listings', profile?._count.listings ?? 0],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="num text-ink text-sm font-semibold">{value}</div>
                      {label}
                    </div>
                  ))}
                </div>

                <div className="text-ink-subtle mt-3 flex justify-between text-[11px]">
                  <span>Joined {date(person.createdAt)}</span>
                  <span>Last seen {date(person.lastLoginAt)}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
