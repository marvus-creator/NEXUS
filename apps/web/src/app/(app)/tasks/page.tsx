import { Badge, Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { TaskBoard } from '@/components/planner/task-board';
import { getGoals, getTaskCounts, getTasks } from '@/lib/planner-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [tasks, goals, counts] = await Promise.all([getTasks(), getGoals(), getTaskCounts()]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your life</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Tasks</h1>
      <p className="text-ink-muted mt-2.5 text-[0.9375rem]">
        Every task can point at a goal and land on your calendar. That link is the whole point.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge size="sm">{counts.open} open</Badge>
        {counts.overdue > 0 ? (
          <Badge variant="danger" size="sm">
            {counts.overdue} overdue
          </Badge>
        ) : null}
        {counts.dueToday > 0 ? (
          <Badge variant="warning" size="sm">
            {counts.dueToday} due today
          </Badge>
        ) : null}
        <Badge variant="success" size="sm">
          {counts.done} done
        </Badge>
      </div>

      <div className="mt-8">
        <TaskBoard initialTasks={tasks} goals={goals} />
      </div>
    </div>
  );
}
