import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CircleRole, Prisma } from '@nexus/db';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PeopleService } from '../people/people.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const RANK: Record<CircleRole, number> = {
  MEMBER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
}

@Injectable()
export class CirclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async circleBySlug(slug: string) {
    const circle = await this.prisma.circle.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
    });

    if (!circle) throw new NotFoundException('No such circle');

    return circle;
  }

  private async membership(circleId: string, profileId: string) {
    return this.prisma.circleMember.findUnique({
      where: { circleId_profileId: { circleId, profileId } },
    });
  }

  private async requireRole(circleId: string, profileId: string, minimum: CircleRole) {
    const member = await this.membership(circleId, profileId);

    if (!member || RANK[member.role] < RANK[minimum]) {
      throw new ForbiddenException('You do not have permission to do that');
    }

    return member;
  }

  async list(userId: string, scope: 'discover' | 'mine' = 'discover') {
    const me = await this.people.profileFor(userId);

    const memberships = await this.prisma.circleMember.findMany({
      where: { profileId: me.id },
      select: { circleId: true, role: true },
    });

    const myIds = memberships.map((row) => row.circleId);

    const where: Prisma.CircleWhereInput =
      scope === 'mine'
        ? { id: { in: myIds }, deletedAt: null }
        : { deletedAt: null, OR: [{ visibility: { not: 'PRIVATE' } }, { id: { in: myIds } }] };

    const circles = await this.prisma.circle.findMany({
      where,
      include: { _count: { select: { members: true, posts: true } } },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return circles.map((circle) => ({
      id: circle.id,
      slug: circle.slug,
      name: circle.name,
      description: circle.description,
      coverUrl: circle.coverUrl,
      visibility: circle.visibility,
      city: circle.city,
      members: circle._count.members,
      posts: circle._count.posts,
      myRole: memberships.find((row) => row.circleId === circle.id)?.role ?? null,
    }));
  }

  async detail(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    const member = await this.membership(circle.id, me.id);

    if (circle.visibility === 'PRIVATE' && !member) {
      throw new ForbiddenException('This circle is private');
    }

    const [members, counts, joinRequest, pendingCount] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId: circle.id },
        include: {
          profile: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, occupation: true },
          },
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        take: 60,
      }),
      this.prisma.circle.findUniqueOrThrow({
        where: { id: circle.id },
        select: { _count: { select: { members: true, posts: true } } },
      }),
      this.prisma.circleJoinRequest.findUnique({
        where: { circleId_profileId: { circleId: circle.id, profileId: me.id } },
      }),
      member && RANK[member.role] >= RANK.MODERATOR
        ? this.prisma.circleJoinRequest.count({ where: { circleId: circle.id, status: 'PENDING' } })
        : Promise.resolve(0),
    ]);

    return {
      id: circle.id,
      slug: circle.slug,
      name: circle.name,
      description: circle.description,
      rules: circle.rules,
      coverUrl: circle.coverUrl,
      visibility: circle.visibility,
      city: circle.city,
      createdAt: circle.createdAt,
      memberCount: counts._count.members,
      postCount: counts._count.posts,
      myRole: member?.role ?? null,
      canPost: Boolean(member),
      joinRequestStatus: joinRequest?.status ?? null,
      pendingRequests: pendingCount,
      members: members.map((row) => ({ ...row.profile, role: row.role, joinedAt: row.joinedAt })),
    };
  }

  async create(
    userId: string,
    input: {
      name: string;
      description?: string;
      visibility?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
      city?: string;
      rules?: string;
      coverUrl?: string;
    },
  ) {
    const me = await this.people.profileFor(userId);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Confirm your email address before creating a circle');
    }

    const base = slugify(input.name);

    if (base.length < 2) throw new BadRequestException('Give the circle a longer name');

    let slug = base;
    let attempt = 1;

    while (await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } })) {
      attempt += 1;
      slug = `${base}-${attempt}`;
    }

    const circle = await this.prisma.circle.create({
      data: {
        slug,
        name: input.name.trim(),
        description: input.description,
        visibility: input.visibility ?? 'PUBLIC',
        city: input.city,
        rules: input.rules,
        coverUrl: input.coverUrl,
        members: { create: { profileId: me.id, role: 'OWNER' } },
        conversations: { create: { kind: 'CIRCLE', title: input.name.trim() } },
      },
      include: { conversations: { select: { id: true } } },
    });

    const conversationId = circle.conversations[0]?.id;

    if (conversationId) {
      await this.prisma.conversationParticipant.create({
        data: { conversationId, profileId: me.id },
      });
    }

    await this.audit.record({
      action: 'circle.created',
      actorUserId: userId,
      entityType: 'Circle',
      entityId: circle.id,
    });

    return { id: circle.id, slug: circle.slug, name: circle.name };
  }

  async update(
    userId: string,
    slug: string,
    input: { description?: string; rules?: string; coverUrl?: string | null },
  ) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);

    await this.requireRole(circle.id, me.id, 'ADMIN');

    const updated = await this.prisma.circle.update({
      where: { id: circle.id },
      data: { description: input.description, rules: input.rules, coverUrl: input.coverUrl },
      select: { slug: true, description: true, rules: true, coverUrl: true },
    });

    return updated;
  }

  async join(userId: string, slug: string, message?: string) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    const existing = await this.membership(circle.id, me.id);

    if (existing) return { joined: true, role: existing.role };

    if (circle.visibility === 'PUBLIC') {
      await this.prisma.circleMember.create({
        data: { circleId: circle.id, profileId: me.id, role: 'MEMBER' },
      });

      const conversation = await this.prisma.conversation.findFirst({
        where: { circleId: circle.id },
        select: { id: true },
      });

      if (conversation) {
        await this.prisma.conversationParticipant.upsert({
          where: {
            conversationId_profileId: { conversationId: conversation.id, profileId: me.id },
          },
          create: { conversationId: conversation.id, profileId: me.id },
          update: { leftAt: null },
        });
      }

      return { joined: true, role: 'MEMBER' as const };
    }

    if (circle.visibility === 'INVITE_ONLY') {
      throw new ForbiddenException('This circle is invite only');
    }

    const request = await this.prisma.circleJoinRequest.upsert({
      where: { circleId_profileId: { circleId: circle.id, profileId: me.id } },
      create: { circleId: circle.id, profileId: me.id, message, status: 'PENDING' },
      update: { status: 'PENDING', message, decidedAt: null },
    });

    const moderators = await this.prisma.circleMember.findMany({
      where: { circleId: circle.id, role: { in: ['OWNER', 'ADMIN', 'MODERATOR'] } },
      include: { profile: { select: { userId: true } } },
    });

    for (const moderator of moderators) {
      await this.notifications.notify({
        userId: moderator.profile.userId,
        category: 'SOCIAL',
        key: 'circleRequest',
        vars: { name: me.displayName, circle: circle.name },
        title: `${me.displayName} asked to join ${circle.name}`,
        href: `/circles/${circle.slug}`,
      });
    }

    return { joined: false, requestId: request.id, status: request.status };
  }

  async leave(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    const member = await this.membership(circle.id, me.id);

    if (!member) throw new NotFoundException('You are not in this circle');

    if (member.role === 'OWNER') {
      const otherOwners = await this.prisma.circleMember.count({
        where: { circleId: circle.id, role: 'OWNER', profileId: { not: me.id } },
      });

      if (otherOwners === 0) {
        throw new BadRequestException(
          'Promote another owner before leaving, or the circle would have nobody in charge',
        );
      }
    }

    await this.prisma.circleMember.delete({
      where: { circleId_profileId: { circleId: circle.id, profileId: me.id } },
    });

    const conversation = await this.prisma.conversation.findFirst({
      where: { circleId: circle.id },
      select: { id: true },
    });

    if (conversation) {
      await this.prisma.conversationParticipant.updateMany({
        where: { conversationId: conversation.id, profileId: me.id },
        data: { leftAt: new Date() },
      });
    }

    return { left: true };
  }

  async decideRequest(userId: string, requestId: string, approve: boolean) {
    const me = await this.people.profileFor(userId);

    const request = await this.prisma.circleJoinRequest.findUnique({
      where: { id: requestId },
      include: { circle: true, profile: { select: { userId: true, displayName: true } } },
    });

    if (!request || request.status !== 'PENDING') {
      throw new NotFoundException('Request not found');
    }

    await this.requireRole(request.circleId, me.id, 'MODERATOR');

    await this.prisma.circleJoinRequest.update({
      where: { id: requestId },
      data: { status: approve ? 'APPROVED' : 'DECLINED', decidedAt: new Date() },
    });

    if (approve) {
      await this.prisma.circleMember.upsert({
        where: { circleId_profileId: { circleId: request.circleId, profileId: request.profileId } },
        create: { circleId: request.circleId, profileId: request.profileId, role: 'MEMBER' },
        update: {},
      });

      const conversation = await this.prisma.conversation.findFirst({
        where: { circleId: request.circleId },
        select: { id: true },
      });

      if (conversation) {
        await this.prisma.conversationParticipant.upsert({
          where: {
            conversationId_profileId: {
              conversationId: conversation.id,
              profileId: request.profileId,
            },
          },
          create: { conversationId: conversation.id, profileId: request.profileId },
          update: { leftAt: null },
        });
      }

      await this.notifications.notify({
        userId: request.profile.userId,
        category: 'SOCIAL',
        key: 'circleJoined',
        vars: { circle: request.circle.name },
        title: `You are in ${request.circle.name}`,
        href: `/circles/${request.circle.slug}`,
      });
    }

    return { status: approve ? 'APPROVED' : 'DECLINED' };
  }

  async pendingRequests(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    await this.requireRole(circle.id, me.id, 'MODERATOR');

    const requests = await this.prisma.circleJoinRequest.findMany({
      where: { circleId: circle.id, status: 'PENDING' },
      include: {
        profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return requests.map((request) => ({
      id: request.id,
      message: request.message,
      createdAt: request.createdAt,
      profile: request.profile,
    }));
  }

  async setRole(userId: string, slug: string, targetUsername: string, role: CircleRole) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    const actor = await this.requireRole(circle.id, me.id, 'ADMIN');

    const target = await this.prisma.profile.findUnique({
      where: { username: targetUsername.toLowerCase() },
      select: { id: true },
    });

    if (!target) throw new NotFoundException('No such profile');

    const member = await this.membership(circle.id, target.id);

    if (!member) throw new NotFoundException('That person is not in this circle');

    if (RANK[role] >= RANK[actor.role] && actor.role !== 'OWNER') {
      throw new ForbiddenException('You cannot promote someone to your own level');
    }

    if (member.role === 'OWNER' && actor.role !== 'OWNER') {
      throw new ForbiddenException('Only an owner can change another owner');
    }

    await this.prisma.circleMember.update({
      where: { circleId_profileId: { circleId: circle.id, profileId: target.id } },
      data: { role },
    });

    await this.audit.record({
      action: 'circle.role.changed',
      actorUserId: userId,
      entityType: 'Circle',
      entityId: circle.id,
      metadata: { target: targetUsername, role },
    });

    return { role };
  }

  async removeMember(userId: string, slug: string, targetUsername: string) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    const actor = await this.requireRole(circle.id, me.id, 'MODERATOR');

    const target = await this.prisma.profile.findUnique({
      where: { username: targetUsername.toLowerCase() },
      select: { id: true },
    });

    if (!target) throw new NotFoundException('No such profile');

    const member = await this.membership(circle.id, target.id);

    if (!member) throw new NotFoundException('That person is not in this circle');

    if (RANK[member.role] >= RANK[actor.role]) {
      throw new ForbiddenException('You cannot remove someone at or above your own level');
    }

    await this.prisma.circleMember.delete({
      where: { circleId_profileId: { circleId: circle.id, profileId: target.id } },
    });

    await this.audit.record({
      action: 'circle.member.removed',
      actorUserId: userId,
      entityType: 'Circle',
      entityId: circle.id,
      metadata: { target: targetUsername },
    });

    return { removed: true };
  }

  async posts(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    const member = await this.membership(circle.id, me.id);

    if (circle.visibility !== 'PUBLIC' && !member) {
      throw new ForbiddenException('Join this circle to see its posts');
    }

    const posts = await this.prisma.post.findMany({
      where: { circleId: circle.id, deletedAt: null },
      include: {
        profile: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, occupation: true },
        },
        reactions: { select: { profileId: true, type: true } },
        saves: { select: { profileId: true } },
        pollOptions: { orderBy: { sortOrder: 'asc' }, include: { votes: { select: { profileId: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    return posts.map((post) => {
      const totalVotes = post.pollOptions.reduce((total, option) => total + option.votes.length, 0);

      return {
        id: post.id,
        kind: post.kind,
        visibility: post.visibility,
        body: post.body,
        imageUrl: post.imageUrl,
        linkUrl: post.linkUrl,
        createdAt: post.createdAt,
        author: post.profile,
        isOwn: post.profileId === me.id,
        reactions: {
          total: post.reactions.length,
          counts: post.reactions.reduce<Record<string, number>>((counts, reaction) => {
            counts[reaction.type] = (counts[reaction.type] ?? 0) + 1;
            return counts;
          }, {}),
          mine: post.reactions.find((reaction) => reaction.profileId === me.id)?.type ?? null,
        },
        comments: post._count.comments,
        saved: post.saves.some((save) => save.profileId === me.id),
        poll:
          post.pollOptions.length > 0
            ? {
                totalVotes,
                votedFor:
                  post.pollOptions.find((option) =>
                    option.votes.some((vote) => vote.profileId === me.id),
                  )?.id ?? null,
                options: post.pollOptions.map((option) => ({
                  id: option.id,
                  label: option.label,
                  votes: option.votes.length,
                  share: totalVotes === 0 ? 0 : Math.round((option.votes.length / totalVotes) * 100),
                })),
              }
            : null,
      };
    });
  }

  async post(
    userId: string,
    slug: string,
    input: { body: string; kind?: 'TEXT' | 'POLL' | 'ANNOUNCEMENT'; pollOptions?: string[] },
  ) {
    const me = await this.people.profileFor(userId);
    const circle = await this.circleBySlug(slug);
    const member = await this.membership(circle.id, me.id);

    if (!member) throw new ForbiddenException('Join this circle before posting in it');

    if (input.kind === 'ANNOUNCEMENT' && RANK[member.role] < RANK.MODERATOR) {
      throw new ForbiddenException('Only moderators can post announcements');
    }

    const options = (input.pollOptions ?? []).map((label) => label.trim()).filter(Boolean);

    if (input.kind === 'POLL' && options.length < 2) {
      throw new BadRequestException('A poll needs at least two options');
    }

    const post = await this.prisma.post.create({
      data: {
        profileId: me.id,
        circleId: circle.id,
        body: input.body,
        kind: input.kind ?? (options.length >= 2 ? 'POLL' : 'TEXT'),
        visibility: circle.visibility === 'PUBLIC' ? 'PUBLIC' : 'FRIENDS',
        pollOptions:
          options.length >= 2
            ? { create: options.map((label, index) => ({ label, sortOrder: index })) }
            : undefined,
      },
    });

    return { id: post.id };
  }

  async removePost(userId: string, postId: string) {
    const me = await this.people.profileFor(userId);

    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, profileId: true, circleId: true },
    });

    if (!post) throw new NotFoundException('Post not found');

    const isAuthor = post.profileId === me.id;

    if (!isAuthor) {
      if (!post.circleId) throw new NotFoundException('Post not found');
      await this.requireRole(post.circleId, me.id, 'MODERATOR');
    }

    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });

    if (!isAuthor) {
      await this.audit.record({
        action: 'circle.post.removed',
        actorUserId: userId,
        entityType: 'Post',
        entityId: postId,
      });
    }

    return { deleted: true };
  }
}
