'use client';

import { Button, Card, cn } from '@nexus/ui';
import { Ban, LogOut, MailCheck, MessageSquare, RotateCcw, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setUserRole, setUserStatus } from '@/lib/admin-client';
import { control, type Dossier, type Role } from '@/lib/control-client';
import { useErrorText, useT } from '@/i18n/client';

type Panel = 'none' | 'suspend' | 'message' | 'delete';

const field =
  'border-line bg-surface text-ink placeholder:text-ink-subtle w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]';

export function PersonActions({ person, viewerRole, viewerId }: { person: Dossier; viewerRole: Role; viewerId: string }) {
  const router = useRouter();
  const t = useT();
  const errorText = useErrorText();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [panel, setPanel] = useState<Panel>('none');
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const isSelf = person.id === viewerId;
  const isAdmin = viewerRole === 'ADMIN';
  const rank: Record<Role, number> = { USER: 0, BUSINESS: 1, MODERATOR: 2, ADMIN: 3 };
  const canAct = !isSelf && rank[person.role] < rank[viewerRole];

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'ok', text: success });
      setPanel('none');
      router.refresh();
    } catch (error) {
      setNotice({ tone: 'error', text: errorText((error as Error).message) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">{t('admin.actions.title')}</h2>
      {!canAct ? (
        <p className="text-ink-muted mt-2 text-sm">
          {isSelf
            ? t('admin.actions.self')
            : t('admin.actions.higher')}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        <Button
          variant="secondary"
          className="justify-start"
          disabled={!canAct || Boolean(person.emailVerifiedAt)}
          loading={busy === 'verify'}
          onClick={() => run('verify', () => control.verifyEmail(person.id), t('admin.actions.verified'))}
        >
          <MailCheck /> {person.emailVerifiedAt ? t('admin.actions.alreadyVerified') : t('admin.actions.verify')}
        </Button>

        <Button
          variant="secondary"
          className="justify-start"
          disabled={isSelf}
          onClick={() => setPanel(panel === 'message' ? 'none' : 'message')}
        >
          <MessageSquare /> {t('admin.actions.notify')}
        </Button>

        <Button
          variant="secondary"
          className="justify-start"
          disabled={!canAct}
          loading={busy === 'signout'}
          onClick={() => run('signout', () => control.signOut(person.id), t('admin.actions.signedOut'))}
        >
          <LogOut /> {t('admin.actions.signOut')}
        </Button>

        {person.status === 'SUSPENDED' ? (
          <Button
            variant="secondary"
            className="justify-start"
            disabled={!canAct}
            loading={busy === 'reinstate'}
            onClick={() => run('reinstate', () => setUserStatus(person.id, { status: 'ACTIVE' }), t('admin.actions.reinstated'))}
          >
            <UserCheck /> {t('admin.actions.lift')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="justify-start"
            disabled={!canAct}
            onClick={() => setPanel(panel === 'suspend' ? 'none' : 'suspend')}
          >
            <Ban /> {t('admin.actions.suspend')}
          </Button>
        )}

        {isAdmin ? (
          person.deletedAt ? (
            <Button
              variant="secondary"
              className="justify-start"
              disabled={!canAct}
              loading={busy === 'restore'}
              onClick={() => run('restore', () => control.restore(person.id), t('admin.actions.restored'))}
            >
              <RotateCcw /> {t('admin.actions.restore')}
            </Button>
          ) : (
            <Button
              variant="danger"
              className="justify-start"
              disabled={!canAct}
              onClick={() => setPanel(panel === 'delete' ? 'none' : 'delete')}
            >
              <Trash2 /> {t('admin.actions.delete')}
            </Button>
          )
        ) : null}
      </div>

      {panel === 'suspend' ? (
        <div className="border-line mt-4 space-y-2.5 border-t pt-4">
          <p className="text-sm font-medium">{t('admin.actions.howLong')}</p>
          <div className="flex flex-wrap gap-1.5">
            {['1', '7', '30', '90', '365'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium',
                  days === value ? 'bg-ink text-ground border-transparent' : 'border-line text-ink-muted',
                )}
              >
                {value === '365' ? t('admin.actions.oneYear') : t(value === '1' ? 'admin.actions.day' : 'admin.actions.days', { n: value })}
              </button>
            ))}
          </div>
          <textarea className={field} rows={2} placeholder={t('admin.actions.reason')} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            variant="danger"
            loading={busy === 'suspend'}
            onClick={() =>
              run('suspend', () => setUserStatus(person.id, { status: 'SUSPENDED', days: Number(days), reason: reason || undefined }), t('admin.actions.suspended', { n: days }))
            }
          >
            {t('admin.actions.confirm')}
          </Button>
        </div>
      ) : null}

      {panel === 'message' ? (
        <div className="border-line mt-4 space-y-2.5 border-t pt-4">
          <input className={field} placeholder={t('admin.actions.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={field} rows={3} placeholder={t('admin.actions.messagePlaceholder')} value={body} onChange={(e) => setBody(e.target.value)} />
          <Button
            disabled={title.trim().length < 2}
            loading={busy === 'message'}
            onClick={() => run('message', () => control.message(person.id, { title: title.trim(), body: body.trim() || undefined }), t('admin.actions.sent'))}
          >
            {t('admin.actions.send')}
          </Button>
        </div>
      ) : null}

      {panel === 'delete' ? (
        <div className="border-danger/30 bg-danger/5 mt-4 space-y-2.5 rounded-xl border p-3">
          <p className="text-sm">
            {t('admin.actions.deleteNote')}
            
          </p>
          <textarea className={field} rows={2} placeholder={t('admin.actions.auditReason')} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            variant="danger"
            loading={busy === 'delete'}
            onClick={() => run('delete', () => control.remove(person.id, reason || undefined), t('admin.actions.deleted'))}
          >
            {t('admin.actions.yesDelete')}
          </Button>
        </div>
      ) : null}

      {isAdmin && canAct ? (
        <div className="border-line mt-4 border-t pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <ShieldCheck className="size-4" /> {t('admin.actions.role')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(['USER', 'BUSINESS', 'MODERATOR', 'ADMIN'] as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                disabled={busy !== null || role === person.role}
                onClick={() => run(`role-${role}`, () => setUserRole(person.id, role), t('admin.actions.roleChanged', { role: t(`admin.roles.${role}`) }))}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium capitalize transition',
                  role === person.role ? 'bg-accent border-transparent text-accent-ink' : 'border-line text-ink-muted hover:text-ink',
                )}
              >
                {t(`admin.roles.${role}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {notice ? (
        <p className={cn('mt-4 text-sm', notice.tone === 'ok' ? 'text-success' : 'text-danger')}>{notice.text}</p>
      ) : null}
    </Card>
  );
}
