'use client';

import { Badge, Button, Card, EmptyState, Field, Input, cn } from '@nexus/ui';
import { CalendarClock, Check, ListTodo, Plus, Repeat, Target, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { plannerClient, type Goal, type Task } from '@/lib/planner-client';

const PRIORITY_TINT: Record<Task['priority'], string> = {
  LOW: 'var(--ink-subtle)',
  MEDIUM: 'var(--accent)',
  HIGH: 'var(--module-events)',
  URGENT: 'var(--danger)',
};

const PRIORITIES: Task['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const RECURRENCES: Task['recurrence'][] = ['NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY'];

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'today', label: 'Due soon' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
] as const;

function dueLabel(dueAt: string | null) {
  if (!dueAt) return null;

  const due = new Date(dueAt);
  const now = new Date();
  const days = Math.round((due.getTime() - now.getTime()) / 86400000);

  if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { text: 'Today', overdue: false };
  if (days === 1) return { text: 'Tomorrow', overdue: false };
  if (days < 7) return { text: `In ${days} days`, overdue: false };

  return {
    text: due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    overdue: false,
  };
}

export function TaskBoard({ initialTasks, goals }: { initialTasks: Task[]; goals: Goal[] }) {
  const router = useRouter();

  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('open');
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [recurrence, setRecurrence] = useState<Task['recurrence']>('NONE');
  const [goalId, setGoalId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const now = Date.now();

    return tasks.filter((task) => {
      if (filter === 'done') return task.status === 'DONE';
      if (task.status === 'DONE' || task.status === 'ARCHIVED') return false;
      if (filter === 'overdue') return task.dueAt !== null && new Date(task.dueAt).getTime() < now;
      if (filter === 'today') {
        if (!task.dueAt) return false;
        return new Date(task.dueAt).getTime() < now + 2 * 86400000;
      }
      return true;
    });
  }, [tasks, filter]);

  async function addTask() {
    if (!title.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const created = await plannerClient.createTask({
        title: title.trim(),
        priority,
        recurrence,
        goalId: goalId || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });

      setTasks((current) => [created, ...current]);
      setTitle('');
      setDueAt('');
      setGoalId('');
      setRecurrence('NONE');
      setComposing(false);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task: Task) {
    const done = task.status !== 'DONE';

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, status: done ? 'DONE' : 'TODO' } : item,
      ),
    );

    try {
      const result = await plannerClient.toggleTask(task.id, done);

      if (result.repeated) {
        setTasks((current) => [result.repeated!, ...current]);
      }

      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, status: task.status } : item)),
      );
    }
  }

  async function remove(task: Task) {
    const snapshot = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));

    try {
      await plannerClient.deleteTask(task.id);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
      setTasks(snapshot);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === item.value
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}

        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setComposing((value) => !value)}
          variant={composing ? 'secondary' : 'primary'}
        >
          {composing ? <X /> : <Plus />}
          {composing ? 'Cancel' : 'New task'}
        </Button>
      </div>

      {composing ? (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-4">
            <Field label="What needs doing?">
              <Input
                autoFocus
                value={title}
                placeholder="Finish Java assignment"
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void addTask();
                }}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Due">
                <Input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </Field>

              <Field label="Goal" hint="Optional — links progress">
                <select
                  value={goalId}
                  onChange={(event) => setGoalId(event.target.value)}
                  className="border-line bg-surface-raised text-ink hover:border-line-strong focus:border-accent-line h-11 w-full rounded-md border px-3.5 text-sm transition-all outline-none focus:ring-4 focus:ring-[var(--accent-soft)]"
                >
                  <option value="">No goal</option>
                  {goals
                    .filter((goal) => goal.status === 'ACTIVE')
                    .map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-ink mb-2 text-sm font-medium">Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITIES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriority(value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                        priority === value
                          ? 'border-transparent text-white'
                          : 'border-line text-ink-muted hover:text-ink',
                      )}
                      style={priority === value ? { backgroundColor: PRIORITY_TINT[value] } : undefined}
                    >
                      {value.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-ink mb-2 text-sm font-medium">Repeats</p>
                <div className="flex flex-wrap gap-1.5">
                  {RECURRENCES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRecurrence(value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                        recurrence === value
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-line text-ink-muted hover:text-ink',
                      )}
                    >
                      {value === 'NONE' ? 'Never' : value.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <p className="text-danger text-sm">{error}</p> : null}

            <Button onClick={addTask} loading={busy} disabled={!title.trim()} className="self-start">
              Add task
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 flex flex-col gap-2.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={<ListTodo />}
            title={filter === 'done' ? 'Nothing finished yet' : 'Nothing here'}
            description={
              filter === 'done'
                ? 'Completed tasks will collect here.'
                : 'Add a task and it shows up on your home page and calendar too.'
            }
            action={
              filter !== 'done' ? (
                <Button size="sm" onClick={() => setComposing(true)}>
                  <Plus /> New task
                </Button>
              ) : undefined
            }
          />
        ) : (
          visible.map((task) => {
            const due = dueLabel(task.dueAt);
            const done = task.status === 'DONE';

            return (
              <Card key={task.id} className={cn('p-4 transition-opacity', done && 'opacity-60')}>
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => void toggle(task)}
                    aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      done
                        ? 'border-transparent bg-[color-mix(in_oklab,var(--success)_22%,transparent)] text-success'
                        : 'border-line-strong hover:border-accent',
                    )}
                  >
                    {done ? <Check className="size-3" /> : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', done && 'line-through')}>{task.title}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium"
                        style={{ color: PRIORITY_TINT[task.priority] }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: PRIORITY_TINT[task.priority] }}
                        />
                        {task.priority.toLowerCase()}
                      </span>

                      {due ? (
                        <Badge variant={due.overdue ? 'danger' : 'neutral'} size="sm">
                          <CalendarClock /> {due.text}
                        </Badge>
                      ) : null}

                      {task.recurrence !== 'NONE' ? (
                        <Badge size="sm">
                          <Repeat /> {task.recurrence.toLowerCase()}
                        </Badge>
                      ) : null}

                      {task.goal ? (
                        <Badge variant="accent" size="sm">
                          <Target /> {task.goal.title}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void remove(task)}
                    aria-label={`Delete ${task.title}`}
                    className="text-ink-subtle hover:text-danger mt-0.5 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
