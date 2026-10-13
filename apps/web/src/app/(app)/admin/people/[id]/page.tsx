import { Badge, Card } from '@nexus/ui';
import { ArrowLeft, Globe, Laptop, MapPin, Wallet } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PersonActions } from '@/components/admin/person-actions';
import { getDossier } from '@/lib/control-server';
import { getSession } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { messages } from '@/i18n/messages';

export const dynamic = 'force-dynamic';

function device(agent: string | null) {
  if (!agent) return '—';
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
  const { t, date: format } = await getI18n();
  const when = (iso: string | null) =>
    iso ? `${format(iso, 'dayMonth')} ${new Date(iso).getFullYear()}, ${format(iso, 'time')}` : t('admin.directory.never');
  const userType = (value: string) =>
    value in messages.enums.userType ? t(`enums.userType.${value as keyof typeof messages.enums.userType}`) : value;
  const goalArea = (value: string) =>
    value in messages.enums.goalArea ? t(`enums.goalArea.${value as keyof typeof messages.enums.goalArea}`) : value;
  const helpArea = (value: string) =>
    value in messages.enums.helpArea ? t(`enums.helpArea.${value as keyof typeof messages.enums.helpArea}`) : value;
  const [person, viewer] = await Promise.all([getDossier(id), getSession()]);

  if (!person || !viewer) notFound();

  const profile = person.profile;
  const counts = profile?._count ?? {};
  const status = t(`admin.directory.statusNames.${person.deletedAt ? 'DELETED' : person.status}`);

  const activity: [string, number][] = [
    [t('admin.dossier.stats.posts'), counts.posts ?? 0],
    [t('admin.dossier.stats.comments'), counts.comments ?? 0],
    [t('admin.dossier.stats.friends'), profile?.friends ?? 0],
    [t('admin.dossier.stats.followers'), counts.followers ?? 0],
    [t('admin.dossier.stats.following'), counts.following ?? 0],
    [t('admin.dossier.stats.circles'), counts.circleMemberships ?? 0],
    [t('admin.dossier.stats.eventsHosted'), counts.eventsHosted ?? 0],
    [t('admin.dossier.stats.eventsJoined'), counts.eventAttendance ?? 0],
    [t('admin.dossier.stats.places'), counts.placesCreated ?? 0],
    [t('admin.dossier.stats.reviews'), counts.placeReviews ?? 0],
    [t('admin.dossier.stats.listings'), counts.listings ?? 0],
    [t('admin.dossier.stats.ordersPlaced'), counts.ordersPlaced ?? 0],
    [t('admin.dossier.stats.ordersReceived'), counts.ordersReceived ?? 0],
    [t('admin.dossier.stats.messages'), counts.messages ?? 0],
    [t('admin.dossier.stats.tasks'), counts.tasks ?? 0],
    [t('admin.dossier.stats.goals'), counts.goals ?? 0],
    [t('admin.dossier.stats.paths'), counts.learningPaths ?? 0],
    [t('admin.dossier.stats.sessions'), counts.studySessions ?? 0],
    [t('admin.dossier.stats.reportsMade'), counts.reportsMade ?? 0],
    [t('admin.dossier.stats.reportsAgainst'), person.reportsAgainst.length],
  ];

  return (
    <div>
      <Link href="/admin/people" className="text-ink-muted hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" /> {t('admin.dossier.all')}
      </Link>

      <div className="border-line bg-surface flex flex-wrap items-center gap-5 rounded-xl border p-6">
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="size-16 rounded-xl object-cover" />
        ) : (
          <span className="bg-surface-raised text-ink-muted grid size-16 place-items-center rounded-xl text-xl font-semibold">
            {(profile?.displayName ?? person.email).slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="t-h1">{profile?.displayName ?? person.email}</h2>
          <p className="text-ink-muted mt-1">
            {profile ? `@${profile.username} · ` : ''}
            {profile?.occupation ?? (profile?.userType ? userType(profile.userType) : '')}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="accent">{t(`admin.roles.${person.role}`)}</Badge>
            <Badge variant={person.deletedAt ? 'neutral' : person.status === 'ACTIVE' ? 'success' : person.status === 'SUSPENDED' ? 'danger' : 'warning'}>
              {status}
            </Badge>
            {profile?.city ? (
              <Badge variant="neutral">
                <MapPin className="size-3" /> {profile.city}
              </Badge>
            ) : null}
          </div>
        </div>
        {profile ? (
          <Link href={`/u/${profile.username}`} className="border-line hover:bg-surface-raised rounded-lg border px-4 py-2 text-sm font-medium">
            {t('admin.dossier.viewPublic')}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold">{t('admin.dossier.about')}</h3>
            <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">{profile?.bio ?? t('admin.dossier.noBio')}</p>
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
              <Row label={t('admin.dossier.type')} value={profile?.userType ? userType(profile.userType) : '—'} />
              <Row label={t('admin.dossier.goals')} value={profile?.goalAreas.map((g) => goalArea(g)).join(', ') || '—'} />
              <Row label={t('admin.dossier.help')} value={profile?.helpAreas.map((g) => helpArea(g)).join(', ') || '—'} />
              <Row label={t('admin.dossier.skills')} value={profile?.skills.join(', ') || '—'} />
              <Row label={t('admin.dossier.country')} value={`${profile?.countryCode ?? '—'} · ${profile?.timezone ?? '—'}`} />
              <Row label={t('admin.dossier.onboarding')} value={profile?.onboardedAt ? t('admin.dossier.finished', { date: when(profile.onboardedAt) }) : t('admin.dossier.notFinished')} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold">{t('admin.dossier.activity')}</h3>
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
              <h3 className="text-lg font-semibold">{t('admin.dossier.recentPosts')}</h3>
              {person.recentPosts.length === 0 ? (
                <p className="text-ink-muted mt-2 text-sm">{t('admin.dossier.noPosts')}</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {person.recentPosts.map((post) => (
                    <div key={post.id} className="bg-surface-raised rounded-xl p-3 text-sm">
                      <p className={post.deletedAt ? 'text-ink-subtle line-through' : ''}>{post.body.slice(0, 180)}</p>
                      <p className="text-ink-subtle mt-1 text-xs">
                        {t(`social.visibility.${post.visibility as 'PUBLIC' | 'FRIENDS' | 'PRIVATE'}`)} · {when(post.createdAt)}
                        {post.deletedAt ? ' · removed' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-semibold">{t('admin.dossier.reportsAgainst')}</h3>
              {person.reportsAgainst.length === 0 ? (
                <p className="text-ink-muted mt-2 text-sm">{t('admin.dossier.noReports')}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {person.reportsAgainst.map((report) => (
                    <div key={report.id} className="bg-surface-raised rounded-xl p-3 text-sm">
                      <p className="font-medium">{report.reason}</p>
                      <p className="text-ink-subtle mt-0.5 text-xs">
                        {t('admin.dossier.by', { username: report.reporter.username })} · {report.status.toLowerCase()} · {when(report.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {person.circles.length > 0 ? (
                <>
                  <h3 className="mt-5 text-lg font-semibold">{t('admin.dossier.circles')}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {person.circles.map((circle) => (
                      <Link key={circle.slug} href={`/circles/${circle.slug}`} className="bg-surface-raised rounded-full px-2.5 py-1 text-xs hover:underline">
                        {circle.name} · {t(`enums.circleRole.${circle.role as 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'}`)}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-lg font-semibold">{t('admin.dossier.history')}</h3>
            <div className="mt-3 space-y-1.5">
              {person.history.length === 0 ? <p className="text-ink-muted text-sm">{t('admin.dossier.nothing')}</p> : null}
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
            <h3 className="text-lg font-semibold">{t('admin.dossier.account')}</h3>
            <div className="divide-line mt-2 divide-y">
              <Row label={t('admin.dossier.email')} value={person.email} />
              <Row label={t('admin.dossier.emailVerified')} value={person.emailVerifiedAt ? when(person.emailVerifiedAt) : t('admin.dossier.no')} />
              <Row label={t('admin.dossier.joined')} value={when(person.createdAt)} />
              <Row label={t('admin.dossier.lastSignIn')} value={when(person.lastLoginAt)} />
              {person.suspendedUntil ? <Row label={t('admin.dossier.suspendedUntil')} value={when(person.suspendedUntil)} /> : null}
              {person.suspendedReason ? <Row label={t('admin.dossier.reason')} value={person.suspendedReason} /> : null}
              {person.deletedAt ? <Row label={t('admin.dossier.deleted')} value={when(person.deletedAt)} /> : null}
              <Row label={t('admin.dossier.visibility')} value={t(`privacy.visibility.${String(profile?.privacy?.profileVisibility ?? 'PUBLIC') as 'PUBLIC' | 'FRIENDS' | 'PRIVATE'}`)} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="size-4" /> {t('admin.dossier.wallet')}
            </h3>
            <p className="num font-display mt-2 text-3xl font-bold">{person.wallet?.balance.display ?? t('admin.dossier.noWallet')}</p>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold">{t('admin.dossier.signedInOn')}</h3>
            {person.sessions.length === 0 ? (
              <p className="text-ink-muted mt-2 text-sm">{t('admin.dossier.noSessions')}</p>
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
