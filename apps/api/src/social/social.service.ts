import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ReactionType } from '@nexus/db';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PeopleService } from '../people/people.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type FeedScope = 'for-you' | 'following' | 'friends' | 'saved' | 'mine';

const POST_INCLUDE = {
  profile: {
    select: { id: true, username: true, displayName: true, avatarUrl: true, occupation: true },
  },
  reactions: { select: { profileId: true, type: true } },
  saves: { select: { profileId: true } },
  pollOptions: {
    orderBy: { sortOrder: 'asc' },
    include: { votes: { select: { profileId: true } } },
  },
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
    private readonly notifications: NotificationsService,
  ) {}

  private shape(post: Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>, viewerId: string) {
    const reactionCounts = post.reactions.reduce<Record<string, number>>((counts, reaction) => {
      counts[reaction.type] = (counts[reaction.type] ?? 0) + 1;
      return counts;
    }, {});

    const mine = post.reactions.find((reaction) => reaction.profileId === viewerId);
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
      isOwn: post.profileId === viewerId,
      reactions: {
        total: post.reactions.length,
        counts: reactionCounts,
        mine: mine?.type ?? null,
      },
      comments: post._count.comments,
      saved: post.saves.some((save) => save.profileId === viewerId),
      poll:
        post.pollOptions.length > 0
          ? {
              totalVotes,
              votedFor:
                post.pollOptions.find((option) =>
                  option.votes.some((vote) => vote.profileId === viewerId),
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
  }

  private async visibilityFilter(profileId: string, friendIds: string[], blockedIds: string[]) {
    return {
      deletedAt: null,
      profileId: { notIn: blockedIds },
      OR: [
        { profileId },
        { visibility: 'PUBLIC' as const },
        { visibility: 'FRIENDS' as const, profileId: { in: friendIds } },
      ],
    } satisfies Prisma.PostWhereInput;
  }

  async feed(userId: string, scope: FeedScope = 'for-you', limit = 30) {
    const me = await this.people.profileFor(userId);

    const [friendIds, blockedIds, following, myInterests] = await Promise.all([
      this.people.friendIdsOf(me.id),
      this.people.blockedIdsFor(me.id),
      this.prisma.follow.findMany({ where: { followerId: me.id }, select: { followingId: true } }),
      this.prisma.profileInterest.findMany({
        where: { profileId: me.id },
        select: { interestId: true },
      }),
    ]);

    const followingIds = following.map((row) => row.followingId);
    const base = await this.visibilityFilter(me.id, friendIds, blockedIds);

    let where: Prisma.PostWhereInput = base;

    if (scope === 'following') {
      where = { AND: [base, { profileId: { in: [...followingIds, ...friendIds, me.id] } }] };
    }

    if (scope === 'friends') {
      where = { AND: [base, { profileId: { in: friendIds } }] };
    }

    if (scope === 'mine') {
      where = { AND: [base, { profileId: me.id }] };
    }

    if (scope === 'saved') {
      where = { AND: [base, { saves: { some: { profileId: me.id } } }] };
    }

    const posts = await this.prisma.post.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: scope === 'for-you' ? 120 : limit,
    });

    const shaped = posts.map((post) => this.shape(post, me.id));

    if (scope !== 'for-you') return shaped;

    const interestIds = myInterests.map((row) => row.interestId);

    const authorInterests = await this.prisma.profileInterest.findMany({
      where: { profileId: { in: [...new Set(posts.map((post) => post.profileId))] } },
      select: { profileId: true, interestId: true },
    });

    const overlapByAuthor = new Map<string, number>();

    for (const link of authorInterests) {
      if (!interestIds.includes(link.interestId)) continue;
      overlapByAuthor.set(link.profileId, (overlapByAuthor.get(link.profileId) ?? 0) + 1);
    }

    const now = Date.now();

    return shaped
      .map((post) => {
        const ageHours = (now - new Date(post.createdAt).getTime()) / 3600000;
        const connection = friendIds.includes(post.author.id)
          ? 12
          : followingIds.includes(post.author.id)
            ? 8
            : 0;
        const overlap = overlapByAuthor.get(post.author.id) ?? 0;
        const engagement = Math.min(post.reactions.total + post.comments, 20);

        return {
          post,
          score: connection + overlap * 3 + engagement * 0.5 - ageHours * 0.35,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.post);
  }

  async postsByUsername(userId: string, username: string, limit = 20) {
    const me = await this.people.profileFor(userId);

    const target = await this.prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    if (!target) throw new NotFoundException('No such profile');

    const [friendIds, blockedIds] = await Promise.all([
      this.people.friendIdsOf(me.id),
      this.people.blockedIdsFor(me.id),
    ]);

    if (blockedIds.includes(target.id)) {
      throw new ForbiddenException('You cannot see these posts');
    }

    const base = await this.visibilityFilter(me.id, friendIds, blockedIds);

    const posts = await this.prisma.post.findMany({
      where: { AND: [base, { profileId: target.id }] },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return posts.map((post) => this.shape(post, me.id));
  }

  async create(
    userId: string,
    input: {
      body: string;
      kind?: 'TEXT' | 'IMAGE' | 'POLL' | 'PROJECT' | 'ACHIEVEMENT' | 'ANNOUNCEMENT';
      visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
      imageUrl?: string;
      linkUrl?: string;
      pollOptions?: string[];
    },
  ) {
    const me = await this.people.profileFor(userId);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });

    if (!user.emailVerifiedAt && (input.visibility ?? 'PUBLIC') === 'PUBLIC') {
      throw new ForbiddenException('Confirm your email address before posting publicly');
    }

    const options = (input.pollOptions ?? []).map((label) => label.trim()).filter(Boolean);

    if (input.kind === 'POLL' && options.length < 2) {
      throw new BadRequestException('A poll needs at least two options');
    }

    const post = await this.prisma.post.create({
      data: {
        profileId: me.id,
        body: input.body,
        kind: input.kind ?? (options.length >= 2 ? 'POLL' : 'TEXT'),
        visibility: input.visibility ?? 'PUBLIC',
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl,
        pollOptions:
          options.length >= 2
            ? { create: options.map((label, index) => ({ label, sortOrder: index })) }
            : undefined,
      },
      include: POST_INCLUDE,
    });

    return this.shape(post, me.id);
  }

  async remove(userId: string, postId: string) {
    const me = await this.people.profileFor(userId);

    const result = await this.prisma.post.updateMany({
      where: { id: postId, profileId: me.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) throw new NotFoundException('Post not found');

    return { deleted: true };
  }

  private async readablePost(viewerProfileId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { profile: { include: { user: { select: { id: true } } } } },
    });

    if (!post) throw new NotFoundException('Post not found');

    const [friendIds, blockedIds] = await Promise.all([
      this.people.friendIdsOf(viewerProfileId),
      this.people.blockedIdsFor(viewerProfileId),
    ]);

    if (blockedIds.includes(post.profileId)) {
      throw new ForbiddenException('You cannot interact with this post');
    }

    const isOwn = post.profileId === viewerProfileId;
    const visible =
      isOwn ||
      post.visibility === 'PUBLIC' ||
      (post.visibility === 'FRIENDS' && friendIds.includes(post.profileId));

    if (!visible) throw new ForbiddenException('You cannot see this post');

    return post;
  }

  async react(userId: string, postId: string, type: ReactionType | null) {
    const me = await this.people.profileFor(userId);
    const post = await this.readablePost(me.id, postId);

    if (type === null) {
      await this.prisma.postReaction.deleteMany({ where: { postId, profileId: me.id } });
    } else {
      await this.prisma.postReaction.upsert({
        where: { postId_profileId: { postId, profileId: me.id } },
        create: { postId, profileId: me.id, type },
        update: { type },
      });

      if (post.profileId !== me.id) {
        await this.notifications.notify({
          userId: post.profile.user.id,
          category: 'SOCIAL',
          title: `${me.displayName} reacted to your post`,
          href: '/feed',
        });
      }
    }

    const counts = await this.prisma.postReaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: true,
    });

    return {
      total: counts.reduce((sum, row) => sum + row._count, 0),
      counts: Object.fromEntries(counts.map((row) => [row.type, row._count])),
      mine: type,
    };
  }

  async toggleSave(userId: string, postId: string, saved: boolean) {
    const me = await this.people.profileFor(userId);
    await this.readablePost(me.id, postId);

    if (saved) {
      await this.prisma.postSave.upsert({
        where: { postId_profileId: { postId, profileId: me.id } },
        create: { postId, profileId: me.id },
        update: {},
      });
    } else {
      await this.prisma.postSave.deleteMany({ where: { postId, profileId: me.id } });
    }

    return { saved };
  }

  async votePoll(userId: string, optionId: string) {
    const me = await this.people.profileFor(userId);

    const option = await this.prisma.pollOption.findUnique({
      where: { id: optionId },
      select: { id: true, postId: true },
    });

    if (!option) throw new NotFoundException('Poll option not found');

    await this.readablePost(me.id, option.postId);

    const siblings = await this.prisma.pollOption.findMany({
      where: { postId: option.postId },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.pollVote.deleteMany({
        where: { profileId: me.id, optionId: { in: siblings.map((item) => item.id) } },
      }),
      this.prisma.pollVote.create({ data: { optionId, profileId: me.id } }),
    ]);

    const post = await this.prisma.post.findUniqueOrThrow({
      where: { id: option.postId },
      include: POST_INCLUDE,
    });

    return this.shape(post, me.id).poll;
  }

  async comments(userId: string, postId: string) {
    const me = await this.people.profileFor(userId);
    await this.readablePost(me.id, postId);

    const blockedIds = await this.people.blockedIdsFor(me.id);

    const comments = await this.prisma.comment.findMany({
      where: { postId, deletedAt: null, profileId: { notIn: blockedIds } },
      include: {
        profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      author: comment.profile,
      isOwn: comment.profileId === me.id,
    }));
  }

  async comment(userId: string, postId: string, body: string, parentId?: string) {
    const me = await this.people.profileFor(userId);
    const post = await this.readablePost(me.id, postId);

    if (parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: parentId, postId, deletedAt: null },
        select: { id: true },
      });

      if (!parent) throw new BadRequestException('That comment no longer exists');
    }

    const comment = await this.prisma.comment.create({
      data: { postId, profileId: me.id, body, parentId },
      include: {
        profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    if (post.profileId !== me.id) {
      await this.notifications.notify({
        userId: post.profile.user.id,
        category: 'SOCIAL',
        title: `${me.displayName} commented on your post`,
        body: body.slice(0, 120),
        href: '/feed',
      });
    }

    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      author: comment.profile,
      isOwn: true,
    };
  }

  async removeComment(userId: string, commentId: string) {
    const me = await this.people.profileFor(userId);

    const result = await this.prisma.comment.updateMany({
      where: { id: commentId, profileId: me.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) throw new NotFoundException('Comment not found');

    return { deleted: true };
  }
}
