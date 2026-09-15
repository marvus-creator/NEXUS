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
import { useState } from 'react';
import { devGrant, transfer, type WalletEntry, type WalletOverview } from '@/lib/market-client';

const KIND_LABEL: Record<WalletEntry['transaction']['kind'], string> = {
  TRANSFER: 'Transfer',
  ORDER_PAYMENT: 'Order',
  ORDER_REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
};

function entryTitle(entry: WalletEntry) {
  const who = entry.counterparty?.profile?.displayName ?? entry.counterparty?.label ?? 'Nexus';

  if (entry.transaction.kind === 'ORDER_PAYMENT') {
    return entry.direction === 'DEBIT' ? `Paid ${who}` : `Payment from ${who}`;
  }

  if (entry.transaction.kind === 'ADJUSTMENT') return 'Development grant';

  return entry.direction === 'DEBIT' ? `Sent to ${who}` : `Received from ${who}`;
}

export function WalletBoard({ overview }: { overview: WalletOverview }) {
  const router = useRouter();

  const [state, setState] = useState(overview);
  const [sending, setSending] = useState(false);
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
      setError('Who are you sending to?');
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount above zero.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await transfer({
        username: username.trim().replace(/^@/, ''),
        amount: value,
        memo: memo.trim() || undefined,
      });

      setNotice(`${result.amount.display} sent.`);
      setUsername('');
      setAmount('');
      setMemo('');
      setSending(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send that.');
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
      setError(cause instanceof Error ? cause.message : 'Could not add test funds.');
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
            <p className="text-ink-muted text-xs font-medium">Balance</p>
          </div>

          <p className="mt-2.5 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {state.wallet.balance.display}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setSending((value) => !value)}>
              {sending ? <X className="size-4" /> : <Send className="size-4" />}
              {sending ? 'Cancel' : 'Send'}
            </Button>

            {!state.rails.connected ? (
              <Button variant="ghost" size="sm" onClick={() => void grant()} disabled={busy}>
                <Sparkles className="size-4" /> Add test funds
              </Button>
            ) : null}
          </div>

          {notice ? <p className="text-nearby mt-3 text-xs">{notice}</p> : null}
        </Card>

        {sending ? (
          <Card className="mt-4 p-5">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="To" hint="Their Nexus username">
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="@kevin"
                    autoFocus
                  />
                </Field>
                <Field label={`Amount in ${state.wallet.currency}`}>
                  <Input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder="5000"
                  />
                </Field>
              </div>

              <Field label="What is it for?" hint="Optional">
                <Input
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="Lunch"
                />
              </Field>

              {error ? <p className="text-danger text-xs">{error}</p> : null}

              <Button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send'}
              </Button>
            </form>
          </Card>
        ) : null}

        {error && !sending ? <p className="text-danger mt-3 text-xs">{error}</p> : null}

        <h2 className="mt-8 text-[0.9375rem] font-semibold">Activity</h2>

        {state.history.length === 0 ? (
          <Card className="mt-3 p-6">
            <p className="text-ink-muted text-[0.875rem]">
              Nothing has moved yet. Transfers and marketplace payments show up here.
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
                      <p className="truncate text-[0.875rem] font-medium">{entryTitle(entry)}</p>
                      {entry.transaction.status === 'REVERSED' ? (
                        <Badge className="shrink-0">
                          <RotateCcw className="size-3" /> reversed
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-ink-subtle truncate text-xs">
                      {KIND_LABEL[entry.transaction.kind]}
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
              No money in or out, yet
            </h2>
            <p className="text-ink-muted mt-2 text-[0.8125rem] leading-relaxed">
              {state.rails.note}
            </p>
            <p className="text-ink-subtle mt-2.5 text-xs leading-relaxed">
              Connecting mobile money or a card provider is what turns this on. Until then there is
              deliberately no Top up button that would do nothing.
            </p>
          </Card>
        ) : null}

        <Card className="p-5">
          <h2 className="text-[0.8125rem] font-semibold">How the balance is worked out</h2>
          <p className="text-ink-muted mt-2 text-[0.8125rem] leading-relaxed">
            Every movement writes two matching entries, one out of somewhere and one into somewhere
            else. Your balance is the sum of your own entries, never a number stored on the side
            that could drift away from the record.
          </p>
        </Card>

        {state.pendingOrders > 0 ? (
          <Card className="p-5">
            <h2 className="text-[0.8125rem] font-semibold">Waiting on sellers</h2>
            <p className="text-ink-muted mt-2 text-[0.8125rem]">
              {state.pendingOrders} {state.pendingOrders === 1 ? 'order has' : 'orders have'} not
              been answered yet.
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2">
              <a href="/market/orders">See orders</a>
            </Button>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
