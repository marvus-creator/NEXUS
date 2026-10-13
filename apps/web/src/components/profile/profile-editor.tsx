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
import { interestCategory, interestLabel } from '@/i18n/interests';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { InterestGroup } from '@/lib/interests';
import { profileClient } from '@/lib/profile-client';
import { CoverButton } from '@/components/app/cover-button';
import type { SessionUser } from '@/lib/session';
import { useFormatDate, useT } from '@/i18n/client';
import { LOCALE_NAMES, isLocale } from '@/i18n/config';

const USER_TYPE_KEYS = {
  STUDENT: true,
  PROFESSIONAL: true,
  CREATOR: true,
  BUSINESS_OWNER: true,
  ENTREPRENEUR: true,
  ATHLETE: true,
  OTHER: true,
} as const;

export function ProfileEditor({
  user,
  interestGroups,
}: {
  user: SessionUser;
  interestGroups: InterestGroup[];
}) {
  const router = useRouter();
  const t = useT();
  const format = useFormatDate();
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
        <div className="relative h-40 overflow-hidden rounded-xl sm:h-52">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="bg-surface-raised absolute inset-0" />
          )}
          <CoverButton target={{ kind: 'profile' }} className="absolute top-3 right-3" />
        </div>

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
              aria-label={t('profile.changePhoto')}
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
                  {t('profile.verified')}
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  {t('profile.unverified')}
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
                  <X /> {t('common.cancel')}
                </Button>
                <Button onClick={save} loading={saving}>
                  <Check /> {t('common.save')}
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> {t('profile.editProfile')}
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
          <p className="text-sm">{t('profile.updated')}</p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">{t('profile.about')}</h2>

            {editing ? (
              <div className="mt-5 flex flex-col gap-5">
                <Field label={t('profile.displayName')}>
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </Field>
                <Field label={t('profile.bio')} hint={`${bio.length}/280`}>
                  <Textarea
                    value={bio}
                    maxLength={280}
                    placeholder={t('profile.bioPlaceholder')}
                    onChange={(event) => setBio(event.target.value)}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t('profile.occupation')}>
                    <Input value={occupation} onChange={(event) => setOccupation(event.target.value)} />
                  </Field>
                  <Field label={t('profile.city')}>
                    <Input value={city} onChange={(event) => setCity(event.target.value)} />
                  </Field>
                </div>
                <Field label={t('profile.skills')} hint={t('profile.skillsHint')}>
                  <Input value={skills} onChange={(event) => setSkills(event.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-ink-muted text-sm leading-relaxed">
                  {bio || t('profile.noBio')}
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
              <h2 className="text-[0.9375rem] font-semibold">{t('profile.interests')}</h2>
              <span className="text-ink-subtle text-xs">{interests.length} selected</span>
            </div>

            {editing ? (
              <div className="mt-5 flex flex-col gap-6">
                {interestGroups.map((group) => (
                  <div key={group.category}>
                    <p className="text-micro text-ink-subtle mb-2.5 font-semibold uppercase">
                      {interestCategory(t, group.category)}
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
                          {interestLabel(t, interest.slug, interest.label)}
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
                    {interestLabel(t, interest.slug, interest.label)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-ink-muted mt-4 text-sm">
                {t('profile.noInterests')}
              </p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">{t('profile.details')}</h2>
            <dl className="mt-4 flex flex-col gap-3.5 text-sm">
              {[
                [t('profile.username'), `@${profile.username}`],
                [
                  t('profile.type'),
                  profile.userType in USER_TYPE_KEYS
                    ? t(`enums.userType.${profile.userType as keyof typeof USER_TYPE_KEYS}`)
                    : profile.userType,
                ],
                [t('profile.region'), `${profile.countryCode} · ${profile.timezone}`],
                [t('profile.currency'), profile.currency],
                [t('profile.language'), LOCALE_NAMES[isLocale(profile.locale) ? profile.locale : 'en'].native],
                [t('profile.joined'), format(user.createdAt, 'dayMonth') + ' ' + new Date(user.createdAt).getFullYear()],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="truncate font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-[0.9375rem] font-semibold">{t('profile.yourWeek')}</h2>
            {profile.scheduleBlocks.length > 0 ? (
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                {t('profile.blocks', { n: profile.scheduleBlocks.length })}
                
              </p>
            ) : (
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                {t('profile.noBlocks')}
                
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
