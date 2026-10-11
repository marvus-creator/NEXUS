import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReportStatus, ReportTargetType, UserRole } from '@nexus/db';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokensService } from '../auth/tokens.service.js';
import { SecurityStore } from '../common/security-store.service.js';
import { likeSafe } from '../common/like.js';

const RANK: Record<UserRole, number> = { USER: 0, BUSINESS: 1, MODERATOR: 2, ADMIN: 3 };

type TargetSummary = {
  type: ReportTargetType;
  id: string;
  exists: boolean;
  removed: boolean;
  preview: string | null;
  author: { userId: string; username: string; displayName: string; role: UserRole } | null;
  authorDeleted: boolean;
};

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly tokens: TokensService,
    private readonly revocations: SecurityStore,
  ) {}

  private async resolveTarget(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<TargetSummary> {
    const base = { type: targetType, id: targetId };

    if (targetType === 'PROFILE') {
      const profile = await this.prisma.profile.findUnique({
        where: { id: targetId },
        select: {
          username: true,
          displayName: true,
          bio: true,
          user: { select: { id: true, role: true, deletedAt: true } },
        },
      });

      if (!profile)
        return { ...base, exists: false, removed: true, preview: null, author: null, authorDeleted: true };

      return {
        ...base,
        exists: true,
        authorDeleted: profile.user.deletedAt !== null,
        removed: profile.user.deletedAt !== null,
        preview: profile.bio ?? `@${profile.username}`,
        author: {
          userId: profile.user.id,
          username: profile.username,
          displayName: profile.displayName,
          role: profile.user.role,
        },
      };
    }

    if (targetType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: targetId },
        select: {
          body: true,
          deletedAt: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              user: { select: { id: true, role: true, deletedAt: true } },
            },
          },
        },
      });

      if (!post)
        return { ...base, exists: false, removed: true, preview: null, author: null, authorDeleted: true };

      return {
        ...base,
        exists: true,
        authorDeleted: post.profile.user.deletedAt !== null,
        removed: post.deletedAt !== null,
        preview: post.body?.slice(0, 280) ?? null,
        author: {
          userId: post.profile.user.id,
          username: post.profile.username,
          displayName: post.profile.displayName,
          role: post.profile.user.role,
        },
      };
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: targetId },
      select: {
        body: true,
        deletedAt: true,
        profile: {
          select: {
            username: true,
            displayName: true,
            user: { select: { id: true, role: true, deletedAt: true } },
          },
        },
      },
    });

    if (!comment)
      return { ...base, exists: false, removed: true, preview: null, author: null, authorDeleted: true };

    return {
      ...base,
      exists: true,
      authorDeleted: comment.profile.user.deletedAt !== null,
      removed: comment.deletedAt !== null,
      preview: comment.body.slice(0, 280),
      author: {
        userId: comment.profile.user.id,
        username: comment.profile.username,
        displayName: comment.profile.displayName,
        role: comment.profile.user.role,
      },
    };
  }

  async queue(options: { status?: ReportStatus; limit?: number } = {}) {
    const reports = await this.prisma.report.findMany({
      where: options.status ? { status: options.status } : { status: { in: ['OPEN', 'REVIEWING'] } },
      include: {
        reporter: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
            user: { select: { deletedAt: true } },
          },
        },
        reviewedBy: { select: { email: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: options.limit ?? 50,
    });

    const targets = await Promise.all(
      reports.map((report) => this.resolveTarget(report.targetType, report.targetId)),
    );

    const counts = await this.prisma.report.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const actionable = reports
      .map((report, index) => ({ report, target: targets[index]! }))
      .filter(
        ({ report, target }) =>
          report.reporter.user.deletedAt === null && !target.authorDeleted,
      );

    return {
      counts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
      reports: actionable.map(({ report, target }) => ({
        id: report.id,
        reason: report.reason,
        details: report.details,
        status: report.status,
        resolution: report.resolution,
        createdAt: report.createdAt,
        reviewedAt: report.reviewedAt,
        reporter: {
          username: report.reporter.username,
          displayName: report.reporter.displayName,
          avatarUrl: report.reporter.avatarUrl,
        },
        target,
      })),
    };
  }

  private async assertCanActOn(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      throw new BadRequestException('You cannot moderate your own account');
    }

    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorUserId }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } }),
    ]);

    if (!actor || !target) throw new NotFoundException('Account not found');

    if (RANK[target.role] >= RANK[actor.role]) {
      throw new ForbiddenException('You cannot act on an account at or above your own role');
    }
  }

  async act(
    actorUserId: string,
    reportId: string,
    input: { action: 'DISMISS' | 'REMOVE_CONTENT' | 'SUSPEND' | 'WARN'; note?: string; days?: number },
  ) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });

    if (!report) throw new NotFoundException('Report not found');

    if (report.status === 'ACTIONED' || report.status === 'DISMISSED') {
      throw new BadRequestException(`That report was already ${report.status.toLowerCase()}`);
    }

    const target = await this.resolveTarget(report.targetType, report.targetId);

    if (input.action === 'DISMISS') {
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'DISMISSED',
          resolution: input.note,
          reviewedById: actorUserId,
          reviewedAt: new Date(),
        },
      });

      await this.audit.record({
        action: 'moderation.report.dismissed',
        actorUserId,
        entityType: report.targetType,
        entityId: report.targetId,
        metadata: { reportId, note: input.note },
      });

      return { id: updated.id, status: updated.status };
    }

    if (!target.exists || !target.author) {
      throw new BadRequestException('That content is already gone');
    }

    await this.assertCanActOn(actorUserId, target.author.userId);

    if (input.action === 'REMOVE_CONTENT') {
      if (report.targetType === 'PROFILE') {
        throw new BadRequestException('Use suspend for an account, not remove');
      }

      if (report.targetType === 'POST') {
        await this.prisma.post.update({
          where: { id: report.targetId },
          data: { deletedAt: new Date() },
        });
      } else {
        await this.prisma.comment.update({
          where: { id: report.targetId },
          data: { deletedAt: new Date() },
        });
      }

      await this.notifications.notify({
        userId: target.author.userId,
        category: 'IMPORTANT',
        key: 'contentRemoved',
        vars: { reason: report.reason },
        title: 'Something you posted was removed',
        body: input.note ?? undefined,
      });
    }

    if (input.action === 'WARN') {
      await this.notifications.notify({
        userId: target.author.userId,
        category: 'IMPORTANT',
        key: 'warning',
        vars: { reason: report.reason },
        title: 'A warning about your activity',
        body: input.note ?? undefined,
      });
    }

    if (input.action === 'SUSPEND') {
      const days = input.days ?? 7;

      if (days < 1 || days > 365) {
        throw new BadRequestException('Suspensions run between 1 and 365 days');
      }

      await this.prisma.user.update({
        where: { id: target.author.userId },
        data: {
          status: 'SUSPENDED',
          suspendedUntil: new Date(Date.now() + days * 86_400_000),
          suspendedReason: input.note ?? report.reason,
        },
      });

      await this.tokens.revokeAllSessions(target.author.userId);
      await this.revocations.revoke(target.author.userId);

      await this.notifications.notify({
        userId: target.author.userId,
        category: 'IMPORTANT',
        key: 'suspended',
        vars: { n: days, reason: report.reason },
        title: `Your account is suspended for ${days} ${days === 1 ? 'day' : 'days'}`,
        body: input.note ?? undefined,
      });
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'ACTIONED',
        resolution: input.note ?? input.action,
        reviewedById: actorUserId,
        reviewedAt: new Date(),
      },
    });

    await this.audit.record({
      action: `moderation.${input.action.toLowerCase()}`,
      actorUserId,
      entityType: report.targetType,
      entityId: report.targetId,
      metadata: { reportId, note: input.note, days: input.days },
    });

    return { id: updated.id, status: updated.status, action: input.action };
  }

  async users(
    options: { query?: string; status?: string; role?: UserRole; limit?: number; includeDeleted?: boolean } = {},
  ) {
    const term = options.query?.trim() ?? '';

    const users = await this.prisma.user.findMany({
      where: {
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(options.status ? { status: options.status as never } : {}),
        ...(options.role ? { role: options.role } : {}),
        ...(term.length >= 2
          ? {
              OR: [
                { email: { contains: likeSafe(term), mode: 'insensitive' } },
                { profile: { username: { contains: likeSafe(term), mode: 'insensitive' } } },
                { profile: { displayName: { contains: likeSafe(term), mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        suspendedUntil: true,
        suspendedReason: true,
        deletedAt: true,
        profile: { select: { username: true, displayName: true, avatarUrl: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 50,
    });

    return users;
  }

  async setStatus(
    actorUserId: string,
    userId: string,
    input: { status: 'ACTIVE' | 'SUSPENDED'; reason?: string; days?: number },
  ) {
    await this.assertCanActOn(actorUserId, userId);

    if (input.status === 'ACTIVE') {
      const restored = await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE', suspendedUntil: null, suspendedReason: null },
        select: { id: true, status: true },
      });

      await this.revocations.clear(userId);

      await this.audit.record({
        action: 'moderation.user.reinstated',
        actorUserId,
        entityType: 'user',
        entityId: userId,
      });

      return restored;
    }

    const days = input.days ?? 7;

    if (days < 1 || days > 365) {
      throw new BadRequestException('Suspensions run between 1 and 365 days');
    }

    const suspended = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        suspendedUntil: new Date(Date.now() + days * 86_400_000),
        suspendedReason: input.reason,
      },
      select: { id: true, status: true, suspendedUntil: true },
    });

    await this.tokens.revokeAllSessions(userId);
    await this.revocations.revoke(userId);

    await this.audit.record({
      action: 'moderation.user.suspended',
      actorUserId,
      entityType: 'user',
      entityId: userId,
      metadata: { days, reason: input.reason },
    });

    return suspended;
  }

  async setRole(actorUserId: string, userId: string, role: UserRole) {
    if (actorUserId === userId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true },
    });

    if (!actor || actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only an admin can change roles');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true },
    });

    await this.audit.record({
      action: 'moderation.user.role_changed',
      actorUserId,
      entityType: 'user',
      entityId: userId,
      metadata: { role },
    });

    return updated;
  }

  async auditTrail(limit = 60) {
    const entries = await this.prisma.auditLog.findMany({
      where: { action: { startsWith: 'moderation.' } },
      include: { actor: { select: { email: true, profile: { select: { username: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      actor: entry.actor
        ? { email: entry.actor.email, username: entry.actor.profile?.username ?? null }
        : null,
    }));
  }
}
