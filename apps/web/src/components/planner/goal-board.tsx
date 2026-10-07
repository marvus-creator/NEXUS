'use client';

import { Badge, Button, Card, EmptyState, Field, Input, Progress, Ring, Textarea, cn } from '@nexus/ui';
import { Check, Flag, Plus, Target, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { plannerClient, type Goal } from '@/lib/planner-client';
import { useT } from '@/i18n/client';

const AREAS = [
  'CAREER',
  'SCHOOL',
  'BUSINESS',
  'FITNESS',
  'LEARNING',
  'MONEY',
  'CREATIVE',
  'PERSONAL',
] as const;

const AREA_TINT: Record<string, string> = {
  CAREER: 'var(--accent)',
  SCHOOL: 'var(--module-learn)',
  BUSINESS: 'var(--module-events)',
  FITNESS: 'var(--module-nearby)',
  LEARNING: 'var(--module-learn)',
  MONEY: 'var(--module-events)',
  CREATIVE: 'var(--module-ai)',
  PERSONAL: 'var(--module-people)',
};

export function GoalBoard({ initialGoals }: { initialGoals: Goal[] }) {
  const router = useRouter();
  const t = useT();

  const [goals, setGoals] = useState(initialGoals);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState<string>('LEARNING');
  const [horizon, setHorizon] = useState<'SHORT' | 'LONG'>('LONG');
  const [milestones, setMilestones] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState<Record<string, string>>({});

  async function createGoal() {
    if (!title.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const created = await plannerClient.createGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        area,
        horizon,
        milestones: milestones
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      });

      setGoals((current) => [created, ...current]);
      setTitle('');
      setDescription('');
      setMilestones('');
      setComposing(false);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleMilestone(goal: Goal, milestoneId: string, done: boolean) {
    setGoals((current) =>
      current.map((item) =>
        item.id === goal.id
          ? {
              ...item,
              milestones: item.milestones.map((milestone) =>
                milestone.id === milestoneId
                  ? { ...milestone, doneAt: done ? new Date().toISOString() : null }
                  : milestone,
              ),
            }
          : item,
      ),
    );

    try {
      const result = await plannerClient.toggleMilestone(milestoneId, done);

      setGoals((current) =>
        current.map((item) =>
          item.id === goal.id
            ? {
                ...item,
                progress: result.progress,
                status: result.progress === 100 ? 'ACHIEVED' : item.status === 'ACHIEVED' ? 'ACTIVE' : item.status,
              }
            : item,
        ),
      );

      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function addMilestone(goal: Goal) {
    const value = (newMilestone[goal.id] ?? '').trim();
    if (!value) return;

    try {
      const created = await plannerClient.addMilestone(goal.id, value);

      setGoals((current) =>
        current.map((item) =>
          item.id === goal.id ? { ...item, milestones: [...item.milestones, created] } : item,
        ),
      );

      setNewMilestone((current) => ({ ...current, [goal.id]: '' }));
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function removeGoal(goal: Goal) {
    const snapshot = goals;
    setGoals((current) => current.filter((item) => item.id !== goal.id));

    try {
      await plannerClient.deleteGoal(goal.id);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
      setGoals(snapshot);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-ink-muted text-sm">
          {t('goals.summary', { active: goals.filter((goal) => goal.status === 'ACTIVE').length, achieved: goals.filter((goal) => goal.status === 'ACHIEVED').length })}
          
        </p>
        <Button size="sm" onClick={() => setComposing((value) => !value)} variant={composing ? 'secondary' : 'primary'}>
          {composing ? <X /> : <Plus />}
          {composing ? t('common.cancel') : t('goals.newGoal')}
        </Button>
      </div>

      {composing ? (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-4">
            <Field label={t('goals.form.what')}>
              <Input
                autoFocus
                value={title}
                placeholder={t('goals.form.whatPlaceholder')}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>

            <Field label={t('goals.form.why')} hint={t('common.optional')}>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('goals.form.whyPlaceholder')}
              />
            </Field>

            <Field label={t('goals.form.milestones')} hint={t('goals.form.milestonesHint')}>
              <Textarea
                value={milestones}
                onChange={(event) => setMilestones(event.target.value)}
                placeholder={t('goals.form.milestonesPlaceholder')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-ink mb-2 text-sm font-medium">{t('goals.form.area')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {AREAS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setArea(value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        area === value
                          ? 'border-transparent text-white'
                          : 'border-line text-ink-muted hover:text-ink',
                      )}
                      style={area === value ? { backgroundColor: AREA_TINT[value] } : undefined}
                    >
                      {t(`enums.goalArea.${value}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-ink mb-2 text-sm font-medium">{t('goals.form.horizon')}</p>
                <div className="flex gap-1.5">
                  {(['SHORT', 'LONG'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHorizon(value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        horizon === value
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-line text-ink-muted hover:text-ink',
                      )}
                    >
                      {value === 'SHORT' ? t('goals.form.short') : t('goals.form.long')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <p className="text-danger text-sm">{error}</p> : null}

            <Button onClick={createGoal} loading={busy} disabled={!title.trim()} className="self-start">
              {t('goals.form.create')}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {goals.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState
              icon={<Target />}
              title={t('goals.emptyTitle')}
              description={t('goals.emptyBody')}
              action={
                <Button size="sm" onClick={() => setComposing(true)}>
                  <Plus /> {t('goals.newGoal')}
                </Button>
              }
            />
          </div>
        ) : (
          goals.map((goal) => {
            const tint = AREA_TINT[goal.area] ?? 'var(--accent)';
            const achieved = goal.status === 'ACHIEVED';

            return (
              <Card key={goal.id} className="flex flex-col p-6">
                <div className="flex items-start gap-4">
                  <Ring value={goal.progress} size={52} stroke={4} tint={tint}>
                    {goal.progress}%
                  </Ring>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[0.9375rem] font-semibold">{goal.title}</h3>
                      {achieved ? (
                        <Badge variant="success" size="sm">
                          {t('goals.achieved')}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-ink-muted mt-1 text-xs capitalize">
                      {goal.area in AREA_TINT ? t(`enums.goalArea.${goal.area as (typeof AREAS)[number]}`) : goal.area} · {goal.horizon === 'LONG' ? t('goals.longTerm') : t('goals.shortTerm')}
                    </p>
                    {goal.description ? (
                      <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">{goal.description}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeGoal(goal)}
                    aria-label={t('goals.delete', { title: goal.title })}
                    className="text-ink-subtle hover:text-danger transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <Progress value={goal.progress} tint={tint} className="mt-5" />

                <div className="mt-5 flex flex-col gap-2.5">
                  {goal.milestones.map((milestone) => {
                    const done = milestone.doneAt !== null;

                    return (
                      <button
                        key={milestone.id}
                        type="button"
                        onClick={() => void toggleMilestone(goal, milestone.id, !done)}
                        className="group flex items-center gap-3 text-left"
                      >
                        <span
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                            done
                              ? 'border-transparent bg-[color-mix(in_oklab,var(--success)_22%,transparent)] text-success'
                              : 'border-line-strong group-hover:border-accent',
                          )}
                        >
                          {done ? <Check className="size-2.5" /> : null}
                        </span>
                        <span className={cn('text-sm', done ? 'text-ink-subtle line-through' : 'text-ink-muted')}>
                          {milestone.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <Input
                    value={newMilestone[goal.id] ?? ''}
                    placeholder={t('goals.addMilestone')}
                    className="h-9 text-xs"
                    onChange={(event) =>
                      setNewMilestone((current) => ({ ...current, [goal.id]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void addMilestone(goal);
                    }}
                  />
                  <Button size="icon-sm" variant="secondary" onClick={() => void addMilestone(goal)}>
                    <Plus />
                  </Button>
                </div>

                {goal.tasks.length > 0 ? (
                  <div className="border-line mt-5 border-t pt-4">
                    <p className="text-micro text-ink-subtle mb-2.5 font-semibold uppercase">
                      {t('goals.linkedTasks')}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {goal.tasks.slice(0, 4).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-xs">
                          <Flag
                            className={cn(
                              'size-3 shrink-0',
                              task.status === 'DONE' ? 'text-success' : 'text-ink-subtle',
                            )}
                          />
                          <span
                            className={cn(
                              'truncate',
                              task.status === 'DONE' ? 'text-ink-subtle line-through' : 'text-ink-muted',
                            )}
                          >
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
