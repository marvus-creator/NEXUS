'use client';

import { Button, Card, cn } from '@nexus/ui';
import { Ban, LogOut, MailCheck, MessageSquare, RotateCcw, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setUserRole, setUserStatus } from '@/lib/admin-client';
import { control, type Dossier, type Role } from '@/lib/control-client';

type Panel = 'none' | 'suspend' | 'message' | 'delete';

const field =
  'border-line bg-surface text-ink placeholder:text-ink-subtle w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]';

export function PersonActions({ person, viewerRole, viewerId }: { person: Dossier; viewerRole: Role; viewerId: string }) {
  const router = useRouter();
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
      setNotice({ tone: 'error', text: (error as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Actions</h2>
      {!canAct ? (
        <p className="text-ink-muted mt-2 text-sm">
          {isSelf
            ? 'This is your own account. Nobody can moderate themselves.'
            : 'This account is at or above your role, so only a higher role can act on it.'}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        <Button
          variant="secondary"
          className="justify-start"
          disabled={!canAct || Boolean(person.emailVerifiedAt)}
          loading={busy === 'verify'}
          onClick={() => run('verify', () => control.verifyEmail(person.id), 'Email marked as verified.')}
        >
          <MailCheck /> {person.emailVerifiedAt ? 'Email already verified' : 'Verify email manually'}
        </Button>

        <Button
          variant="secondary"
          className="justify-start"
          disabled={isSelf}
          onClick={() => setPanel(panel === 'message' ? 'none' : 'message')}
        >
          <MessageSquare /> Send a notification
        </Button>

        <Button
          variant="secondary"
          className="justify-start"
          disabled={!canAct}
          loading={busy === 'signout'}
          onClick={() => run('signout', () => control.signOut(person.id), 'Signed out of every device.')}
        >
          <LogOut /> Sign out everywhere
        </Button>

        {person.status === 'SUSPENDED' ? (
          <Button
            variant="secondary"
            className="justify-start"
            disabled={!canAct}
            loading={busy === 'reinstate'}
            onClick={() => run('reinstate', () => setUserStatus(person.id, { status: 'ACTIVE' }), 'Account reinstated.')}
          >
            <UserCheck /> Lift suspension
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="justify-start"
            disabled={!canAct}
            onClick={() => setPanel(panel === 'suspend' ? 'none' : 'suspend')}
          >
            <Ban /> Suspend
          </Button>
        )}

        {isAdmin ? (
          person.deletedAt ? (
            <Button
              variant="secondary"
              className="justify-start"
              disabled={!canAct}
              loading={busy === 'restore'}
              onClick={() => run('restore', () => control.restore(person.id), 'Account restored.')}
            >
              <RotateCcw /> Restore account
            </Button>
          ) : (
            <Button
              variant="danger"
              className="justify-start"
              disabled={!canAct}
              onClick={() => setPanel(panel === 'delete' ? 'none' : 'delete')}
            >
              <Trash2 /> Delete account
            </Button>
          )
        ) : null}
      </div>

      {panel === 'suspend' ? (
        <div className="border-line mt-4 space-y-2.5 border-t pt-4">
          <p className="text-sm font-medium">Suspend for how long?</p>
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
                {value === '365' ? '1 year' : `${value} ${value === '1' ? 'day' : 'days'}`}
              </button>
            ))}
          </div>
          <textarea className={field} rows={2} placeholder="Reason (they will see this)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            variant="danger"
            loading={busy === 'suspend'}
            onClick={() =>
              run('suspend', () => setUserStatus(person.id, { status: 'SUSPENDED', days: Number(days), reason: reason || undefined }), `Suspended for ${days} days and signed out.`)
            }
          >
            Confirm suspension
          </Button>
        </div>
      ) : null}

      {panel === 'message' ? (
        <div className="border-line mt-4 space-y-2.5 border-t pt-4">
          <input className={field} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={field} rows={3} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button
            disabled={title.trim().length < 2}
            loading={busy === 'message'}
            onClick={() => run('message', () => control.message(person.id, { title: title.trim(), body: body.trim() || undefined }), 'Notification sent.')}
          >
            Send
          </Button>
        </div>
      ) : null}

      {panel === 'delete' ? (
        <div className="border-danger/30 bg-danger/5 mt-4 space-y-2.5 rounded-xl border p-3">
          <p className="text-sm">
            Deleting hides the account everywhere and signs them out. You can restore it later from the
            deleted filter.
          </p>
          <textarea className={field} rows={2} placeholder="Reason for the audit log" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            variant="danger"
            loading={busy === 'delete'}
            onClick={() => run('delete', () => control.remove(person.id, reason || undefined), 'Account deleted.')}
          >
            Yes, delete this account
          </Button>
        </div>
      ) : null}

      {isAdmin && canAct ? (
        <div className="border-line mt-4 border-t pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <ShieldCheck className="size-4" /> Role
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(['USER', 'BUSINESS', 'MODERATOR', 'ADMIN'] as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                disabled={busy !== null || role === person.role}
                onClick={() => run(`role-${role}`, () => setUserRole(person.id, role), `Role changed to ${role.toLowerCase()}.`)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium capitalize transition',
                  role === person.role ? 'bg-accent border-transparent text-white' : 'border-line text-ink-muted hover:text-ink',
                )}
              >
                {role.toLowerCase()}
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
