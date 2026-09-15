'use client';

import { Badge, Button, Card, EmptyState, Field, Input, cn } from '@nexus/ui';
import {
  BookOpen,
  Check,
  Clock,
  GraduationCap,
  Plus,
  Timer,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  addModule,
  createPath,
  fetchPath,
  logSession,
  removePath,
  setModuleDone,
  updatePath,
  type LearningPath,
} from '@/lib/learning-client';

const SOURCE_ICON = {
  SELF: GraduationCap,
  COURSE: GraduationCap,
  BOOK: BookOpen,
  VIDEO: Video,
  CLASS: GraduationCap,
  OTHER: BookOpen,
} as const;

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function PathCard({
  path,
  onChange,
  onRemove,
}: {
  path: LearningPath;
  onChange: (next: LearningPath) => void;
  onRemove: (id: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [logging, setLogging] = useState(false);
  const [minutes, setMinutes] = useState('45');

  const Icon = SOURCE_ICON[path.source] ?? GraduationCap;
  const complete = path.status === 'COMPLETED';

  async function toggle(moduleId: string, done: boolean) {
    setBusy(moduleId);
    setError(null);

    try {
      onChange(await setModuleDone(path.id, moduleId, done));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that module.');
    } finally {
      setBusy(null);
    }
  }

  async function submitModule(event: React.FormEvent) {
    event.preventDefault();

    if (moduleTitle.trim().length < 1) return;

    setBusy('new');
    setError(null);

    try {
      await addModule(path.id, { title: moduleTitle.trim() });
      setModuleTitle('');
      onChange(await fetchPath(path.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add that module.');
    } finally {
      setBusy(null);
    }
  }

  async function submitSession(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(minutes);

    if (!Number.isFinite(value) || value < 1) {
      setError('Enter how many minutes you studied.');
      return;
    }

    setBusy('session');
    setError(null);

    try {
      await logSession({ pathId: path.id, minutes: value });
      setLogging(false);
      onChange(await fetchPath(path.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log that session.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <span
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ background: 'color-mix(in oklab, var(--module-learn) 14%, transparent)' }}
        >
          <Icon className="size-5" style={{ color: 'var(--module-learn)' }} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[0.975rem] font-semibold">{path.title}</h3>
            {complete ? <Badge className="text-nearby">Finished</Badge> : null}
            {path.goal ? <Badge>{path.goal.title}</Badge> : null}
          </div>

          {path.subject ? (
            <p className="text-ink-muted mt-0.5 text-[0.8125rem]">{path.subject}</p>
          ) : null}

          <div className="mt-3 flex items-center gap-3">
            <div className="bg-border h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${path.percent}%`,
                  background: complete ? 'var(--module-nearby)' : 'var(--module-learn)',
                }}
              />
            </div>
            <span className="text-ink-muted shrink-0 font-mono text-xs">{path.percent}%</span>
          </div>

          <p className="text-ink-subtle mt-2 text-xs">
            {path.modulesDone} of {path.moduleCount} done
            {path.minutesLeft > 0 ? ` · ${minutesLabel(path.minutesLeft)} left` : ''}
            {path.minutesLogged > 0 ? ` · ${minutesLabel(path.minutesLogged)} studied` : ''}
          </p>

          {path.nextModule && !expanded ? (
            <p className="text-ink-muted mt-2.5 text-[0.8125rem]">
              Next: <span className="text-ink">{path.nextModule.title}</span>
            </p>
          ) : null}

          {expanded ? (
            <ul className="mt-4 space-y-1.5">
              {path.modules.map((module) => {
                const done = module.completedAt !== null;

                return (
                  <li key={module.id}>
                    <button
                      type="button"
                      onClick={() => void toggle(module.id, !done)}
                      disabled={busy === module.id}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[0.875rem] transition-colors',
                        'hover:bg-surface-raised disabled:opacity-50',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-4.5 shrink-0 place-items-center rounded-[5px] border transition-colors',
                          done ? 'border-transparent' : 'border-border group-hover:border-ink-subtle',
                        )}
                        style={done ? { background: 'var(--module-learn)' } : undefined}
                      >
                        {done ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                      </span>
                      <span className={cn('min-w-0 flex-1 truncate', done && 'text-ink-subtle line-through')}>
                        {module.title}
                      </span>
                      <span className="text-ink-subtle shrink-0 font-mono text-[0.6875rem]">
                        {module.estimatedMinutes}m
                      </span>
                    </button>
                  </li>
                );
              })}

              <li className="pt-1.5">
                <form onSubmit={submitModule} className="flex gap-2">
                  <Input
                    value={moduleTitle}
                    onChange={(event) => setModuleTitle(event.target.value)}
                    placeholder="Add a module"
                    className="h-9 text-[0.875rem]"
                  />
                  <Button type="submit" variant="ghost" size="sm" disabled={busy === 'new'}>
                    <Plus className="size-4" />
                  </Button>
                </form>
              </li>
            </ul>
          ) : null}

          {logging ? (
            <form onSubmit={submitSession} className="mt-3 flex items-end gap-2">
              <Field label="Minutes studied" className="flex-1">
                <Input
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  inputMode="numeric"
                  className="h-9"
                />
              </Field>
              <Button type="submit" size="sm" disabled={busy === 'session'}>
                Log
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLogging(false)}>
                <X className="size-4" />
              </Button>
            </form>
          ) : null}

          {error ? <p className="text-danger mt-2 text-xs">{error}</p> : null}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Hide modules' : 'Modules'}
            </Button>
            {!logging ? (
              <Button variant="ghost" size="sm" onClick={() => setLogging(true)}>
                <Timer className="size-4" /> Log study
              </Button>
            ) : null}
            {!complete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  setBusy('status');
                  try {
                    onChange(await updatePath(path.id, { status: 'PAUSED' }));
                  } finally {
                    setBusy(null);
                  }
                }}
                disabled={path.status === 'PAUSED' || busy === 'status'}
              >
                {path.status === 'PAUSED' ? 'Paused' : 'Pause'}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="text-ink-subtle hover:text-danger ml-auto"
              onClick={async () => {
                setBusy('remove');
                try {
                  await removePath(path.id);
                  onRemove(path.id);
                } finally {
                  setBusy(null);
                }
              }}
              disabled={busy === 'remove'}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function LearnBoard({ paths }: { paths: LearningPath[] }) {
  const router = useRouter();

  const [items, setItems] = useState(paths);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [modules, setModules] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = items.filter((path) => path.status === 'ACTIVE' || path.status === 'PAUSED');
  const finished = items.filter((path) => path.status === 'COMPLETED');

  const totalLeft = active.reduce((sum, path) => sum + path.minutesLeft, 0);
  const totalLogged = items.reduce((sum, path) => sum + path.minutesLogged, 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (title.trim().length < 2) {
      setError('Give it a name you will recognise later.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await createPath({
        title: title.trim(),
        subject: subject.trim() || undefined,
        modules: modules
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ title: line })),
      });

      setItems((current) => [created, ...current]);
      setTitle('');
      setSubject('');
      setModules('');
      setComposing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create that path.');
    } finally {
      setBusy(false);
    }
  }

  function replace(next: LearningPath) {
    setItems((current) => current.map((path) => (path.id === next.id ? { ...path, ...next } : path)));
    router.refresh();
  }

  function drop(id: string) {
    setItems((current) => current.filter((path) => path.id !== id));
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-ink-muted flex items-center gap-4 text-[0.8125rem]">
          <span className="flex items-center gap-1.5">
            <GraduationCap className="size-4" style={{ color: 'var(--module-learn)' }} />
            {active.length} active
          </span>
          {totalLeft > 0 ? (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {minutesLabel(totalLeft)} left
            </span>
          ) : null}
          {totalLogged > 0 ? (
            <span className="flex items-center gap-1.5">
              <Timer className="size-4" />
              {minutesLabel(totalLogged)} studied
            </span>
          ) : null}
        </div>

        <Button size="sm" onClick={() => setComposing((value) => !value)}>
          {composing ? <X className="size-4" /> : <Plus className="size-4" />}
          {composing ? 'Cancel' : 'New path'}
        </Button>
      </div>

      {composing ? (
        <Card className="mt-5 p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What are you learning?">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Discrete Mathematics"
                  autoFocus
                />
              </Field>
              <Field label="Subject" hint="Optional">
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Mathematics"
                />
              </Field>
            </div>

            <Field label="Modules" hint="One per line. You can add more later.">
              <textarea
                value={modules}
                onChange={(event) => setModules(event.target.value)}
                rows={4}
                placeholder={'Logic and proofs\nSet theory\nGraph theory'}
                className="border-border bg-surface placeholder:text-ink-subtle focus-visible:ring-accent/40 w-full rounded-lg border px-3 py-2 text-[0.875rem] outline-none focus-visible:ring-2"
              />
            </Field>

            {error ? <p className="text-danger text-xs">{error}</p> : null}

            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create path'}
            </Button>
          </form>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<GraduationCap className="size-6" />}
          title="Nothing on the go yet"
          description="A path is whatever you are working through — a course, a book, a syllabus. Break it into modules and tick them off."
        />
      ) : (
        <div className="mt-6 space-y-4">
          {active.map((path) => (
            <PathCard key={path.id} path={path} onChange={replace} onRemove={drop} />
          ))}

          {finished.length > 0 ? (
            <>
              <h2 className="text-ink-subtle pt-4 text-xs font-medium tracking-wide uppercase">
                Finished
              </h2>
              {finished.map((path) => (
                <PathCard key={path.id} path={path} onChange={replace} onRemove={drop} />
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
