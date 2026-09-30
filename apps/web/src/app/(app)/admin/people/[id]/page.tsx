import { Badge, Card } from '@nexus/ui';
import { ArrowLeft, Globe, Laptop, MapPin, Wallet } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PersonActions } from '@/components/admin/person-actions';
import { getDossier } from '@/lib/control-server';
import { IMG } from '@/lib/photos';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function when(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function device(agent: string | null) {
  if (!agent) return 'Unknown device';
  const browser = /Edg\//.test(agent) ? 'Edge' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : /node|undici/i.test(agent) ? 'Script' : 'Browser';
  const os = /Windows/.test(agent) ? 'Windows' : /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : /Mac OS/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' on ');
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-ink-muted shrink-0">{label}</span>
      <span className="min-w-0 text-right font-medium break-words">{value}</span>
    </div>
  );
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, viewer] = await Promise.all([getDossier(id), getSession()]);

  if (!person || !viewer) notFound();

  const profile = person.profile;
  const counts = profile?._count ?? {};
  const status = person.deletedAt ? 'deleted' : person.status === 'PENDING' ? 'not verified' : person.status.toLowerCase();

  const activity: [string, number][] = [
    ['Posts', counts.posts ?? 0],
    ['Comments', counts.comments ?? 0],
    ['Friends', profile?.friends ?? 0],
    ['Followers', counts.followers ?? 0],
    ['Following', counts.following ?? 0],
    ['Circles', counts.circleMemberships ?? 0],
    ['Events hosted', counts.eventsHosted ?? 0],
    ['Events joined', counts.eventAttendance ?? 0],
    ['Places added', counts.placesCreated ?? 0],
    ['Reviews', counts.placeReviews ?? 0],
    ['Listings', counts.listings ?? 0],
    ['Orders placed', counts.ordersPlaced ?? 0],
    ['Orders received', counts.ordersReceived ?? 0],
    ['Messages', counts.messages ?? 0],
    ['Tasks', counts.tasks ?? 0],
    ['Goals', counts.goals ?? 0],
    ['Learning paths', counts.learningPaths ?? 0],
    ['Study sessions', counts.studySessions ?? 0],
    ['Reports filed', counts.reportsMade ?? 0],
    ['Reports against', person.reportsAgainst.length],
  ];

  return (
    <div>
      <Link href="/admin/people" className="text-ink-muted hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" /> All people
      </Link>

      <div className="border-line relative overflow-hidden rounded-3xl border">
        <img src={profile?.coverUrl ?? IMG.kigaliRooftops} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,.35),rgba(11,13,16,.9))]" />
        <div className="relative flex flex-wrap items-end gap-5 p-6 pt-24 text-white md:p-8 md:pt-32">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="size-24 rounded-2xl object-cover ring-4 ring-black/40" />
          ) : (
            <span className="grid size-24 place-items-center rounded-2xl bg-white/15 text-3xl font-bold backdrop-blur">
              {(profile?.displayName ?? person.email).slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="t-d2">{profile?.displayName ?? person.email}</h2>
            <p className="mt-1 text-white/75">
              {profile ? `@${profile.username} · ` : ''}
              {profile?.occupation ?? profile?.userType?.toLowerCase().replace('_', ' ')}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="accent">{person.role.toLowerCase()}</Badge>
              <Badge variant={person.deletedAt ? 'neutral' : person.status === 'ACTIVE' ? 'success' : person.status === 'SUSPENDED' ? 'danger' : 'warning'}>
                {status}
              </Badge>
              {profile?.city ? (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 text-[11.5px] font-semibold backdrop-blur">
                  <MapPin className="size-3" /> {profile.city}
                </span>
              ) : null}
            </div>
          </div>
          {profile ? (
            <Link href={`/u/${profile.username}`} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
              View public profile
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold">About</h3>
            <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">{profile?.bio ?? 'They have not written a bio yet.'}</p>
            {profile && profile.interests.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <span key={interest.label} className="bg-surface-raised rounded-full px-2.5 py-1 text-xs">
                    {interest.label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="divide-line mt-4 divide-y">
              <Row label="Type" value={profile?.userType?.toLowerCase().replace('_', ' ') ?? '—'} />
              <Row label="Goals" value={profile?.goalAreas.map((g) => g.toLowerCase().replace('_', ' ')).join(', ') || '—'} />
              <Row label="Wants help with" value={profile?.helpAreas.map((g) => g.toLowerCase().replace(/_/g, ' ')).join(', ') || '—'} />
              <Row label="Skills" value={profile?.skills.join(', ') || '—'} />
              <Row label="Country · timezone" value={`${profile?.countryCode ?? '—'} · ${profile?.timezone ?? '—'}`} />
              <Row label="Onboarding" value={profile?.onboardedAt ? `Finished ${when(profile.onboardedAt)}` : 'Not finished'} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold">Activity</h3>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {activity.map(([label, value]) => (
                <div key={label} className="bg-surface-raised rounded-xl p-3">
                  <div className="num text-xl font-semibold">{value}</div>
                  <div className="text-ink-muted text-[11.5px]">{label}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-lg font-semibold">Recent posts</h3>
              {person.recentPosts.length === 0 ? (
                <p className="text-ink-muted mt-2 text-sm">No posts.</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {person.recentPosts.map((post) => (
                    <div key={post.id} className="bg-surface-raised rounded-xl p-3 text-sm">
                      <p className={post.deletedAt ? 'text-ink-subtle line-through' : ''}>{post.body.slice(0, 180)}</p>
                      <p className="text-ink-subtle mt-1 text-xs">
                        {post.visibility.toLowerCase()} · {when(post.createdAt)}
                        {post.deletedAt ? ' · removed' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-semibold">Reports against them</h3>
              {person.reportsAgainst.length === 0 ? (
                <p className="text-ink-muted mt-2 text-sm">Nobody has reported this person.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {person.reportsAgainst.map((report) => (
                    <div key={report.id} className="bg-surface-raised rounded-xl p-3 text-sm">
                      <p className="font-medium">{report.reason}</p>
                      <p className="text-ink-subtle mt-0.5 text-xs">
                        by @{report.reporter.username} · {report.status.toLowerCase()} · {when(report.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {person.circles.length > 0 ? (
                <>
                  <h3 className="mt-5 text-lg font-semibold">Circles</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {person.circles.map((circle) => (
                      <Link key={circle.slug} href={`/circles/${circle.slug}`} className="bg-surface-raised rounded-full px-2.5 py-1 text-xs hover:underline">
                        {circle.name} · {circle.role.toLowerCase()}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-lg font-semibold">History</h3>
            <div className="mt-3 space-y-1.5">
              {person.history.length === 0 ? <p className="text-ink-muted text-sm">Nothing recorded.</p> : null}
              {person.history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="font-mono">{entry.action}</span>
                  <span className="text-ink-subtle shrink-0 text-xs">
                    {entry.ipAddress ? `${entry.ipAddress} · ` : ''}
                    {when(entry.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <PersonActions person={person} viewerRole={viewer.role as never} viewerId={viewer.id} />

          <Card className="p-5">
            <h3 className="text-lg font-semibold">Account</h3>
            <div className="divide-line mt-2 divide-y">
              <Row label="Email" value={person.email} />
              <Row label="Email verified" value={person.emailVerifiedAt ? when(person.emailVerifiedAt) : 'No'} />
              <Row label="Joined" value={when(person.createdAt)} />
              <Row label="Last sign-in" value={when(person.lastLoginAt)} />
              {person.suspendedUntil ? <Row label="Suspended until" value={when(person.suspendedUntil)} /> : null}
              {person.suspendedReason ? <Row label="Suspension reason" value={person.suspendedReason} /> : null}
              {person.deletedAt ? <Row label="Deleted" value={when(person.deletedAt)} /> : null}
              <Row label="Profile visibility" value={String(profile?.privacy?.profileVisibility ?? 'PUBLIC').toLowerCase()} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="size-4" /> Wallet
            </h3>
            <p className="num font-display mt-2 text-3xl font-bold">{person.wallet?.balance.display ?? 'No wallet'}</p>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold">Signed in on</h3>
            {person.sessions.length === 0 ? (
              <p className="text-ink-muted mt-2 text-sm">No active sessions.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {person.sessions.map((session) => (
                  <div key={session.id} className="flex items-start gap-2.5 text-sm">
                    {/Windows|Mac|Linux/.test(session.userAgent ?? '') ? (
                      <Laptop className="text-ink-muted mt-0.5 size-4" />
                    ) : (
                      <Globe className="text-ink-muted mt-0.5 size-4" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{device(session.userAgent)}</p>
                      <p className="text-ink-subtle text-xs">
                        {session.ipAddress ?? 'unknown IP'} · last used {when(session.lastUsedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
