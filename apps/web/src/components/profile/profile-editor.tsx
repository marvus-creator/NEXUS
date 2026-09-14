'use client';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Textarea,
  cn,
} from '@nexus/ui';
import { Camera, Check, Loader2, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { InterestGroup } from '@/lib/interests';
import { profileClient } from '@/lib/profile-client';
import type { SessionUser } from '@/lib/session';

export function ProfileEditor({
  user,
  interestGroups,
}: {
  user: SessionUser;
  interestGroups: InterestGroup[];
}) {
  const router = useRouter();
  const profile = user.profile!;
  const fileInput = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [skills, setSkills] = useState(profile.skills.join(', '));
  const [interests, setInterests] = useState<string[]>(
    profile.interests.map((interest) => interest.slug),
  );

  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onAvatarPicked(file: File | undefined) {
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const result = await profileClient.uploadAvatar(file);
      setAvatarUrl(result.avatarUrl);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError(null);
    setSaving(true);
    setSaved(false);

    try {
      await profileClient.update({
        displayName,
        bio: bio || undefined,
        occupation: occupation || undefined,
        city: city || undefined,
        skills: skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
          .slice(0, 20),
        interestSlugs: interests,
      });

      setSaved(true);
      setEditing(false);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleInterest(slug: string) {
    setInterests((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  return (
    <div>
      <div className="relative">
        <div
          className="h-40 rounded-xl sm:h-52"
          style={{
            background:
              'linear-gradient(120deg, color-mix(in oklab, var(--accent) 22%, var(--surface)) 0%, color-mix(in oklab, var(--module-ai) 18%, var(--surface)) 55%, var(--surface) 100%)',
          }}
        />

        <div className="-mt-12 flex flex-col gap-4 px-1 sm:-mt-14 sm:flex-row sm:items-end sm:gap-6">
          <div className="relative w-fit">
            <Avatar
              name={displayName}
              src={avatarUrl ?? undefined}
              size="2xl"
              className="ring-ground ring-4"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              aria-label="Change profile photo"
              className="border-line bg-surface text-ink hover:bg-surface-hover absolute right-0 bottom-1 flex size-9 items-center justify-center rounded-full border transition-colors"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={(event) => void onAvatarPicked(event.target.files?.[0])}
            />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {displayName}
              </h1>
              {user.emailVerified ? (
                <Badge variant="success" size="sm">
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  Unverified
                </Badge>
              )}
            </div>
            <p className="text-ink-muted mt-1 text-sm">
              @{profile.username}
              {occupation ? ` · ${occupation}` : ''}
              {city ? ` · ${city}` : ''}
            </p>
          </div>

          <div className="shrink-0 pb-1">
            {editing ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                  <X /> Cancel
                </Button>
                <Button onClick={save} loading={saving}>
                  <Check /> Save
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Edit profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-danger/35 mt-6 rounded-md border bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3.5 py-3">
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      {saved && !editing ? (
        <div className="mt-6 rounded-md border border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-3.5 py-3">
          <p className="text-sm">Profile updated.</p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">About</h2>

            {editing ? (
              <div className="mt-5 flex flex-col gap-5">
                <Field label="Display name">
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </Field>
                <Field label="Bio" hint={`${bio.length}/280`}>
                  <Textarea
                    value={bio}
                    maxLength={280}
                    placeholder="What are you working on?"
                    onChange={(event) => setBio(event.target.value)}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Occupation">
                    <Input value={occupation} onChange={(event) => setOccupation(event.target.value)} />
                  </Field>
                  <Field label="City">
                    <Input value={city} onChange={(event) => setCity(event.target.value)} />
                  </Field>
                </div>
                <Field label="Skills" hint="Separate with commas">
                  <Input value={skills} onChange={(event) => setSkills(event.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-ink-muted text-sm leading-relaxed">
                  {bio || 'No bio yet. Tell people what you are working on.'}
                </p>
                {profile.skills.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} size="sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[0.9375rem] font-semibold">Interests</h2>
              <span className="text-ink-subtle text-xs">{interests.length} selected</span>
            </div>

            {editing ? (
              <div className="mt-5 flex flex-col gap-6">
                {interestGroups.map((group) => (
                  <div key={group.category}>
                    <p className="text-micro text-ink-subtle mb-2.5 font-semibold uppercase">
                      {group.category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.interests.map((interest) => (
                        <button
                          key={interest.slug}
                          type="button"
                          onClick={() => toggleInterest(interest.slug)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            interests.includes(interest.slug)
                              ? 'border-accent bg-accent text-accent-ink'
                              : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                          )}
                        >
                          {interest.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : profile.interests.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest.slug} variant="accent" size="sm">
                    {interest.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-ink-muted mt-4 text-sm">
                No interests yet. They shape what Discover shows you.
              </p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">Details</h2>
            <dl className="mt-4 flex flex-col gap-3.5 text-sm">
              {[
                ['Username', `@${profile.username}`],
                [
                  'Type',
                  profile.userType
                    .replace('_', ' ')
                    .toLowerCase()
                    .replace(/^./, (character) => character.toUpperCase()),
                ],
                ['Region', `${profile.countryCode} · ${profile.timezone}`],
                ['Currency', profile.currency],
                ['Language', profile.locale],
                ['Joined', new Date(user.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="truncate font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">Your week</h2>
            {profile.scheduleBlocks.length > 0 ? (
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                {profile.scheduleBlocks.length} fixed blocks are on your calendar. Nexus plans around
                them.
              </p>
            ) : (
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                Nothing fixed yet. Adding your classes or work hours is what lets Nexus schedule
                around your real life.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
