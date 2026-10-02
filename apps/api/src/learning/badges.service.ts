import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { localParts } from '../planner/calendar.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

type Group = 'focus' | 'growth' | 'people' | 'world';

type Metrics = {
  onboarded: number;
  tasksDone: number;
  studyMinutes: number;
  bestStreak: number;
  goalsAchieved: number;
  pathsCompleted: number;
  modulesDone: number;
  friends: number;
  posts: number;
  circles: number;
  checkIns: number;
  hosted: number;
  reviews: number;
  sales: number;
};

type Definition = {
  key: string;
  title: string;
  description: string;
  icon: string;
  group: Group;
  target: number;
  metric: keyof Metrics;
};

const BADGES: Definition[] = [
  { key: 'first-steps', title: 'First steps', description: 'Set up your NEXUS world', icon: 'sparkles', group: 'growth', target: 1, metric: 'onboarded' },
  { key: 'task-crusher', title: 'Task crusher', description: 'Finish 10 tasks', icon: 'check', group: 'focus', target: 10, metric: 'tasksDone' },
  { key: 'deep-focus', title: 'Deep focus', description: 'Study for 10 hours in total', icon: 'timer', group: 'focus', target: 600, metric: 'studyMinutes' },
  { key: 'on-fire', title: 'On fire', description: 'Keep a 7 day streak', icon: 'flame', group: 'focus', target: 7, metric: 'bestStreak' },
  { key: 'unstoppable', title: 'Unstoppable', description: 'Keep a 30 day streak', icon: 'zap', group: 'focus', target: 30, metric: 'bestStreak' },
  { key: 'goal-getter', title: 'Goal getter', description: 'Achieve a goal', icon: 'target', group: 'growth', target: 1, metric: 'goalsAchieved' },
  { key: 'module-master', title: 'Module master', description: 'Complete 10 learning modules', icon: 'book', group: 'growth', target: 10, metric: 'modulesDone' },
  { key: 'scholar', title: 'Scholar', description: 'Complete a whole learning path', icon: 'graduation', group: 'growth', target: 1, metric: 'pathsCompleted' },
  { key: 'connector', title: 'Connector', description: 'Make 5 friends', icon: 'users', group: 'people', target: 5, metric: 'friends' },
  { key: 'voice', title: 'Voice', description: 'Share 10 posts', icon: 'message', group: 'people', target: 10, metric: 'posts' },
  { key: 'insider', title: 'Insider', description: 'Belong to 3 circles', icon: 'circles', group: 'people', target: 3, metric: 'circles' },
  { key: 'regular', title: 'Regular', description: 'Check in at 3 events', icon: 'ticket', group: 'world', target: 3, metric: 'checkIns' },
  { key: 'host', title: 'Host', description: 'Host an event', icon: 'calendar', group: 'world', target: 1, metric: 'hosted' },
  { key: 'local-guide', title: 'Local guide', description: 'Review 3 places', icon: 'map', group: 'world', target: 3, metric: 'reviews' },
  { key: 'merchant', title: 'Merchant', description: 'Complete a sale in the market', icon: 'store', group: 'world', target: 1, metric: 'sales' },
];

export function bestStreak(days: Set<string>) {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;

  for (const key of sorted) {
    const time = Date.parse(`${key}T12:00:00Z`);
    run = previous !== null && Math.round((time - previous) / DAY_MS) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  }

  return best;
}

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  private async metrics(profile: { id: string; timezone: string; onboardedAt: Date | null }): Promise<Metrics> {
    const [
      tasks,
      sessions,
      modules,
      goalsAchieved,
      pathsCompleted,
      friendsA,
      friendsB,
      posts,
      circles,
      checkIns,
      hosted,
      reviews,
      sales,
    ] = await Promise.all([
      this.prisma.task.findMany({
        where: { profileId: profile.id, status: 'DONE', completedAt: { not: null } },
        select: { completedAt: true },
      }),
      this.prisma.studySession.findMany({
        where: { profileId: profile.id },
        select: { startedAt: true, minutes: true },
      }),
      this.prisma.learningModule.findMany({
        where: { path: { profileId: profile.id, deletedAt: null }, completedAt: { not: null } },
        select: { completedAt: true },
      }),
      this.prisma.goal.count({ where: { profileId: profile.id, achievedAt: { not: null } } }),
      this.prisma.learningPath.count({
        where: { profileId: profile.id, deletedAt: null, status: 'COMPLETED' },
      }),
      this.prisma.friendship.count({ where: { profileAId: profile.id } }),
      this.prisma.friendship.count({ where: { profileBId: profile.id } }),
      this.prisma.post.count({ where: { profileId: profile.id, deletedAt: null } }),
      this.prisma.circleMember.count({ where: { profileId: profile.id, circle: { deletedAt: null } } }),
      this.prisma.eventAttendee.count({ where: { profileId: profile.id, checkedInAt: { not: null } } }),
      this.prisma.event.count({ where: { hostId: profile.id, deletedAt: null } }),
      this.prisma.placeReview.count({ where: { profileId: profile.id } }),
      this.prisma.order.count({ where: { sellerId: profile.id, status: 'FULFILLED' } }),
    ]);

    const days = new Set<string>();
    for (const task of tasks) days.add(localParts(task.completedAt as Date, profile.timezone).dateKey);
    for (const session of sessions) days.add(localParts(session.startedAt, profile.timezone).dateKey);
    for (const module of modules) days.add(localParts(module.completedAt as Date, profile.timezone).dateKey);

    return {
      onboarded: profile.onboardedAt ? 1 : 0,
      tasksDone: tasks.length,
      studyMinutes: sessions.reduce((total, session) => total + session.minutes, 0),
      bestStreak: bestStreak(days),
      goalsAchieved,
      pathsCompleted,
      modulesDone: modules.length,
      friends: friendsA + friendsB,
      posts,
      circles,
      checkIns,
      hosted,
      reviews,
      sales,
    };
  }

  private shape(metrics: Metrics) {
    const badges = BADGES.map((badge) => {
      const value = metrics[badge.metric];

      return {
        key: badge.key,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        group: badge.group,
        target: badge.target,
        value: Math.min(value, badge.target),
        earned: value >= badge.target,
      };
    });

    return { earned: badges.filter((badge) => badge.earned).length, total: badges.length, badges };
  }

  async mine(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, timezone: true, onboardedAt: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return this.shape(await this.metrics(profile));
  }

  async forUsername(username: string, viewerUserId?: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { username: username.toLowerCase(), user: { status: { not: 'DEACTIVATED' } } },
      select: {
        id: true,
        userId: true,
        timezone: true,
        onboardedAt: true,
        privacy: { select: { profileVisibility: true } },
      },
    });

    if (!profile) throw new NotFoundException('No such profile');

    const visibility = profile.privacy?.profileVisibility ?? 'PUBLIC';

    if (profile.userId !== viewerUserId && visibility !== 'PUBLIC') {
      throw new ForbiddenException('This profile is private');
    }

    const shaped = this.shape(await this.metrics(profile));

    return {
      earned: shaped.earned,
      total: shaped.total,
      badges: shaped.badges
        .filter((badge) => badge.earned)
        .map(({ key, title, description, icon, group }) => ({ key, title, description, icon, group })),
    };
  }
}
