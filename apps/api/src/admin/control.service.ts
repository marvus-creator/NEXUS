import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, UserRole } from '@nexus/db';
import { AuditService } from '../audit/audit.service.js';
import { TokensService } from '../auth/tokens.service.js';
import { SecurityStore } from '../common/security-store.service.js';
import { money } from '../common/util/money.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerService } from '../wallet/ledger.service.js';

const RANK: Record<UserRole, number> = { USER: 0, BUSINESS: 1, MODERATOR: 2, ADMIN: 3 };

export const CONTENT_TYPES = ['posts', 'events', 'circles', 'places', 'listings', 'businesses'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type PlatformSettings = {
  registrationOpen: boolean;
  announcement: { message: string; tone: 'info' | 'warning' | 'success'; active: boolean } | null;
};

const DEFAULT_SETTINGS: PlatformSettings = { registrationOpen: true, announcement: null };

const profileCard = {
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

@Injectable()
export class ControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly tokens: TokensService,
    private readonly revocations: SecurityStore,
    private readonly ledger: LedgerService,
  ) {}

  private async assertCanActOn(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) throw new BadRequestException('You cannot do this to your own account');

    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorUserId }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } }),
    ]);

    if (!actor || !target) throw new NotFoundException('Account not found');
    if (RANK[target.role] >= RANK[actor.role]) {
      throw new ForbiddenException('You cannot act on an account at or above your own role');
    }
  }

  async directory(options: {
    query?: string;
    role?: UserRole;
    status?: string;
    city?: string;
    includeDeleted?: boolean;
    sort?: 'newest' | 'oldest' | 'active' | 'name';
    limit?: number;
  }) {
    const term = options.query?.trim() ?? '';
    const where: Prisma.UserWhereInput = {
      ...(options.includeDeleted ? {} : { deletedAt: null }),
      ...(options.status === 'DELETED' ? { deletedAt: { not: null } } : options.status ? { status: options.status as never } : {}),
      ...(options.role ? { role: options.role } : {}),
      ...(options.city ? { profile: { city: { equals: options.city, mode: 'insensitive' } } } : {}),
      ...(term.length >= 2
        ? {
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              { profile: { username: { contains: term, mode: 'insensitive' } } },
              { profile: { displayName: { contains: term, mode: 'insensitive' } } },
              { profile: { occupation: { contains: term, mode: 'insensitive' } } },
              { profile: { bio: { contains: term, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput =
      options.sort === 'oldest'
        ? { createdAt: 'asc' }
        : options.sort === 'active'
          ? { lastLoginAt: { sort: 'desc', nulls: 'last' } }
          : options.sort === 'name'
            ? { profile: { displayName: 'asc' } }
            : { createdAt: 'desc' };

    const [total, users, totals] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
        take: Math.min(options.limit ?? 100, 500),
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          lastLoginAt: true,
          suspendedUntil: true,
          deletedAt: true,
          profile: {
            select: {
              ...profileCard,
              bio: true,
              occupation: true,
              userType: true,
              city: true,
              onboardedAt: true,
              interests: { select: { interest: { select: { label: true } } }, take: 4 },
              _count: { select: { posts: true, eventsHosted: true, listings: true, circleMemberships: true } },
            },
          },
        },
      }),
      this.prisma.user.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(totals.map((row) => [row.status, row._count])),
      users: users.map((user) => ({
        ...user,
        profile: user.profile
          ? {
              ...user.profile,
              interests: user.profile.interests.map((row) => row.interest.label),
            }
          : null,
      })),
    };
  }

  async dossier(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        suspendedUntil: true,
        suspendedReason: true,
        deletedAt: true,
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { lastUsedAt: 'desc' },
          take: 10,
          select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true },
        },
        profile: {
          select: {
            id: true,
            ...profileCard,
            coverUrl: true,
            bio: true,
            occupation: true,
            userType: true,
            city: true,
            countryCode: true,
            timezone: true,
            locale: true,
            currency: true,
            skills: true,
            goalAreas: true,
            helpAreas: true,
            onboardedAt: true,
            interests: { select: { interest: { select: { label: true, category: true } } } },
            privacy: true,
            wallet: { select: { id: true, currency: true } },
            _count: {
              select: {
                posts: true,
                comments: true,
                followers: true,
                following: true,
                friendshipsA: true,
                friendshipsB: true,
                circleMemberships: true,
                eventsHosted: true,
                eventAttendance: true,
                placesCreated: true,
                placeReviews: true,
                listings: true,
                ordersPlaced: true,
                ordersReceived: true,
                tasks: true,
                goals: true,
                learningPaths: true,
                studySessions: true,
                messages: true,
                reportsMade: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Account not found');

    const profileId = user.profile?.id;

    const [reportsAgainst, history, recentPosts, circles, balance] = await Promise.all([
      profileId
        ? this.prisma.report.findMany({
            where: { OR: [{ targetType: 'PROFILE', targetId: profileId }] },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, reason: true, status: true, createdAt: true, reporter: { select: profileCard } },
          })
        : [],
      this.prisma.auditLog.findMany({
        where: { OR: [{ actorUserId: userId }, { entityId: userId }] },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: { id: true, action: true, createdAt: true, ipAddress: true, metadata: true },
      }),
      profileId
        ? this.prisma.post.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, body: true, createdAt: true, deletedAt: true, visibility: true },
          })
        : [],
      profileId
        ? this.prisma.circleMember.findMany({
            where: { profileId },
            take: 10,
            select: { role: true, circle: { select: { name: true, slug: true } } },
          })
        : [],
      user.profile?.wallet ? this.ledger.balanceOf(user.profile.wallet.id) : null,
    ]);

    const counts = user.profile?._count;

    return {
      ...user,
      profile: user.profile
        ? {
            ...user.profile,
            interests: user.profile.interests.map((row) => row.interest),
            friends: (counts?.friendshipsA ?? 0) + (counts?.friendshipsB ?? 0),
          }
        : null,
      wallet:
        balance !== null && user.profile?.wallet
          ? { balance: money(balance, user.profile.wallet.currency) }
          : null,
      reportsAgainst,
      history,
      recentPosts,
      circles: circles.map((row) => ({ ...row.circle, role: row.role })),
    };
  }

  async verifyEmail(actorUserId: string, userId: string) {
    await this.assertCanActOn(actorUserId, userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      select: { id: true, emailVerifiedAt: true, status: true },
    });
    await this.audit.record({ action: 'admin.user.email_verified', actorUserId, entityType: 'user', entityId: userId });
    return user;
  }

  async signOutEverywhere(actorUserId: string, userId: string) {
    await this.assertCanActOn(actorUserId, userId);
    await this.tokens.revokeAllSessions(userId);
    await this.revocations.revoke(userId);
    await this.audit.record({ action: 'admin.user.signed_out', actorUserId, entityType: 'user', entityId: userId });
    return { ok: true };
  }

  async deleteAccount(actorUserId: string, userId: string, reason?: string) {
    await this.assertCanActOn(actorUserId, userId);
    await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    await this.tokens.revokeAllSessions(userId);
    await this.revocations.revoke(userId);
    await this.audit.record({
      action: 'admin.user.deleted',
      actorUserId,
      entityType: 'user',
      entityId: userId,
      metadata: { reason },
    });
    return { ok: true };
  }

  async restoreAccount(actorUserId: string, userId: string) {
    await this.assertCanActOn(actorUserId, userId);
    await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: null } });
    await this.revocations.clear(userId);
    await this.audit.record({ action: 'admin.user.restored', actorUserId, entityType: 'user', entityId: userId });
    return { ok: true };
  }

  async message(actorUserId: string, userId: string, input: { title: string; body?: string; href?: string }) {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new NotFoundException('Account not found');

    await this.notifications.notify({ userId, category: 'SYSTEM', title: input.title, body: input.body, href: input.href });
    await this.audit.record({
      action: 'admin.user.messaged',
      actorUserId,
      entityType: 'user',
      entityId: userId,
      metadata: { title: input.title },
    });
    return { ok: true };
  }

  async broadcast(actorUserId: string, input: { title: string; body?: string; href?: string; role?: UserRole; city?: string }) {
    const recipients = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: { not: 'SUSPENDED' },
        ...(input.role ? { role: input.role } : {}),
        ...(input.city ? { profile: { city: { equals: input.city, mode: 'insensitive' } } } : {}),
      },
      select: { id: true },
    });

    for (const recipient of recipients) {
      await this.notifications.notify({
        userId: recipient.id,
        category: 'SYSTEM',
        title: input.title,
        body: input.body,
        href: input.href,
      });
    }

    await this.audit.record({
      action: 'admin.broadcast.sent',
      actorUserId,
      entityType: 'platform',
      metadata: { title: input.title, recipients: recipients.length, role: input.role, city: input.city },
    });

    return { recipients: recipients.length };
  }

  async exportCsv() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        deletedAt: true,
        profile: { select: { username: true, displayName: true, occupation: true, userType: true, city: true, bio: true } },
      },
    });

    const header = ['id', 'name', 'username', 'email', 'role', 'status', 'type', 'occupation', 'city', 'verified', 'joined', 'last_login', 'deleted', 'bio'];
    const rows = users.map((user) => [
      user.id,
      user.profile?.displayName,
      user.profile?.username,
      user.email,
      user.role,
      user.status,
      user.profile?.userType,
      user.profile?.occupation,
      user.profile?.city,
      user.emailVerifiedAt ? 'yes' : 'no',
      user.createdAt.toISOString(),
      user.lastLoginAt?.toISOString(),
      user.deletedAt ? 'yes' : 'no',
      user.profile?.bio,
    ]);

    return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  }

  async content(type: ContentType, options: { query?: string; state?: 'live' | 'removed' | 'all' }) {
    const term = options.query?.trim() ?? '';
    const deleted = options.state === 'removed' ? { deletedAt: { not: null } } : options.state === 'all' ? {} : { deletedAt: null };
    const contains = (field: string) => (term.length >= 2 ? { [field]: { contains: term, mode: 'insensitive' } } : {});

    if (type === 'posts') {
      const rows = await this.prisma.post.findMany({
        where: { ...deleted, ...contains('body') },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { id: true, body: true, visibility: true, createdAt: true, deletedAt: true, profile: { select: profileCard } },
      });
      return rows.map((row) => ({ id: row.id, title: row.body.slice(0, 140), subtitle: row.visibility.toLowerCase(), author: row.profile, createdAt: row.createdAt, removed: Boolean(row.deletedAt), verified: null }));
    }

    if (type === 'events') {
      const rows = await this.prisma.event.findMany({
        where: { ...deleted, ...contains('title') },
        orderBy: { startAt: 'desc' },
        take: 60,
        select: { id: true, slug: true, title: true, startAt: true, createdAt: true, deletedAt: true, host: { select: profileCard }, _count: { select: { attendees: true } } },
      });
      return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title, subtitle: `${row.startAt.toISOString().slice(0, 10)} · ${row._count.attendees} attendees`, author: row.host, createdAt: row.createdAt, removed: Boolean(row.deletedAt), verified: null }));
    }

    if (type === 'circles') {
      const rows = await this.prisma.circle.findMany({
        where: { ...deleted, ...contains('name') },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { id: true, slug: true, name: true, visibility: true, createdAt: true, deletedAt: true, _count: { select: { members: true, posts: true } } },
      });
      return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.name, subtitle: `${row.visibility.toLowerCase()} · ${row._count.members} members · ${row._count.posts} posts`, author: null, createdAt: row.createdAt, removed: Boolean(row.deletedAt), verified: null }));
    }

    if (type === 'places') {
      const rows = await this.prisma.place.findMany({
        where: { ...deleted, ...contains('name') },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { id: true, slug: true, name: true, category: true, address: true, verified: true, createdAt: true, deletedAt: true, createdBy: { select: profileCard } },
      });
      return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.name, subtitle: `${row.category.toLowerCase()}${row.address ? ` · ${row.address}` : ''}`, author: row.createdBy, createdAt: row.createdAt, removed: Boolean(row.deletedAt), verified: row.verified }));
    }

    if (type === 'listings') {
      const rows = await this.prisma.listing.findMany({
        where: { ...deleted, ...contains('title') },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { id: true, slug: true, title: true, priceMinor: true, currency: true, status: true, createdAt: true, deletedAt: true, seller: { select: profileCard } },
      });
      return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title, subtitle: `${money(row.priceMinor, row.currency).display} · ${row.status.toLowerCase()}`, author: row.seller, createdAt: row.createdAt, removed: Boolean(row.deletedAt), verified: null }));
    }

    const rows = await this.prisma.business.findMany({
      where: { ...deleted, ...contains('name') },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, slug: true, name: true, category: true, city: true, verified: true, createdAt: true, deletedAt: true, _count: { select: { listings: true, members: true } } },
    });
    return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.name, subtitle: `${row.category.toLowerCase()} · ${row._count.listings} listings · ${row._count.members} team`, author: null, createdAt: row.createdAt, removed: Boolean(row.deletedAt), verified: row.verified }));
  }

  private delegate(type: ContentType) {
    const map = {
      posts: this.prisma.post,
      events: this.prisma.event,
      circles: this.prisma.circle,
      places: this.prisma.place,
      listings: this.prisma.listing,
      businesses: this.prisma.business,
    } as const;
    return map[type] as unknown as { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> };
  }

  async setRemoved(actorUserId: string, type: ContentType, id: string, removed: boolean, reason?: string) {
    await this.delegate(type).update({ where: { id }, data: { deletedAt: removed ? new Date() : null } });
    await this.audit.record({
      action: removed ? `admin.content.removed` : `admin.content.restored`,
      actorUserId,
      entityType: type,
      entityId: id,
      metadata: { reason },
    });
    return { id, removed };
  }

  async setVerified(actorUserId: string, type: 'places' | 'businesses', id: string, verified: boolean) {
    if (type === 'places') await this.prisma.place.update({ where: { id }, data: { verified } });
    else await this.prisma.business.update({ where: { id }, data: { verified } });
    await this.audit.record({
      action: verified ? 'admin.content.verified' : 'admin.content.unverified',
      actorUserId,
      entityType: type,
      entityId: id,
    });
    return { id, verified };
  }

  async settings(): Promise<PlatformSettings> {
    const rows = await this.prisma.platformSetting.findMany();
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { ...DEFAULT_SETTINGS, ...(stored as Partial<PlatformSettings>) };
  }

  async updateSettings(actorUserId: string, patch: Partial<PlatformSettings>) {
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULT_SETTINGS) || value === undefined) continue;
      await this.prisma.platformSetting.upsert({
        where: { key },
        create: { key, value: value as Prisma.InputJsonValue, updatedById: actorUserId },
        update: { value: value as Prisma.InputJsonValue, updatedById: actorUserId },
      });
    }
    await this.audit.record({ action: 'admin.settings.updated', actorUserId, entityType: 'platform', metadata: patch as Prisma.InputJsonValue });
    return this.settings();
  }

  async auditLog(options: { action?: string; limit?: number }) {
    const entries = await this.prisma.auditLog.findMany({
      where: options.action ? { action: { startsWith: options.action } } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(options.limit ?? 150, 500),
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
        actor: { select: { id: true, email: true, profile: { select: profileCard } } },
      },
    });
    return entries;
  }
}
