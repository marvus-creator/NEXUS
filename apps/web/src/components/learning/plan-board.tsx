'use client';

import { Badge, Button, Card, EmptyState, cn } from '@nexus/ui';
import { Check, Clock, Lock, Sparkles, Wand2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  acceptProposal,
  declineProposal,
  generatePlan,
  type DayPlan,
  type PlanProposal,
} from '@/lib/learning-client';

function timeIn(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function lengthOf(proposal: PlanProposal) {
  const minutes = Math.round(
    (new Date(proposal.endAt).getTime() - new Date(proposal.startAt).getTime()) / 60000,
  );

  if (minutes < 60) return `${minutes} min`;

  const rest = minutes % 60;

  return rest === 0 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 60)}h ${rest}m`;
}

function dayLabel(planFor: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  if (planFor === today) return 'today';
  if (planFor === tomorrow) return 'tomorrow';

  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${planFor}T12:00:00Z`),
  );
}

export function PlanBoard({ plan }: { plan: DayPlan }) {
  const router = useRouter();

  const [day, setDay] = useState(plan);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = day.proposals.filter((entry) => entry.status === 'PROPOSED');
  const accepted = day.proposals.filter((entry) => entry.status === 'ACCEPTED');

  async function regenerate() {
    setBusy('generate');
    setError(null);

    try {
      setDay(await generatePlan(day.planFor));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not build a plan.');
    } finally {
      setBusy(null);
    }
  }

  async function decide(proposal: PlanProposal, accept: boolean) {
    setBusy(proposal.id);
    setError(null);

    try {
      const updated = accept ? await acceptProposal(proposal.id) : await declineProposal(proposal.id);

      setDay((current) => ({
        ...current,
        proposals: accept
          ? current.proposals.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry))
          : current.proposals.filter((entry) => entry.id !== proposal.id),
      }));

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that block.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-muted text-[0.8125rem]">
            {pending.length > 0
              ? `${pending.length} ${pending.length === 1 ? 'block' : 'blocks'} suggested for ${dayLabel(day.planFor)}.`
              : accepted.length > 0
                ? `Everything suggested for ${dayLabel(day.planFor)} is on your calendar.`
                : `Nothing suggested for ${dayLabel(day.planFor)} yet.`}
          </p>

          <Button size="sm" onClick={() => void regenerate()} disabled={busy === 'generate'}>
            <Wand2 className="size-4" />
            {busy === 'generate' ? 'Planning…' : pending.length + accepted.length > 0 ? 'Re-plan' : 'Plan my day'}
          </Button>
        </div>

        {error ? <p className="text-danger mt-3 text-xs">{error}</p> : null}

        {pending.length === 0 && accepted.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Sparkles className="size-6" />}
            title="No plan yet"
            description="Nexus reads your fixed commitments, open tasks and learning paths, finds the real gaps, and suggests what to put in them. Nothing reaches your calendar until you say yes."
          />
        ) : (
          <div className="mt-5 space-y-3">
            {pending.map((proposal) => (
              <Card key={proposal.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 text-center">
                    <p className="font-mono text-[0.9375rem] font-semibold">
                      {timeIn(proposal.startAt, day.timezone)}
                    </p>
                    <p className="text-ink-subtle font-mono text-[0.6875rem]">
                      {lengthOf(proposal)}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[0.9375rem] font-semibold">{proposal.title}</h3>
                      {proposal.path ? (
                        <Badge style={{ color: 'var(--module-learn)' }}>Learning</Badge>
                      ) : null}
                      {proposal.task ? <Badge>Task</Badge> : null}
                    </div>

                    <p className="text-ink-muted mt-1.5 text-[0.8125rem] leading-relaxed">
                      {proposal.rationale}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" onClick={() => void decide(proposal, true)} disabled={busy === proposal.id}>
                        <Check className="size-4" /> Add to calendar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void decide(proposal, false)}
                        disabled={busy === proposal.id}
                      >
                        <X className="size-4" /> Not this
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {accepted.map((proposal) => (
              <Card key={proposal.id} className="border-transparent p-4 opacity-70">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 text-center">
                    <p className="font-mono text-[0.9375rem] font-semibold">
                      {timeIn(proposal.startAt, day.timezone)}
                    </p>
                    <p className="text-ink-subtle font-mono text-[0.6875rem]">{lengthOf(proposal)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium">{proposal.title}</p>
                    <p className="text-nearby mt-0.5 flex items-center gap-1.5 text-xs">
                      <Check className="size-3.5" /> On your calendar
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-[0.8125rem] font-semibold">
            <Lock className="size-3.5" style={{ color: 'var(--module-ai)' }} />
            Already committed
          </h2>

          {day.commitments.length === 0 ? (
            <p className="text-ink-subtle mt-2 text-[0.8125rem]">
              Nothing fixed {dayLabel(day.planFor)}. The whole day is open.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {day.commitments.map((entry, index) => (
                <li key={`${entry.label}-${index}`} className="flex items-baseline gap-2.5 text-[0.8125rem]">
                  <span className="text-ink-subtle shrink-0 font-mono text-[0.6875rem]">
                    {entry.start}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-ink-subtle mt-3.5 flex items-start gap-2 text-xs leading-relaxed">
            <Clock className="mt-0.5 size-3.5 shrink-0" />
            Suggestions only ever land in the gaps between these.
          </p>
        </Card>

        <Card
          className="p-4"
          style={{ background: 'color-mix(in oklab, var(--module-ai) 7%, var(--surface))' }}
        >
          <h2 className="flex items-center gap-2 text-[0.8125rem] font-semibold">
            <Sparkles className="size-3.5" style={{ color: 'var(--module-ai)' }} />
            How this was planned
          </h2>
          <p className="text-ink-muted mt-2 text-[0.8125rem] leading-relaxed">{day.engineNote}</p>
          <p className="text-ink-subtle mt-2.5 text-xs leading-relaxed">
            Nothing here moves without you pressing a button.
          </p>
        </Card>
      </aside>
    </div>
  );
}
