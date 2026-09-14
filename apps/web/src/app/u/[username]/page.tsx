import { Avatar, Badge, Button, Card, Logo } from '@nexus/ui';
import { MapPin } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { API_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

type PublicProfile = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
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
        <h1 className="text-2xl font-semibold tracking-tight">This profile is private</h1>
        <p className="text-ink-muted mt-2.5 max-w-sm text-sm leading-relaxed">
          @{username} has chosen not to share their profile publicly.
        </p>
        <Button asChild variant="secondary" className="mt-7">
          <Link href="/">Back to Nexus</Link>
        </Button>
      </div>
    );
  }

  if (!response.ok) notFound();

  const profile = (await response.json()) as PublicProfile;

  return (
    <div className="min-h-dvh">
      <header className="border-line border-b px-5 py-4 sm:px-8">
        <Link href="/" aria-label="Nexus home">
          <Logo />
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
        <div
          className="h-32 rounded-xl sm:h-40"
          style={{
            background:
              'linear-gradient(120deg, color-mix(in oklab, var(--accent) 22%, var(--surface)) 0%, color-mix(in oklab, var(--module-ai) 18%, var(--surface)) 55%, var(--surface) 100%)',
          }}
        />

        <div className="-mt-12 flex flex-col gap-4 px-1 sm:flex-row sm:items-end">
          <Avatar
            name={profile.displayName}
            src={profile.avatarUrl ?? undefined}
            size="2xl"
            className="ring-ground ring-4"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {profile.displayName}
              </h1>
              {profile.verified ? (
                <Badge variant="success" size="sm">
                  Verified
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
              <Link href="/profile">Edit your profile</Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">About</h2>
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              {profile.bio || 'This person has not written a bio yet.'}
            </p>
            {profile.city ? (
              <p className="text-ink-muted mt-4 inline-flex items-center gap-2 text-sm">
                <MapPin className="size-3.5" />
                {profile.city}, {profile.countryCode}
              </p>
            ) : null}
          </Card>

          {profile.interests.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">Interests</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest.slug} variant="accent" size="sm">
                    {interest.label}
                  </Badge>
                ))}
              </div>
            </Card>
          ) : null}

          {profile.skills.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-[0.9375rem] font-semibold">Skills</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} size="sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
