import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@nexus/db';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type RelationshipState = {
  isSelf: boolean;
  isFriend: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  hasBlocked: boolean;
  isBlockedBy: boolean;
  outgoingRequestId: string | null;
  incomingRequestId: string | null;
  mutualFriends: number;
};

function orderedPair(a: string, b: string) {
  return a < b ? { profileAId: a, profileBId: b } : { profileAId: b, profileBId: a };
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, username: true, displayName: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async profileByUsername(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
      include: { user: { select: { id: true, status: true } } },
    });

    if (!profile || profile.user.status === 'DEACTIVATED') {
      throw new NotFoundException('No such profile');
    }

    return profile;
  }

  async friendIdsOf(profileId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { OR: [{ profileAId: profileId }, { profileBId: profileId }] },
      select: { profileAId: true, profileBId: true },
    });

    return friendships.map((friendship) =>
      friendship.profileAId === profileId ? friendship.profileBId : friendship.profileAId,
    );
  }

  async blockedIdsFor(profileId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: profileId }, { blockedId: profileId }] },
      select: { blockerId: true, blockedId: true },
    });

    return [
      ...new Set(
        blocks.map((block) => (block.blockerId === profileId ? block.blockedId : block.blockerId)),
      ),
    ];
  }

  async relationship(viewerProfileId: string, targetProfileId: string): Promise<RelationshipState> {
    if (viewerProfileId === targetProfileId) {
      return {
        isSelf: true,
        isFriend: false,
        isFollowing: false,
        isFollowedBy: false,
        hasBlocked: false,
        isBlockedBy: false,
        outgoingRequestId: null,
        incomingRequestId: null,
        mutualFriends: 0,
      };
    }

    const pair = orderedPair(viewerProfileId, targetProfileId);

    const [friendship, following, followedBy, blocked, blockedBy, outgoing, incoming] =
      await Promise.all([
        this.prisma.friendship.findUnique({
          where: { profileAId_profileBId: pair },
          select: { id: true },
        }),
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: viewerProfileId, followingId: targetProfileId },
          },
          select: { followerId: true },
        }),
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: targetProfileId, followingId: viewerProfileId },
          },
          select: { followerId: true },
        }),
        this.prisma.block.findUnique({
          where: { blockerId_blockedId: { blockerId: viewerProfileId, blockedId: targetProfileId } },
          select: { blockerId: true },
        }),
        this.prisma.block.findUnique({
          where: { blockerId_blockedId: { blockerId: targetProfileId, blockedId: viewerProfileId } },
          select: { blockerId: true },
        }),
        this.prisma.friendRequest.findFirst({
          where: { fromProfileId: viewerProfileId, toProfileId: targetProfileId, status: 'PENDING' },
          select: { id: true },
        }),
        this.prisma.friendRequest.findFirst({
          where: { fromProfileId: targetProfileId, toProfileId: viewerProfileId, status: 'PENDING' },
          select: { id: true },
        }),
      ]);

    const [viewerFriends, targetFriends] = await Promise.all([
      this.friendIdsOf(viewerProfileId),
      this.friendIdsOf(targetProfileId),
    ]);

    const mutualFriends = viewerFriends.filter((id) => targetFriends.includes(id)).length;

    return {
      isSelf: false,
      isFriend: Boolean(friendship),
      isFollowing: Boolean(following),
      isFollowedBy: Boolean(followedBy),
      hasBlocked: Boolean(blocked),
      isBlockedBy: Boolean(blockedBy),
      outgoingRequestId: outgoing?.id ?? null,
      incomingRequestId: incoming?.id ?? null,
      mutualFriends,
    };
  }

  async relationshipByUsername(userId: string, username: string) {
    const me = await this.profileFor(userId);
    const target = await this.profileByUsername(username);
    const state = await this.relationship(me.id, target.id);

    return { ...state, profileId: target.id, username: target.username };
  }

  async search(userId: string, query: string, limit = 20) {
    const me = await this.profileFor(userId);
    const blocked = await this.blockedIdsFor(me.id);
    const term = query.trim();

    if (term.length < 2) return [];

    const profiles = await this.prisma.profile.findMany({
      where: {
        id: { notIn: [me.id, ...blocked] },
        user: { deletedAt: null, status: { not: 'DEACTIVATED' } },
        privacy: { is: { profileVisibility: { not: 'PRIVATE' } } },
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { displayName: { contains: term, mode: 'insensitive' } },
          { occupation: { contains: term, mode: 'insensitive' } },
          { city: { contains: term, mode: 'insensitive' } },
          { skills: { hasSome: [term.toLowerCase()] } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        occupation: true,
        city: true,
        userType: true,
      },
      take: limit,
    });

    const myFriends = await this.friendIdsOf(me.id);

    return Promise.all(
      profiles.map(async (profile) => {
        const theirFriends = await this.friendIdsOf(profile.id);

        return {
          ...profile,
          mutualFriends: myFriends.filter((id) => theirFriends.includes(id)).length,
        };
      }),
    );
  }

  async suggestions(userId: string, limit = 12) {
    const me = await this.prisma.profile.findUnique({
      where: { userId },
      include: { interests: { select: { interestId: true } } },
    });

    if (!me) throw new NotFoundException('Profile not found');

    const [friends, blocked, pending] = await Promise.all([
      this.friendIdsOf(me.id),
      this.blockedIdsFor(me.id),
      this.prisma.friendRequest.findMany({
        where: {
          status: 'PENDING',
          OR: [{ fromProfileId: me.id }, { toProfileId: me.id }],
        },
        select: { fromProfileId: true, toProfileId: true },
      }),
    ]);

    const pendingIds = pending.flatMap((request) => [request.fromProfileId, request.toProfileId]);
    const exclude = [...new Set([me.id, ...friends, ...blocked, ...pendingIds])];
    const myInterestIds = me.interests.map((link) => link.interestId);

    const candidates = await this.prisma.profile.findMany({
      where: {
        id: { notIn: exclude },
        user: { deletedAt: null, status: { not: 'DEACTIVATED' } },
        privacy: { is: { profileVisibility: 'PUBLIC', showInPeopleYouKnow: true } },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        occupation: true,
        city: true,
        userType: true,
        interests: { select: { interestId: true } },
      },
      take: 120,
    });

    const scored = await Promise.all(
      candidates.map(async (candidate) => {
        const theirFriends = await this.friendIdsOf(candidate.id);
        const mutualFriends = friends.filter((id) => theirFriends.includes(id)).length;

        const sharedInterests = candidate.interests.filter((link) =>
          myInterestIds.includes(link.interestId),
        ).length;

        const sameCity = Boolean(me.city && candidate.city && me.city === candidate.city);

        const reasons: string[] = [];
        if (mutualFriends > 0)
          reasons.push(`${mutualFriends} mutual ${mutualFriends === 1 ? 'friend' : 'friends'}`);
        if (sharedInterests > 0)
          reasons.push(`${sharedInterests} shared ${sharedInterests === 1 ? 'interest' : 'interests'}`);
        if (sameCity) reasons.push(`also in ${candidate.city}`);

        return {
          id: candidate.id,
          username: candidate.username,
          displayName: candidate.displayName,
          avatarUrl: candidate.avatarUrl,
          occupation: candidate.occupation,
          city: candidate.city,
          userType: candidate.userType,
          mutualFriends,
          sharedInterests,
          score: mutualFriends * 10 + sharedInterests * 3 + (sameCity ? 2 : 0),
          reasons,
        };
      }),
    );

    return scored
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async follow(userId: string, username: string) {
    const me = await this.profileFor(userId);
    const target = await this.profileByUsername(username);

    if (target.id === me.id) throw new BadRequestException('You cannot follow yourself');

    const relationship = await this.relationship(me.id, target.id);

    if (relationship.hasBlocked || relationship.isBlockedBy) {
      throw new ForbiddenException('You cannot follow this person');
    }

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: me.id, followingId: target.id } },
      create: { followerId: me.id, followingId: target.id },
      update: {},
    });

    await this.notifications.notify({
      userId: target.userId,
      category: 'SOCIAL',
      key: 'follow',
      vars: { name: me.displayName },
      title: `${me.displayName} started following you`,
      href: `/u/${me.username}`,
    });

    return { following: true };
  }

  async unfollow(userId: string, username: string) {
    const me = await this.profileFor(userId);
    const target = await this.profileByUsername(username);

    await this.prisma.follow.deleteMany({
      where: { followerId: me.id, followingId: target.id },
    });

    return { following: false };
  }

  async sendFriendRequest(userId: string, username: string, message?: string) {
    const me = await this.profileFor(userId);
    const target = await this.profileByUsername(username);

    if (target.id === me.id) throw new BadRequestException('You cannot befriend yourself');

    const relationship = await this.relationship(me.id, target.id);

    if (relationship.hasBlocked || relationship.isBlockedBy) {
      throw new ForbiddenException('You cannot send a request to this person');
    }

    if (relationship.isFriend) throw new BadRequestException('You are already friends');

    const privacy = await this.prisma.privacySettings.findUnique({
      where: { profileId: target.id },
    });

    if (privacy && !privacy.allowFriendRequests) {
      throw new ForbiddenException('This person is not accepting friend requests');
    }

    if (relationship.incomingRequestId) {
      return this.respondToRequest(userId, relationship.incomingRequestId, 'ACCEPTED');
    }

    const request = await this.prisma.friendRequest.upsert({
      where: { fromProfileId_toProfileId: { fromProfileId: me.id, toProfileId: target.id } },
      create: { fromProfileId: me.id, toProfileId: target.id, message, status: 'PENDING' },
      update: { status: 'PENDING', message, respondedAt: null, createdAt: new Date() },
    });

    await this.notifications.notify({
      userId: target.userId,
      category: 'SOCIAL',
      key: 'friendRequest',
      vars: { name: me.displayName },
      title: `${me.displayName} sent you a friend request`,
      body: message ?? undefined,
      href: '/people',
    });

    return { requestId: request.id, status: request.status };
  }

  async respondToRequest(userId: string, requestId: string, decision: 'ACCEPTED' | 'DECLINED') {
    const me = await this.profileFor(userId);

    const request = await this.prisma.friendRequest.findFirst({
      where: { id: requestId, toProfileId: me.id, status: 'PENDING' },
      include: { from: { include: { user: { select: { id: true } } } } },
    });

    if (!request) throw new NotFoundException('Friend request not found');

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: decision, respondedAt: new Date() },
    });

    if (decision === 'ACCEPTED') {
      const pair = orderedPair(request.fromProfileId, request.toProfileId);

      await this.prisma.friendship.upsert({
        where: { profileAId_profileBId: pair },
        create: pair,
        update: {},
      });

      await this.notifications.notify({
        userId: request.from.user.id,
        category: 'SOCIAL',
        key: 'friendAccepted',
        vars: { name: me.displayName },
        title: `${me.displayName} accepted your friend request`,
        href: `/u/${me.username}`,
      });

      await this.audit.record({
        action: 'social.friendship.created',
        actorUserId: userId,
        entityType: 'Friendship',
        entityId: requestId,
      });
    }

    return { status: decision };
  }

  async cancelRequest(userId: string, requestId: string) {
    const me = await this.profileFor(userId);

    const result = await this.prisma.friendRequest.updateMany({
      where: { id: requestId, fromProfileId: me.id, status: 'PENDING' },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    });

    if (result.count === 0) throw new NotFoundException('Friend request not found');

    return { cancelled: true };
  }

  async removeFriend(userId: string, username: string) {
    const me = await this.profileFor(userId);
    const target = await this.profileByUsername(username);
    const pair = orderedPair(me.id, target.id);

    const result = await this.prisma.friendship.deleteMany({ where: pair });

    if (result.count === 0) throw new NotFoundException('You are not friends');

    await this.prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { fromProfileId: me.id, toProfileId: target.id },
          { fromProfileId: target.id, toProfileId: me.id },
        ],
      },
    });

    return { removed: true };
  }

  async block(userId: string, username: string) {
    const me = await this.profileFor(userId);
    const target = await this.profileByUsername(username);

    if (target.id === me.id) throw new BadRequestException('You cannot block yourself');

    const pair = orderedPair(me.id, target.id);

    await this.prisma.$transaction([
      this.prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: me.id, blockedId: target.id } },
        create: { blockerId: me.id, blockedId: target.id },
        update: {},
      }),
      this.prisma.friendship.deleteMany({ where: pair }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: me.id, followingId: target.id },
            { followerId: target.id, followingId: me.id },
          ],
        },
      }),
      this.prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { fromProfileId: me.id, toProfileId: target.id },
            { fromProfileId: target.id, toProfileId: me.id },
          ],
        },
      }),
    ]);

    await this.audit.record({
      action: 'social.block.created',
      actorUserId: userId,
      entityType: 'Profile',
      entityId: target.id,
    });

    return { blocked: true };
  }

  async unblock(userId: string, username: string) {
    const me = await this.profileFor(userId);
    const target = await this.profileByUsername(username);

    await this.prisma.block.deleteMany({ where: { blockerId: me.id, blockedId: target.id } });

    return { blocked: false };
  }

  async report(
    userId: string,
    input: { targetType: 'PROFILE' | 'POST' | 'COMMENT'; targetId: string; reason: string; details?: string },
  ) {
    const me = await this.profileFor(userId);

    if (input.targetType === 'PROFILE' && input.targetId === me.id) {
      throw new BadRequestException('You cannot report yourself');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId: me.id,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details,
      },
    });

    await this.audit.record({
      action: 'social.report.created',
      actorUserId: userId,
      entityType: input.targetType,
      entityId: input.targetId,
      metadata: { reason: input.reason },
    });

    return { reportId: report.id, status: report.status };
  }

  async connections(userId: string) {
    const me = await this.profileFor(userId);

    const select = {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      occupation: true,
      city: true,
    } satisfies Prisma.ProfileSelect;

    const friendIds = await this.friendIdsOf(me.id);

    const [friends, following, followers, incoming, outgoing, blocked] = await Promise.all([
      this.prisma.profile.findMany({ where: { id: { in: friendIds } }, select }),
      this.prisma.follow.findMany({
        where: { followerId: me.id },
        select: { following: { select } },
      }),
      this.prisma.follow.findMany({
        where: { followingId: me.id },
        select: { follower: { select } },
      }),
      this.prisma.friendRequest.findMany({
        where: { toProfileId: me.id, status: 'PENDING' },
        select: { id: true, message: true, createdAt: true, from: { select } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendRequest.findMany({
        where: { fromProfileId: me.id, status: 'PENDING' },
        select: { id: true, createdAt: true, to: { select } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.block.findMany({
        where: { blockerId: me.id },
        select: { blocked: { select } },
      }),
    ]);

    return {
      friends,
      following: following.map((row) => row.following),
      followers: followers.map((row) => row.follower),
      incomingRequests: incoming,
      outgoingRequests: outgoing,
      blocked: blocked.map((row) => row.blocked),
    };
  }
}
