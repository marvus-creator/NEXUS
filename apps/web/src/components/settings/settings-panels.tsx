'use client';

import { Badge, Button, Card, Field, Input, Switch, cn } from '@nexus/ui';
import { Check, Loader2, LogOut, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_BASE } from '@/lib/api';
import { profileClient } from '@/lib/profile-client';
import type { SessionUser } from '@/lib/session';

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
  { value: 'PUBLIC', label: 'Public', blurb: 'Anyone on Nexus can see your profile' },
  { value: 'FRIENDS', label: 'Friends', blurb: 'Only people you are friends with' },
  { value: 'PRIVATE', label: 'Private', blurb: 'Only you' },
];

const MESSAGING = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'FRIENDS', label: 'Friends only' },
  { value: 'NOBODY', label: 'Nobody' },
];

function browserFrom(agent: string | null) {
  if (!agent) return 'Unknown device';
  if (agent.includes('Edg/')) return 'Edge';
  if (agent.includes('Chrome/')) return 'Chrome';
  if (agent.includes('Firefox/')) return 'Firefox';
  if (agent.includes('Safari/')) return 'Safari';
  return 'Unknown browser';
}

export function PrivacyPanel({ user }: { user: SessionUser }) {
  const privacy = (user.profile?.privacy ?? {}) as Record<string, unknown>;

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
      label: 'Allow friend requests',
      blurb: 'People can ask to connect with you',
      value: allowFriendRequests,
      set: setAllowFriendRequests,
    },
    {
      label: 'Show my activity',
      blurb: 'Your activity tab is visible to people who can see your profile',
      value: showActivity,
      set: setShowActivity,
    },
    {
      label: 'Suggest me to others',
      blurb: 'Appear in People You May Know for mutual friends and shared circles',
      value: showInPeopleYouKnow,
      set: setShowInPeopleYouKnow,
    },
    {
      label: 'Personalized recommendations',
      blurb: 'Use your interests, circles and activity to shape what Nexus shows you',
      value: personalizationOptIn,
      set: setPersonalizationOptIn,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-[0.9375rem] font-semibold">Who can see your profile</h2>
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
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="text-ink-muted mt-0.5 block text-xs">{option.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-[0.9375rem] font-semibold">Who can message you</h2>
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
              {option.label}
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

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving}>
          Save privacy settings
        </Button>
        {saved ? <span className="text-success text-sm">Saved.</span> : null}
      </div>
    </div>
  );
}

export function SecurityPanel({ sessions }: { sessions: ActiveSession[] }) {
  const router = useRouter();

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
        throw new Error(message ?? 'Could not change your password.');
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
        <h2 className="text-[0.9375rem] font-semibold">Active sessions</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Devices currently signed in to your account.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {sessions.length === 0 ? (
            <p className="text-ink-subtle text-sm">No active sessions found.</p>
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
                    <p className="text-sm font-medium">{browserFrom(session.userAgent)}</p>
                    {session.current ? (
                      <Badge variant="success" size="sm">
                        This device
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-ink-muted mt-0.5 font-mono text-xs">
                    {session.ipAddress ?? 'unknown ip'} · last used{' '}
                    {new Date(session.lastUsedAt).toLocaleString('en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
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
          Sign out everywhere
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-[0.9375rem] font-semibold">Change password</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Changing your password signs out every device, including this one.
        </p>

        <div className="mt-5 flex max-w-sm flex-col gap-5">
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label="New password" hint="At least 10 characters">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>

          {error ? <p className="text-danger text-sm">{error}</p> : null}
          {changed ? (
            <p className="text-success text-sm">Password changed. Signing you out…</p>
          ) : null}

          <Button
            onClick={changePassword}
            loading={changing}
            disabled={newPassword.length < 10 || currentPassword.length === 0}
          >
            Change password
          </Button>
        </div>
      </Card>
    </div>
  );
}
