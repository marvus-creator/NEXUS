import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Recurrence } from '@nexus/db';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTaskDto, ListTasksQuery, UpdateTaskDto } from './dto/task.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function nextOccurrence(from: Date, recurrence: Recurrence): Date | null {
  const next = new Date(from.getTime());

  switch (recurrence) {
    case 'DAILY':
      next.setTime(next.getTime() + DAY_MS);
      return next;
    case 'WEEKDAYS': {
      do {
        next.setTime(next.getTime() + DAY_MS);
      } while (next.getDay() === 0 || next.getDay() === 6);
      return next;
    }
    case 'WEEKLY':
      next.setTime(next.getTime() + 7 * DAY_MS);
      return next;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      return next;
    default:
      return null;
  }
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async ownedTask(profileId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, profileId } });

    if (!task) throw new NotFoundException('Task not found');

    return task;
  }

  async list(userId: string, query: ListTasksQuery) {
    const profile = await this.profileFor(userId);
    const now = new Date();

    const where: Prisma.TaskWhereInput = {
      profileId: profile.id,
      parentId: null,
      status: query.status ?? undefined,
    };

    if (query.goalId) where.goalId = query.goalId;

    if (query.scope === 'today') {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      where.dueAt = { lte: end };
      where.status = { in: ['TODO', 'DOING'] };
    }

    if (query.scope === 'week') {
      where.dueAt = { lte: new Date(now.getTime() + 7 * DAY_MS) };
      where.status = { in: ['TODO', 'DOING'] };
    }

    if (query.scope === 'overdue') {
      where.dueAt = { lt: now };
      where.status = { in: ['TODO', 'DOING'] };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        subtasks: { orderBy: { sortOrder: 'asc' } },
        goal: { select: { id: true, title: true, area: true } },
      },
      orderBy: [{ status: 'asc' }, { dueAt: { sort: 'asc', nulls: 'last' } }, { sortOrder: 'asc' }],
      take: 200,
    });

    return tasks;
  }

  async counts(userId: string) {
    const profile = await this.profileFor(userId);
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [open, overdue, dueToday, done] = await Promise.all([
      this.prisma.task.count({
        where: { profileId: profile.id, status: { in: ['TODO', 'DOING'] }, parentId: null },
      }),
      this.prisma.task.count({
        where: {
          profileId: profile.id,
          status: { in: ['TODO', 'DOING'] },
          dueAt: { lt: now },
          parentId: null,
        },
      }),
      this.prisma.task.count({
        where: {
          profileId: profile.id,
          status: { in: ['TODO', 'DOING'] },
          dueAt: { gte: now, lte: endOfToday },
          parentId: null,
        },
      }),
      this.prisma.task.count({ where: { profileId: profile.id, status: 'DONE', parentId: null } }),
    ]);

    return { open, overdue, dueToday, done };
  }

  async create(userId: string, dto: CreateTaskDto) {
    const profile = await this.profileFor(userId);

    if (dto.goalId) {
      const goal = await this.prisma.goal.findFirst({
        where: { id: dto.goalId, profileId: profile.id },
        select: { id: true },
      });

      if (!goal) throw new BadRequestException('That goal does not exist');
    }

    if (dto.parentId) {
      await this.ownedTask(profile.id, dto.parentId);
    }

    return this.prisma.task.create({
      data: {
        profileId: profile.id,
        title: dto.title,
        notes: dto.notes,
        category: dto.category,
        priority: dto.priority,
        recurrence: dto.recurrence,
        goalId: dto.goalId,
        parentId: dto.parentId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
      include: { subtasks: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const profile = await this.profileFor(userId);
    await this.ownedTask(profile.id, id);

    if (dto.goalId) {
      const goal = await this.prisma.goal.findFirst({
        where: { id: dto.goalId, profileId: profile.id },
        select: { id: true },
      });

      if (!goal) throw new BadRequestException('That goal does not exist');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        notes: dto.notes,
        category: dto.category,
        status: dto.status,
        priority: dto.priority,
        recurrence: dto.recurrence,
        sortOrder: dto.sortOrder,
        goalId: dto.goalId === null ? null : dto.goalId,
        dueAt: dto.dueAt === null ? null : dto.dueAt ? new Date(dto.dueAt) : undefined,
        completedAt: dto.status === 'DONE' ? new Date() : dto.status ? null : undefined,
      },
      include: { subtasks: true },
    });
  }

  async toggle(userId: string, id: string, done: boolean) {
    const profile = await this.profileFor(userId);
    const task = await this.ownedTask(profile.id, id);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: done ? 'DONE' : 'TODO',
        completedAt: done ? new Date() : null,
      },
      include: { subtasks: true },
    });

    let repeated = null;

    if (done && task.recurrence !== 'NONE' && task.dueAt) {
      const nextDue = nextOccurrence(task.dueAt, task.recurrence);

      if (nextDue) {
        repeated = await this.prisma.task.create({
          data: {
            profileId: profile.id,
            title: task.title,
            notes: task.notes,
            category: task.category,
            priority: task.priority,
            recurrence: task.recurrence,
            goalId: task.goalId,
            dueAt: nextDue,
          },
        });
      }
    }

    return { task: updated, repeated };
  }

  async remove(userId: string, id: string) {
    const profile = await this.profileFor(userId);
    await this.ownedTask(profile.id, id);

    await this.prisma.task.delete({ where: { id } });

    return { deleted: true };
  }
}
