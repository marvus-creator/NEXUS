import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { localParts } from '../planner/calendar.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 84;

function dayKeysBack(days: number, timezone: string, from = new Date()) {
  const keys: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    keys.push(
      localParts(new Date(from.getTime() - index * DAY_MS), timezone).dateKey,
    );
  }

  return keys;
}

function countByDay(dates: Date[], timezone: string) {
  const counts = new Map<string, number>();

  for (const date of dates) {
    const key = localParts(date, timezone).dateKey;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function streakFrom(
  activeDays: Set<string>,
  timezone: string,
  now = new Date(),
) {
  const today = localParts(now, timezone).dateKey;
  const yesterday = localParts(
    new Date(now.getTime() - DAY_MS),
    timezone,
  ).dateKey;

  if (!activeDays.has(today) && !activeDays.has(yesterday)) return 0;

  let streak = 0;
  let cursor = activeDays.has(today) ? now : new Date(now.getTime() - DAY_MS);

  while (activeDays.has(localParts(cursor, timezone).dateKey)) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return streak;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, timezone: true, createdAt: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    const timezone = profile.timezone;
    const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

    const [
      tasksDone,
      sessions,
      milestones,
      goals,
      modulesDone,
      attendance,
      paths,
      openTasks,
      posts,
      eventsAttended,
    ] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          profileId: profile.id,
          status: 'DONE',
          completedAt: { not: null, gte: since },
        },
        select: { completedAt: true, goalId: true },
      }),
      this.prisma.studySession.findMany({
        where: { profileId: profile.id, startedAt: { gte: since } },
        select: { startedAt: true, minutes: true, pathId: true },
      }),
      this.prisma.milestone.findMany({
        where: {
          goal: { profileId: profile.id },
          doneAt: { not: null, gte: since },
        },
        select: { doneAt: true },
      }),
      this.prisma.goal.findMany({
        where: { profileId: profile.id },
        select: { id: true, status: true, achievedAt: true },
      }),
      this.prisma.learningModule.findMany({
        where: {
          path: { profileId: profile.id, deletedAt: null },
          completedAt: { not: null, gte: since },
        },
        select: { completedAt: true, estimatedMinutes: true },
      }),
      this.prisma.eventAttendee.findMany({
        where: { profileId: profile.id, checkedInAt: { not: null } },
        select: {
          checkedInAt: true,
          event: { select: { title: true, startAt: true } },
        },
        orderBy: { checkedInAt: 'desc' },
        take: 10,
      }),
      this.prisma.learningPath.findMany({
        where: { profileId: profile.id, deletedAt: null },
        select: { id: true, status: true },
      }),
      this.prisma.task.count({
        where: { profileId: profile.id, status: { in: ['TODO', 'DOING'] } },
      }),
      this.prisma.post.count({
        where: { profileId: profile.id, deletedAt: null },
      }),
      this.prisma.eventAttendee.count({
        where: { profileId: profile.id, checkedInAt: { not: null } },
      }),
    ]);

    const taskDays = countByDay(
      tasksDone.map((task) => task.completedAt as Date),
      timezone,
    );
    const sessionDays = countByDay(
      sessions.map((session) => session.startedAt),
      timezone,
    );
    const moduleDays = countByDay(
      modulesDone.map((module) => module.completedAt as Date),
      timezone,
    );

    const minutesByDay = new Map<string, number>();
    for (const session of sessions) {
      const key = localParts(session.startedAt, timezone).dateKey;
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + session.minutes);
    }

    const keys = dayKeysBack(WINDOW_DAYS, timezone);
    const series = keys.map((key) => ({
      date: key,
      tasks: taskDays.get(key) ?? 0,
      sessions: sessionDays.get(key) ?? 0,
      modules: moduleDays.get(key) ?? 0,
      minutes: minutesByDay.get(key) ?? 0,
    }));

    const activeDays = new Set(
      series
        .filter((day) => day.tasks + day.sessions + day.modules > 0)
        .map((day) => day.date),
    );

    const last7 = series.slice(-7);
    const prev7 = series.slice(-14, -7);

    const sum = (
      rows: typeof series,
      field: 'tasks' | 'sessions' | 'modules' | 'minutes',
    ) => rows.reduce((total, row) => total + row[field], 0);

    const totalMinutes = sessions.reduce(
      (total, session) => total + session.minutes,
      0,
    );

    return {
      timezone,
      streak: streakFrom(activeDays, timezone),
      activeDays: activeDays.size,
      windowDays: WINDOW_DAYS,
      series,
      week: {
        tasks: sum(last7, 'tasks'),
        minutes: sum(last7, 'minutes'),
        modules: sum(last7, 'modules'),
        sessions: sum(last7, 'sessions'),
      },
      previousWeek: {
        tasks: sum(prev7, 'tasks'),
        minutes: sum(prev7, 'minutes'),
        modules: sum(prev7, 'modules'),
        sessions: sum(prev7, 'sessions'),
      },
      totals: {
        tasksCompleted: tasksDone.length,
        tasksOpen: openTasks,
        studyMinutes: totalMinutes,
        milestonesDone: milestones.length,
        goalsActive: goals.filter((goal) => goal.status === 'ACTIVE').length,
        goalsAchieved: goals.filter((goal) => goal.achievedAt !== null).length,
        pathsActive: paths.filter((path) => path.status === 'ACTIVE').length,
        pathsCompleted: paths.filter((path) => path.status === 'COMPLETED')
          .length,
        eventsAttended,
        posts,
      },
      attended: attendance.map((row) => ({
        title: row.event.title,
        startAt: row.event.startAt,
        checkedInAt: row.checkedInAt,
      })),
    };
  }
}
