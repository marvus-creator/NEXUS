import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LearningSource, LearningStatus } from '@nexus/db';
import { PrismaService } from '../prisma/prisma.service.js';

const PATH_INCLUDE = {
  modules: { orderBy: { sortOrder: 'asc' as const } },
  goal: { select: { id: true, title: true } },
} as const;

type PathRecord = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  coverUrl: string | null;
  source: LearningSource;
  status: LearningStatus;
  targetDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  goal: { id: string; title: string } | null;
  modules: {
    id: string;
    title: string;
    notes: string | null;
    estimatedMinutes: number;
    sortOrder: number;
    completedAt: Date | null;
  }[];
};

export function shapePath(path: PathRecord, minutesLogged = 0) {
  const total = path.modules.length;
  const done = path.modules.filter(
    (module) => module.completedAt !== null,
  ).length;
  const remaining = path.modules.filter(
    (module) => module.completedAt === null,
  );
  const minutesLeft = remaining.reduce(
    (sum, module) => sum + module.estimatedMinutes,
    0,
  );

  return {
    id: path.id,
    title: path.title,
    subject: path.subject,
    description: path.description,
    coverUrl: path.coverUrl,
    source: path.source,
    status: path.status,
    targetDate: path.targetDate,
    completedAt: path.completedAt,
    createdAt: path.createdAt,
    goal: path.goal,
    modules: path.modules,
    moduleCount: total,
    modulesDone: done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    minutesLeft,
    minutesLogged,
    nextModule: remaining[0] ?? null,
  };
}

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async ownedPath(profileId: string, id: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { id, profileId, deletedAt: null },
    });

    if (!path) throw new NotFoundException('Learning path not found');

    return path;
  }

  private async minutesByPath(profileId: string) {
    const grouped = await this.prisma.studySession.groupBy({
      by: ['pathId'],
      where: { profileId, pathId: { not: null } },
      _sum: { minutes: true },
    });

    return new Map(
      grouped.map((row) => [row.pathId as string, row._sum.minutes ?? 0]),
    );
  }

  async list(userId: string, status?: LearningStatus) {
    const profile = await this.profileFor(userId);

    const [paths, minutes] = await Promise.all([
      this.prisma.learningPath.findMany({
        where: {
          profileId: profile.id,
          deletedAt: null,
          ...(status ? { status } : {}),
        },
        include: PATH_INCLUDE,
        orderBy: [
          { status: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      this.minutesByPath(profile.id),
    ]);

    return paths.map((path) => shapePath(path, minutes.get(path.id) ?? 0));
  }

  async detail(userId: string, id: string) {
    const profile = await this.profileFor(userId);
    await this.ownedPath(profile.id, id);

    const [path, sessions, logged] = await Promise.all([
      this.prisma.learningPath.findUniqueOrThrow({
        where: { id },
        include: PATH_INCLUDE,
      }),
      this.prisma.studySession.findMany({
        where: { profileId: profile.id, pathId: id },
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { module: { select: { id: true, title: true } } },
      }),
      this.prisma.studySession.aggregate({
        where: { profileId: profile.id, pathId: id },
        _sum: { minutes: true },
      }),
    ]);

    return { ...shapePath(path, logged._sum.minutes ?? 0), sessions };
  }

  async create(
    userId: string,
    input: {
      title: string;
      subject?: string;
      description?: string;
      source?: LearningSource;
      goalId?: string;
      targetDate?: string;
      modules?: { title: string; estimatedMinutes?: number }[];
    },
  ) {
    const profile = await this.profileFor(userId);

    if (input.goalId) {
      const goal = await this.prisma.goal.findFirst({
        where: { id: input.goalId, profileId: profile.id },
        select: { id: true },
      });

      if (!goal) throw new NotFoundException('Goal not found');
    }

    const last = await this.prisma.learningPath.findFirst({
      where: { profileId: profile.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const path = await this.prisma.learningPath.create({
      data: {
        profileId: profile.id,
        title: input.title,
        subject: input.subject,
        description: input.description,
        source: input.source ?? 'SELF',
        goalId: input.goalId,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        modules: {
          create: (input.modules ?? []).map((module, index) => ({
            title: module.title,
            estimatedMinutes: module.estimatedMinutes ?? 45,
            sortOrder: index,
          })),
        },
      },
      include: PATH_INCLUDE,
    });

    return shapePath(path);
  }

  async update(
    userId: string,
    id: string,
    input: {
      title?: string;
      subject?: string;
      description?: string;
      status?: LearningStatus;
      targetDate?: string | null;
      goalId?: string | null;
    },
  ) {
    const profile = await this.profileFor(userId);
    await this.ownedPath(profile.id, id);

    if (input.goalId) {
      const goal = await this.prisma.goal.findFirst({
        where: { id: input.goalId, profileId: profile.id },
        select: { id: true },
      });

      if (!goal) throw new NotFoundException('Goal not found');
    }

    const path = await this.prisma.learningPath.update({
      where: { id },
      data: {
        title: input.title,
        subject: input.subject,
        description: input.description,
        status: input.status,
        completedAt:
          input.status === undefined
            ? undefined
            : input.status === 'COMPLETED'
              ? new Date()
              : null,
        targetDate:
          input.targetDate === null
            ? null
            : input.targetDate
              ? new Date(input.targetDate)
              : undefined,
        goalId: input.goalId === null ? null : input.goalId,
      },
      include: PATH_INCLUDE,
    });

    return shapePath(path);
  }

  async remove(userId: string, id: string) {
    const profile = await this.profileFor(userId);
    await this.ownedPath(profile.id, id);

    await this.prisma.learningPath.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }

  async addModule(
    userId: string,
    pathId: string,
    input: { title: string; notes?: string; estimatedMinutes?: number },
  ) {
    const profile = await this.profileFor(userId);
    await this.ownedPath(profile.id, pathId);

    const last = await this.prisma.learningModule.findFirst({
      where: { pathId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.learningModule.create({
      data: {
        pathId,
        title: input.title,
        notes: input.notes,
        estimatedMinutes: input.estimatedMinutes ?? 45,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async setModuleDone(
    userId: string,
    pathId: string,
    moduleId: string,
    done: boolean,
  ) {
    const profile = await this.profileFor(userId);
    await this.ownedPath(profile.id, pathId);

    const module = await this.prisma.learningModule.findFirst({
      where: { id: moduleId, pathId },
    });

    if (!module) throw new NotFoundException('Module not found');

    await this.prisma.learningModule.update({
      where: { id: moduleId },
      data: { completedAt: done ? new Date() : null },
    });

    const path = await this.prisma.learningPath.findUniqueOrThrow({
      where: { id: pathId },
      include: PATH_INCLUDE,
    });

    const remaining = path.modules.filter(
      (entry) => entry.completedAt === null,
    ).length;

    if (
      remaining === 0 &&
      path.modules.length > 0 &&
      path.status === 'ACTIVE'
    ) {
      await this.prisma.learningPath.update({
        where: { id: pathId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    if (remaining > 0 && path.status === 'COMPLETED') {
      await this.prisma.learningPath.update({
        where: { id: pathId },
        data: { status: 'ACTIVE', completedAt: null },
      });
    }

    return this.detail(userId, pathId);
  }

  async removeModule(userId: string, pathId: string, moduleId: string) {
    const profile = await this.profileFor(userId);
    await this.ownedPath(profile.id, pathId);

    const module = await this.prisma.learningModule.findFirst({
      where: { id: moduleId, pathId },
    });

    if (!module) throw new NotFoundException('Module not found');

    await this.prisma.learningModule.delete({ where: { id: moduleId } });

    return { id: moduleId, deleted: true };
  }

  async logSession(
    userId: string,
    input: {
      pathId?: string;
      moduleId?: string;
      minutes: number;
      note?: string;
      startedAt?: string;
    },
  ) {
    const profile = await this.profileFor(userId);

    if (input.pathId) await this.ownedPath(profile.id, input.pathId);

    if (input.moduleId) {
      const module = await this.prisma.learningModule.findFirst({
        where: {
          id: input.moduleId,
          path: { profileId: profile.id, deletedAt: null },
        },
        select: { id: true, pathId: true },
      });

      if (!module) throw new NotFoundException('Module not found');

      if (input.pathId && module.pathId !== input.pathId) {
        throw new BadRequestException(
          'That module belongs to a different path',
        );
      }

      input.pathId ??= module.pathId;
    }

    const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();

    if (Number.isNaN(startedAt.getTime())) {
      throw new BadRequestException('startedAt is not a valid date');
    }

    if (startedAt.getTime() > Date.now() + 60_000) {
      throw new BadRequestException(
        'A study session cannot start in the future',
      );
    }

    return this.prisma.studySession.create({
      data: {
        profileId: profile.id,
        pathId: input.pathId,
        moduleId: input.moduleId,
        minutes: input.minutes,
        note: input.note,
        startedAt,
      },
    });
  }

  async sessions(userId: string, limit = 30) {
    const profile = await this.profileFor(userId);

    return this.prisma.studySession.findMany({
      where: { profileId: profile.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        path: { select: { id: true, title: true } },
        module: { select: { id: true, title: true } },
      },
    });
  }
}
