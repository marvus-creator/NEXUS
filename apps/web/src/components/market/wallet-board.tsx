'use client';

import { Badge, Button, Card, Field, Input, cn } from '@nexus/ui';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { devGrant, transfer, type WalletEntry, type WalletOverview } from '@/lib/market-client';
import { useErrorText, useT } from '@/i18n/client';
import type { Translate } from '@/i18n/types';

function entryTitle(entry: WalletEntry, t: Translate) {
  const who = entry.counterparty?.profile?.displayName ?? entry.counterparty?.label ?? 'Nexus';

  if (entry.transaction.kind === 'ORDER_PAYMENT') {
    return entry.direction === 'DEBIT' ? t('wallet.paid', { who }) : t('wallet.paymentFrom', { who });
  }

  if (entry.transaction.kind === 'ADJUSTMENT') return t('wallet.grant');

  return entry.direction === 'DEBIT' ? t('wallet.sentTo', { who }) : t('wallet.receivedFrom', { who });
}

export function WalletBoard({ overview }: { overview: WalletOverview }) {
  const router = useRouter();
  const t = useT();
  const errorText = useErrorText();

  const [state, setState] = useState(overview);
  const [sending, setSending] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(amount);

    if (username.trim().length < 2) {
      setError(t('wallet.who'));
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      setError(t('wallet.aboveZero'));
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await transfer({
        username: username.trim().replace(/^@/, ''),
        amount: value,
        memo: memo.trim() || undefined,
        idempotencyKey: requestKey.current,
      });

      requestKey.current = crypto.randomUUID();
      setNotice(t('wallet.sent', { amount: result.amount.display }));
      setUsername('');
      setAmount('');
      setMemo('');
      setSending(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('wallet.sendFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function grant() {
    setBusy(true);
    setError(null);

    try {
      await devGrant(20000);
      setNotice('20,000 added from the development treasury. Not real money.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('wallet.fundsFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Card
          className="p-6"
          style={{ background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))' }}
        >
          <div className="flex items-center gap-2">
            <WalletIcon className="text-accent size-4" />
            <p className="text-ink-muted text-xs font-medium">{t('wallet.balance')}</p>
          </div>

          <p className="mt-2.5 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {state.wallet.balance.display}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setSending((value) => !value)}>
              {sending ? <X className="size-4" /> : <Send className="size-4" />}
              {sending ? t('common.cancel') : t('wallet.send')}
            </Button>

            {!state.rails.connected ? (
              <Button variant="ghost" size="sm" onClick={() => void grant()} disabled={busy}>
                <Sparkles className="size-4" /> {t('wallet.testFunds')}
              </Button>
            ) : null}
          </div>

          {notice ? <p className="text-nearby mt-3 text-xs">{notice}</p> : null}
        </Card>

        {sending ? (
          <Card className="mt-4 p-5">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('wallet.to')} hint={t('wallet.toHint')}>
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="@kevin"
                    autoFocus
                  />
                </Field>
                <Field label={t('wallet.amount', { currency: state.wallet.currency })}>
                  <Input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder="5000"
                  />
                </Field>
              </div>

              <Field label={t('wallet.memo')} hint={t('common.optional')}>
                <Input
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder={t('wallet.memoPlaceholder')}
                />
              </Field>

              {error ? <p className="text-danger text-xs">{errorText(error)}</p> : null}

              <Button type="submit" disabled={busy}>
                {busy ? t('wallet.sending') : t('wallet.send')}
              </Button>
            </form>
          </Card>
        ) : null}

        {error && !sending ? <p className="text-danger mt-3 text-xs">{error}</p> : null}

        <h2 className="mt-8 text-[0.9375rem] font-semibold">{t('wallet.activity')}</h2>

        {state.history.length === 0 ? (
          <Card className="mt-3 p-6">
            <p className="text-ink-muted text-[0.875rem]">
              {t('wallet.nothingMoved')}
            </p>
          </Card>
        ) : (
          <div className="mt-3 space-y-2">
            {state.history.map((entry) => {
              const incoming = entry.direction === 'CREDIT';

              return (
                <Card key={entry.id} className="flex items-center gap-3.5 p-3.5">
                  <span
                    className={cn('grid size-9 shrink-0 place-items-center rounded-full')}
                    style={{
                      background: incoming
                        ? 'color-mix(in oklab, var(--module-nearby) 15%, transparent)'
                        : 'color-mix(in oklab, var(--ink-subtle) 15%, transparent)',
                    }}
                  >
                    {entry.transaction.kind === 'ORDER_PAYMENT' ? (
                      <ShoppingBag className="size-4" />
                    ) : incoming ? (
                      <ArrowDownLeft className="size-4" style={{ color: 'var(--module-nearby)' }} />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[0.875rem] font-medium">{entryTitle(entry, t)}</p>
                      {entry.transaction.status === 'REVERSED' ? (
                        <Badge className="shrink-0">
                          <RotateCcw className="size-3" /> {t('wallet.reversed')}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-ink-subtle truncate text-xs">
                      {t(`wallet.kind.${entry.transaction.kind}`)}
                      {entry.transaction.memo ? ` · ${entry.transaction.memo}` : ''}
                    </p>
                  </div>

                  <p
                    className={cn(
                      'shrink-0 font-mono text-[0.875rem] font-semibold tabular-nums',
                      incoming ? 'text-nearby' : 'text-ink',
                    )}
                  >
                    {incoming ? '+' : '−'}
                    {entry.amount.display}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        {!state.rails.connected ? (
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[0.8125rem] font-semibold">
              <Info className="size-3.5" style={{ color: 'var(--module-events)' }} />
              {t('wallet.noRails')}
            </h2>
            <p className="text-ink-muted mt-2 text-[0.8125rem] leading-relaxed">
              {state.rails.note}
            </p>
            <p className="text-ink-subtle mt-2.5 text-xs leading-relaxed">
              {t('wallet.railsNote')}
              
            </p>
          </Card>
        ) : null}

        <Card className="p-5">
          <h2 className="text-[0.8125rem] font-semibold">{t('wallet.howTitle')}</h2>
          <p className="text-ink-muted mt-2 text-[0.8125rem] leading-relaxed">
            {t('wallet.howBody')}
            
            
          </p>
        </Card>

        {state.pendingOrders > 0 ? (
          <Card className="p-5">
            <h2 className="text-[0.8125rem] font-semibold">{t('wallet.waiting')}</h2>
            <p className="text-ink-muted mt-2 text-[0.8125rem]">
              {t(state.pendingOrders === 1 ? 'wallet.waitingOne' : 'wallet.waitingMany', { n: state.pendingOrders })}
              
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2">
              <a href="/market/orders">{t('wallet.seeOrders')}</a>
            </Button>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
