import { Badge } from '@nexus/ui';
import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
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
    <div>
      <PageHero
        width="max-w-4xl"
        eyebrow="Tasks"
        tint="var(--module-events)"
        image={IMG.cowork4}
        title={<>Tasks</>}
        description={<>Every task can point at a goal and land on your calendar. That link is the whole point.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-4xl px-4 pb-10 md:px-8">

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
    </div>
  );
}
