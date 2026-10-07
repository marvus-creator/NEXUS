'use client';

import { Badge, Button, Card, Field, Input, Switch, cn } from '@nexus/ui';
import { Check, Loader2, LogOut, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_BASE } from '@/lib/api';
import { profileClient } from '@/lib/profile-client';
import type { SessionUser } from '@/lib/session';
import { useErrorText, useFormatDate, useT } from '@/i18n/client';

export type ActiveSession = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

const VISIBILITY = [
  { value: 'PUBLIC' },
  { value: 'FRIENDS' },
  { value: 'PRIVATE' },
] as const;

const MESSAGING = [
  { value: 'EVERYONE' },
  { value: 'FRIENDS' },
  { value: 'NOBODY' },
] as const;

function browserFrom(agent: string | null) {
  if (!agent) return null;
  if (agent.includes('Edg/')) return 'Edge';
  if (agent.includes('Chrome/')) return 'Chrome';
  if (agent.includes('Firefox/')) return 'Firefox';
  if (agent.includes('Safari/')) return 'Safari';
  return null;
}

export function PrivacyPanel({ user }: { user: SessionUser }) {
  const privacy = (user.profile?.privacy ?? {}) as Record<string, unknown>;

  const t = useT();
  const errorText = useErrorText();
  const [visibility, setVisibility] = useState(String(privacy.profileVisibility ?? 'PUBLIC'));
  const [messagePolicy, setMessagePolicy] = useState(String(privacy.messagePolicy ?? 'EVERYONE'));
  const [allowFriendRequests, setAllowFriendRequests] = useState(
    privacy.allowFriendRequests !== false,
  );
  const [showActivity, setShowActivity] = useState(privacy.showActivity !== false);
  const [showInPeopleYouKnow, setShowInPeopleYouKnow] = useState(
    privacy.showInPeopleYouKnow !== false,
  );
  const [personalizationOptIn, setPersonalizationOptIn] = useState(
    privacy.personalizationOptIn !== false,
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await profileClient.updatePrivacy({
        profileVisibility: visibility,
        messagePolicy,
        allowFriendRequests,
        showActivity,
        showInPeopleYouKnow,
        personalizationOptIn,
      });
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const toggles = [
    {
      label: t('privacy.toggles.friendRequests'),
      blurb: t('privacy.toggles.friendRequestsBlurb'),
      value: allowFriendRequests,
      set: setAllowFriendRequests,
    },
    {
      label: t('privacy.toggles.activity'),
      blurb: t('privacy.toggles.activityBlurb'),
      value: showActivity,
      set: setShowActivity,
    },
    {
      label: t('privacy.toggles.suggest'),
      blurb: t('privacy.toggles.suggestBlurb'),
      value: showInPeopleYouKnow,
      set: setShowInPeopleYouKnow,
    },
    {
      label: t('privacy.toggles.personalized'),
      blurb: t('privacy.toggles.personalizedBlurb'),
      value: personalizationOptIn,
      set: setPersonalizationOptIn,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-[0.9375rem] font-semibold">{t('privacy.whoSees')}</h2>
        <div className="mt-4 flex flex-col gap-2">
          {VISIBILITY.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setVisibility(option.value)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                visibility === option.value
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-line-strong',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                  visibility === option.value ? 'border-accent bg-accent' : 'border-line-strong',
                )}
              >
                {visibility === option.value ? (
                  <Check className="text-accent-ink size-2.5" />
                ) : null}
              </span>
              <span>
                <span className="block text-sm font-medium">{t(`privacy.visibility.${option.value}`)}</span>
                <span className="text-ink-muted mt-0.5 block text-xs">{t(`privacy.visibilityBlurb.${option.value}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-[0.9375rem] font-semibold">{t('privacy.whoMessages')}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {MESSAGING.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMessagePolicy(option.value)}
              className={cn(
                'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                messagePolicy === option.value
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {t(`privacy.messaging.${option.value}`)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="divide-y divide-[var(--border)]">
        {toggles.map((toggle) => (
          <div key={toggle.label} className="flex items-center justify-between gap-6 p-5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{toggle.label}</p>
              <p className="text-ink-muted mt-0.5 text-xs leading-relaxed">{toggle.blurb}</p>
            </div>
            <Switch checked={toggle.value} onCheckedChange={toggle.set} />
          </div>
        ))}
      </Card>

      {error ? <p className="text-danger text-sm">{errorText(error)}</p> : null}

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving}>
          {t('privacy.save')}
        </Button>
        {saved ? <span className="text-success text-sm">{t('privacy.saved')}</span> : null}
      </div>
    </div>
  );
}

export function SecurityPanel({ sessions }: { sessions: ActiveSession[] }) {
  const router = useRouter();
  const t = useT();
  const format = useFormatDate();
  const errorText = useErrorText();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function changePassword() {
    setError(null);
    setChanging(true);
    setChanged(false);

    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(message ?? t('security.passwordFailed'));
      }

      setChanged(true);
      setTimeout(() => {
        router.replace('/sign-in');
        router.refresh();
      }, 1600);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setChanging(false);
    }
  }

  async function signOutEverywhere() {
    setSigningOut(true);

    try {
      await fetch(`${API_BASE}/auth/logout-all`, { method: 'POST', credentials: 'include' });
    } catch {}

    router.replace('/sign-in');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-[0.9375rem] font-semibold">{t('security.sessions')}</h2>
        <p className="text-ink-muted mt-1 text-sm">
          {t('security.sessionsBody')}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {sessions.length === 0 ? (
            <p className="text-ink-subtle text-sm">{t('security.none')}</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="border-line bg-surface-raised flex items-center gap-4 rounded-lg border p-4"
              >
                <span className="border-line text-ink-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
                  <Monitor className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{browserFrom(session.userAgent) ?? (session.userAgent ? t('security.unknownBrowser') : t('security.unknownDevice'))}</p>
                    {session.current ? (
                      <Badge variant="success" size="sm">
                        {t('security.thisDevice')}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-ink-muted mt-0.5 font-mono text-xs">
                    {session.ipAddress ?? t('security.unknownIp')} ·{' '}
                    {t('security.lastUsed', { when: `${format(session.lastUsedAt, 'dayShort')} ${format(session.lastUsedAt, 'time')}` })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          variant="secondary"
          onClick={signOutEverywhere}
          disabled={signingOut}
          className="mt-5"
        >
          {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          {t('security.everywhere')}
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-[0.9375rem] font-semibold">{t('security.changeTitle')}</h2>
        <p className="text-ink-muted mt-1 text-sm">
          {t('security.changeBody')}
        </p>

        <div className="mt-5 flex max-w-sm flex-col gap-5">
          <Field label={t('security.current')}>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label={t('security.new')} hint={t('security.atLeast10')}>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>

          {error ? <p className="text-danger text-sm">{errorText(error)}</p> : null}
          {changed ? (
            <p className="text-success text-sm">{t('security.changed')}</p>
          ) : null}

          <Button
            onClick={changePassword}
            loading={changing}
            disabled={newPassword.length < 10 || currentPassword.length === 0}
          >
            {t('security.changeTitle')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
