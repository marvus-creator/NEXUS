'use client';

import { Button, Card, Switch, cn } from '@nexus/ui';
import { Megaphone, Send, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { control, type PlatformSettings, type Role } from '@/lib/control-client';
import { useT } from '@/i18n/client';

const field =
  'border-line bg-surface text-ink placeholder:text-ink-subtle w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]';

const TONES = [
  { value: 'info', color: '#3B82F6' },
  { value: 'success', color: '#22C55E' },
  { value: 'warning', color: '#F5A524' },
] as const;

export function PlatformPanel({ initial }: { initial: PlatformSettings }) {
  const [settings, setSettings] = useState(initial);
  const t = useT();
  const [message, setMessage] = useState(initial.announcement?.message ?? '');
  const [tone, setTone] = useState<'info' | 'warning' | 'success'>(initial.announcement?.tone ?? 'info');
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [city, setCity] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(key: string, patch: Partial<PlatformSettings>, done: string) {
    setSaving(key);
    setStatus(null);
    try {
      setSettings(await control.updateSettings(patch));
      setStatus(done);
    } catch (caught) {
      setStatus((caught as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function broadcast() {
    setSaving('broadcast');
    setSent(null);
    setError(null);
    try {
      const result = await control.broadcast({
        title: title.trim(),
        body: body.trim() || undefined,
        role: role || undefined,
        city: city.trim() || undefined,
      });
      setSent(t(result.recipients === 1 ? 'admin.platform.sentToOne' : 'admin.platform.sentTo', { n: result.recipients }));
      setTitle('');
      setBody('');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5" tint="#3B82F6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Send className="text-accent size-5" /> {t('admin.platform.broadcast')}
        </h2>
        <p className="text-ink-muted mt-1 text-sm">
          {t('admin.platform.broadcastBody')}
        </p>
        <div className="mt-4 space-y-2.5">
          <input className={field} placeholder={t('admin.platform.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={field} rows={4} placeholder={t('admin.actions.messagePlaceholder')} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className={field} value={role} onChange={(e) => setRole(e.target.value as Role | '')}>
              <option value="">{t('admin.platform.everyone')}</option>
              <option value="USER">{t('admin.platform.users')}</option>
              <option value="BUSINESS">{t('admin.platform.businesses')}</option>
              <option value="MODERATOR">{t('admin.platform.moderators')}</option>
              <option value="ADMIN">{t('admin.platform.admins')}</option>
            </select>
            <input className={field} placeholder={t('admin.platform.city')} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <Button disabled={title.trim().length < 2} loading={saving === 'broadcast'} onClick={() => void broadcast()}>
            <Send /> {t('admin.platform.send')}
          </Button>
          {sent ? <p className="text-success text-sm">{sent}</p> : null}
          {error ? <p className="text-danger text-sm">{error}</p> : null}
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-5" tint="#F5A524">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Megaphone className="text-module-events size-5" /> {t('admin.platform.banner')}
          </h2>
          <p className="text-ink-muted mt-1 text-sm">
            {t('admin.platform.bannerBody')}
          </p>
          <textarea
            className={cn(field, 'mt-4')}
            rows={2}
            maxLength={280}
            placeholder={t('admin.platform.bannerPlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {TONES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setTone(entry.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                  tone === entry.value ? 'bg-ink text-ground border-transparent' : 'border-line text-ink-muted',
                )}
              >
                <span className="size-2 rounded-full" style={{ background: entry.color }} />
                {t(`admin.platform.tones.${entry.value}`)}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={message.trim().length < 3}
              loading={saving === 'banner-on'}
              onClick={() => void save('banner-on', { announcement: { message: message.trim(), tone, active: true } }, t('admin.platform.live'))}
            >
              {settings.announcement?.active ? t('admin.platform.update') : t('admin.platform.publish')}
            </Button>
            {settings.announcement?.active ? (
              <Button
                variant="secondary"
                loading={saving === 'banner-off'}
                onClick={() => void save('banner-off', { announcement: { ...settings.announcement!, active: false } }, t('admin.platform.takenDown'))}
              >
                {t('admin.platform.takeDown')}
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <UserPlus className="text-module-nearby size-5" /> {t('admin.platform.signups')}
              </h2>
              <p className="text-ink-muted mt-1 text-sm">
                {settings.registrationOpen
                  ? t('admin.platform.open')
                  : t('admin.platform.paused')}
              </p>
            </div>
            <Switch
              checked={settings.registrationOpen}
              disabled={saving === 'registration'}
              onCheckedChange={(value: boolean) =>
                void save('registration', { registrationOpen: value }, value ? t('admin.platform.reopened') : t('admin.platform.pausedNotice'))
              }
              aria-label={t('admin.platform.allow')}
            />
          </div>
        </Card>

        {status ? <p className="text-ink-muted text-sm">{status}</p> : null}
      </div>
    </div>
  );
}
