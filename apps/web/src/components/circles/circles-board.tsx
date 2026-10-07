'use client';

import { Badge, Button, Card, EmptyState, Field, Input, Textarea, cn } from '@nexus/ui';
import { Globe, Lock, Plus, Users, UsersRound, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { communityClient, type CircleSummary } from '@/lib/community-client';
import { circleImage } from '@/lib/photos';
import { ImagePicker } from '@/components/app/image-picker';
import { useErrorText, useT } from '@/i18n/client';

const VISIBILITIES = [
  { value: 'PUBLIC', icon: Globe },
  { value: 'PRIVATE', icon: Lock },
  { value: 'INVITE_ONLY', icon: Users },
] as const;

const VISIBILITY_ICON = { PUBLIC: Globe, PRIVATE: Lock, INVITE_ONLY: Users } as const;

export function CirclesBoard({
  discover,
  mine,
}: {
  discover: CircleSummary[];
  mine: CircleSummary[];
}) {
  const router = useRouter();
  const t = useT();
  const errorText = useErrorText();

  const [tab, setTab] = useState<'discover' | 'mine'>(mine.length > 0 ? 'mine' : 'discover');
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'>('PUBLIC');
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const circles = tab === 'mine' ? mine : discover;

  async function create() {
    if (!name.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const created = await communityClient.createCircle({
        name: name.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        visibility,
        coverUrl: cover ?? undefined,
      });

      router.push(`/circles/${created.slug}`);
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  async function join(circle: CircleSummary) {
    setPending((current) => ({ ...current, [circle.slug]: true }));
    setError(null);

    try {
      const result = await communityClient.join(circle.slug);

      if (result.joined) router.push(`/circles/${circle.slug}`);
      else router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending((current) => ({ ...current, [circle.slug]: false }));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(['mine', 'discover'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === value
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {t(`circles.tabs.${value}`)}
            {value === 'mine' && mine.length > 0 ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[0.625rem] font-semibold',
                  tab === value ? 'bg-white/20' : 'bg-surface-hover',
                )}
              >
                {mine.length}
              </span>
            ) : null}
          </button>
        ))}

        <Button
          size="sm"
          className="ml-auto"
          variant={composing ? 'secondary' : 'primary'}
          onClick={() => setComposing((value) => !value)}
        >
          {composing ? <X /> : <Plus />}
          {composing ? t('common.cancel') : t('circles.newCircle')}
        </Button>
      </div>

      {composing ? (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-4">
            <ImagePicker folder="circles" value={cover} onChange={setCover} />

            <Field label={t('circles.form.name')}>
              <Input
                autoFocus
                value={name}
                placeholder={t('circles.form.namePlaceholder')}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <Field label={t('circles.form.purpose')} hint={t('common.optional')}>
              <Textarea
                value={description}
                placeholder={t('circles.form.purposePlaceholder')}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>

            <Field label={t('circles.form.city')} hint={t('common.optional')}>
              <Input
                value={city}
                placeholder="Kigali"
                onChange={(event) => setCity(event.target.value)}
              />
            </Field>

            <div>
              <p className="text-ink mb-2 text-sm font-medium">{t('circles.form.who')}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {VISIBILITIES.map((option) => {
                  const Icon = option.icon;
                  const active = visibility === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={cn(
                        'flex flex-col items-start gap-1.5 rounded-lg border p-3.5 text-left transition-colors',
                        active
                          ? 'border-accent bg-accent-soft'
                          : 'border-line hover:border-line-strong',
                      )}
                    >
                      <Icon className={cn('size-4', active ? 'text-accent' : 'text-ink-subtle')} />
                      <span className="text-sm font-medium">{t(`circles.visibility.${option.value}`)}</span>
                      <span className="text-ink-muted text-xs">{t(`circles.blurb.${option.value}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? <p className="text-danger text-sm">{errorText(error)}</p> : null}

            <Button onClick={create} loading={busy} disabled={!name.trim()} className="self-start">
              {t('circles.form.create')}
            </Button>
          </div>
        </Card>
      ) : null}

      {error && !composing ? <p className="text-danger mt-4 text-sm">{error}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {circles.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState
              icon={<UsersRound />}
              title={tab === 'mine' ? t('circles.empty.mineTitle') : t('circles.empty.discoverTitle')}
              description={
                tab === 'mine'
                  ? t('circles.empty.mineBody')
                  : t('circles.empty.discoverBody')
              }
              action={
                <Button size="sm" onClick={() => setComposing(true)}>
                  <Plus /> {t('circles.newCircle')}
                </Button>
              }
            />
          </div>
        ) : (
          circles.map((circle) => {
            const Icon = VISIBILITY_ICON[circle.visibility];

            return (
              <Card key={circle.id} className="group flex flex-col overflow-hidden">
                <Link
                  href={`/circles/${circle.slug}`}
                  className="relative block h-36 overflow-hidden"
                >
                  <img
                    src={circleImage(circle)}
                    alt=""
                    className="size-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="from-surface absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold capitalize text-white backdrop-blur-md">
                    <Icon className="size-3" />
                    {circle.visibility === 'INVITE_ONLY'
                      ? t('circles.visibility.INVITE_ONLY')
                      : t(`circles.visibility.${circle.visibility as 'PUBLIC' | 'PRIVATE'}`)}
                  </span>
                  {circle.myRole ? (
                    <span className="bg-accent absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize text-white">
                      {t(`enums.circleRole.${circle.myRole}`)}
                    </span>
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col px-5 pb-5">
                  <div className="-mt-4 flex items-start gap-3">
                    <span className="bg-surface border-line text-accent relative flex size-11 shrink-0 items-center justify-center rounded-xl border">
                      <UsersRound className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-4">
                      <Link
                        href={`/circles/${circle.slug}`}
                        className="font-display block truncate text-lg font-bold tracking-tight hover:underline"
                      >
                        {circle.name}
                      </Link>
                      {circle.city ? (
                        <p className="text-ink-subtle text-xs">{circle.city}</p>
                      ) : null}
                    </div>
                  </div>

                  {circle.description ? (
                    <p className="text-ink-muted mt-3 line-clamp-2 flex-1 text-sm leading-relaxed">
                      {circle.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <div className="border-line mt-4 flex items-center justify-between border-t pt-3.5">
                    <span className="text-ink-subtle text-xs">
                      {t(circle.members === 1 ? 'circles.memberOne' : 'circles.memberMany', { n: circle.members })} ·{' '}
                      {t(circle.posts === 1 ? 'circles.postOne' : 'circles.postMany', { n: circle.posts })}
                    </span>

                    {circle.myRole ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/circles/${circle.slug}`}>{t('circles.open')}</Link>
                      </Button>
                    ) : circle.visibility === 'INVITE_ONLY' ? (
                      <Badge size="sm">{t('circles.visibility.INVITE_ONLY')}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        loading={pending[circle.slug]}
                        onClick={() => void join(circle)}
                      >
                        {circle.visibility === 'PRIVATE' ? t('circles.askToJoin') : t('circles.join')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
