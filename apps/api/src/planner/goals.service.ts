import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateGoalDto, CreateMilestoneDto, UpdateGoalDto } from './dto/goal.dto.js';

type GoalWithRelations = {
  milestones: { doneAt: Date | null }[];
  tasks: { status: string }[];
};

export function computeProgress(goal: GoalWithRelations) {
  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter((milestone) => milestone.doneAt !== null).length;
    return Math.round((done / goal.milestones.length) * 100);
  }

  if (goal.tasks.length > 0) {
    const done = goal.tasks.filter((task) => task.status === 'DONE').length;
    return Math.round((done / goal.tasks.length) * 100);
  }

  return 0;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async ownedGoal(profileId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id, profileId } });

    if (!goal) throw new NotFoundException('Goal not found');

    return goal;
  }

  async list(userId: string) {
    const profile = await this.profileFor(userId);

    const goals = await this.prisma.goal.findMany({
      where: { profileId: profile.id },
      include: {
        milestones: { orderBy: { sortOrder: 'asc' } },
        tasks: { select: { id: true, title: true, status: true, dueAt: true } },
      },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return goals.map((goal) => ({ ...goal, progress: computeProgress(goal) }));
  }

  async create(userId: string, dto: CreateGoalDto) {
    const profile = await this.profileFor(userId);

    const goal = await this.prisma.goal.create({
      data: {
        profileId: profile.id,
        title: dto.title,
        description: dto.description,
        area: dto.area,
        horizon: dto.horizon,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        milestones: dto.milestones
          ? {
              create: dto.milestones
                .filter((title) => title.trim().length > 0)
                .map((title, index) => ({ title: title.trim(), sortOrder: index })),
            }
          : undefined,
      },
      include: { milestones: { orderBy: { sortOrder: 'asc' } }, tasks: true },
    });

    return { ...goal, progress: computeProgress(goal) };
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const profile = await this.profileFor(userId);
    await this.ownedGoal(profile.id, id);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        area: dto.area,
        horizon: dto.horizon,
        status: dto.status,
        achievedAt: dto.status === 'ACHIEVED' ? new Date() : dto.status ? null : undefined,
        targetDate:
          dto.targetDate === null ? null : dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
      include: { milestones: { orderBy: { sortOrder: 'asc' } }, tasks: true },
    });

    return { ...goal, progress: computeProgress(goal) };
  }

  async remove(userId: string, id: string) {
    const profile = await this.profileFor(userId);
    await this.ownedGoal(profile.id, id);

    await this.prisma.goal.delete({ where: { id } });

    return { deleted: true };
  }

  async addMilestone(userId: string, goalId: string, dto: CreateMilestoneDto) {
    const profile = await this.profileFor(userId);
    await this.ownedGoal(profile.id, goalId);

    const count = await this.prisma.milestone.count({ where: { goalId } });

    return this.prisma.milestone.create({
      data: { goalId, title: dto.title, sortOrder: count },
    });
  }

  async toggleMilestone(userId: string, milestoneId: string, done: boolean) {
    const profile = await this.profileFor(userId);

    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, goal: { profileId: profile.id } },
      include: { goal: true },
    });

    if (!milestone) throw new NotFoundException('Milestone not found');

    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { doneAt: done ? new Date() : null },
    });

    const goal = await this.prisma.goal.findUniqueOrThrow({
      where: { id: milestone.goalId },
      include: { milestones: true, tasks: { select: { status: true } } },
    });

    const progress = computeProgress(goal);
    let achieved = false;

    if (progress === 100 && goal.status === 'ACTIVE') {
      achieved = true;

      await this.prisma.goal.update({
        where: { id: goal.id },
        data: { status: 'ACHIEVED', achievedAt: new Date() },
      });

      await this.notifications.notify({
        userId,
        category: 'GOALS',
        title: `Goal achieved: ${goal.title}`,
        body: 'Every milestone is done. That one is finished.',
        href: '/goals',
      });

      await this.audit.record({
        action: 'goal.achieved',
        actorUserId: userId,
        entityType: 'Goal',
        entityId: goal.id,
      });
    } else if (progress < 100 && goal.status === 'ACHIEVED') {
      await this.prisma.goal.update({
        where: { id: goal.id },
        data: { status: 'ACTIVE', achievedAt: null },
      });
    }

    return { progress, achieved };
  }

  async removeMilestone(userId: string, milestoneId: string) {
    const profile = await this.profileFor(userId);

    const result = await this.prisma.milestone.deleteMany({
      where: { id: milestoneId, goal: { profileId: profile.id } },
    });

    if (result.count === 0) throw new NotFoundException('Milestone not found');

    return { deleted: true };
  }
}
