import { Avatar, Badge, Button, Card, Logo } from '@nexus/ui';
import { interestCategory, interestLabel } from '@/i18n/interests';
import { IMG } from '@/lib/photos';
import { MapPin } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProfileActions } from '@/components/people/profile-actions';
import { PostCard } from '@/components/social/post-card';
import { BadgeStrip } from '@/components/learning/badge-wall';
import { getBadgesFor } from '@/lib/learning-server';
import { API_BASE } from '@/lib/api';
import { getSession } from '@/lib/session';
import { getPostsBy, getRelationship } from '@/lib/social-server';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type PublicProfile = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  occupation: string | null;
  userType: string;
  countryCode: string;
  city: string | null;
  skills: string[];
  interests: { slug: string; label: string }[];
  joinedAt: string;
  verified: boolean;
  isOwner: boolean;
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const t = await getT();
  const store = await cookies();

  const response = await fetch(`${API_BASE}/profiles/${username.toLowerCase()}`, {
    headers: { Cookie: store.toString() },
    cache: 'no-store',
  });

  if (response.status === 404) notFound();

  if (response.status === 403) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <Logo className="mb-8" />
        <h1 className="text-2xl font-semibold tracking-tight">{t('publicProfile.privateTitle')}</h1>
        <p className="text-ink-muted mt-2.5 max-w-sm text-sm leading-relaxed">
          {t('publicProfile.privateBody', { username })}
        </p>
        <Button asChild variant="secondary" className="mt-7">
          <Link href="/">{t('publicProfile.back')}</Link>
        </Button>
      </div>
    );
  }

  if (!response.ok) notFound();

  const profile = (await response.json()) as PublicProfile;
  const badges = await getBadgesFor(profile.username);
  const viewer = await getSession();

  const [relationship, posts] = viewer
    ? await Promise.all([getRelationship(profile.username), getPostsBy(profile.username)])
    : [null, []];

  return (
    <div className="min-h-dvh">
      <header className="border-line bg-ground/80 sticky top-0 z-30 border-b px-5 py-3.5 backdrop-blur-xl sm:px-8">
        <Link href="/" aria-label={t('nav.home')}>
          <Logo />
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
        <div className="relative h-44 overflow-hidden rounded-3xl sm:h-60">
          <img src={profile.coverUrl ?? IMG.kigaliSunset} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,0),rgba(11,13,16,.55))]" />
        </div>

        <div className="relative -mt-12 flex flex-col gap-4 px-4 sm:flex-row sm:items-end">
          <Avatar
            name={profile.displayName}
            src={profile.avatarUrl ?? undefined}
            size="2xl"
            className="ring-ground ring-4"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="t-h1 truncate">
                {profile.displayName}
              </h1>
              {profile.verified ? (
                <Badge variant="success" size="sm">
                  {t('common.verified')}
                </Badge>
              ) : null}
            </div>
            <p className="text-ink-muted mt-1 text-sm">
              @{profile.username}
              {profile.occupation ? ` · ${profile.occupation}` : ''}
            </p>
          </div>
          {profile.isOwner ? (
            <Button asChild variant="secondary" className="shrink-0">
              <Link href="/profile">{t('publicProfile.edit')}</Link>
            </Button>
          ) : relationship && !relationship.isSelf ? (
            <div className="shrink-0">
              <ProfileActions username={profile.username} relationship={relationship} />
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">{t('profile.about')}</h2>
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              {profile.bio || t('publicProfile.noBio')}
            </p>
            {profile.city ? (
              <p className="text-ink-muted mt-4 inline-flex items-center gap-2 text-sm">
                <MapPin className="size-3.5" />
                {profile.city}, {profile.countryCode}
              </p>
            ) : null}
          </Card>

          {badges ? <BadgeStrip set={badges} /> : null}

          {profile.interests.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">{t('profile.interests')}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest.slug} variant="accent" size="sm">
                    {interestLabel(t, interest.slug, interest.label)}
                  </Badge>
                ))}
              </div>
            </Card>
          ) : null}

          {profile.skills.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">{t('profile.skills')}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} size="sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          ) : null}

          {viewer ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">{t('publicProfile.posts')}</h2>
              {posts.length === 0 ? (
                <Card className="p-6">
                  <p className="text-ink-muted text-sm">
                    {t('publicProfile.noPosts')}
                  </p>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
