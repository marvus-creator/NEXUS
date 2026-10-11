import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PeopleService } from '../people/people.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type SentMessage = {
  id: string;
  conversationId: string;
  body: string;
  createdAt: Date;
  replyToId: string | null;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
    private readonly notifications: NotificationsService,
  ) {}

  private async participantOrThrow(conversationId: string, profileId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_profileId: { conversationId, profileId } },
    });

    if (!participant || participant.leftAt) {
      throw new ForbiddenException('You are not in this conversation');
    }

    return participant;
  }

  async conversationIdsFor(profileId: string) {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { profileId, leftAt: null },
      select: { conversationId: true },
    });

    return rows.map((row) => row.conversationId);
  }

  async list(userId: string) {
    const me = await this.people.profileFor(userId);

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { profileId: me.id, leftAt: null },
      include: {
        conversation: {
          include: {
            circle: { select: { slug: true, name: true } },
            participants: {
              where: { leftAt: null },
              include: {
                profile: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { profile: { select: { displayName: true } } },
            },
          },
        },
      },
    });

    const summaries = await Promise.all(
      participants.map(async (participant) => {
        const conversation = participant.conversation;
        const others = conversation.participants.filter((row) => row.profileId !== me.id);
        const last = conversation.messages[0];

        const unread = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            profileId: { not: me.id },
            deletedAt: null,
            createdAt: participant.lastReadAt ? { gt: participant.lastReadAt } : undefined,
          },
        });

        return {
          id: conversation.id,
          kind: conversation.kind,
          title:
            conversation.title ??
            (conversation.kind === 'DIRECT'
              ? (others[0]?.profile.displayName ?? 'Conversation')
              : 'Group'),
          circle: conversation.circle,
          participants: others.map((row) => row.profile),
          lastMessage: last
            ? {
                body: last.body,
                createdAt: last.createdAt,
                author: last.profile.displayName,
              }
            : null,
          lastMessageAt: conversation.lastMessageAt,
          unread,
        };
      }),
    );

    return summaries.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async unreadTotal(userId: string) {
    const conversations = await this.list(userId);
    return { unread: conversations.reduce((total, item) => total + item.unread, 0) };
  }

  async openDirect(userId: string, username: string) {
    const me = await this.people.profileFor(userId);

    const target = await this.prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
      include: { privacy: true, user: { select: { id: true, status: true } } },
    });

    if (!target || target.user.status === 'DEACTIVATED') {
      throw new NotFoundException('No such profile');
    }

    if (target.id === me.id) throw new BadRequestException('You cannot message yourself');

    const relationship = await this.people.relationship(me.id, target.id);

    if (relationship.hasBlocked || relationship.isBlockedBy) {
      throw new ForbiddenException('You cannot message this person');
    }

    const policy = target.privacy?.messagePolicy ?? 'EVERYONE';

    if (policy === 'NOBODY') {
      throw new ForbiddenException('This person is not accepting messages');
    }

    if (policy === 'FRIENDS' && !relationship.isFriend) {
      throw new ForbiddenException('This person only accepts messages from friends');
    }

    if (!relationship.isFriend) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { emailVerifiedAt: true },
      });

      if (!user.emailVerifiedAt) {
        throw new ForbiddenException('Confirm your email address before messaging people you are not friends with');
      }
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        kind: 'DIRECT',
        AND: [
          { participants: { some: { profileId: me.id } } },
          { participants: { some: { profileId: target.id } } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.conversationParticipant.updateMany({
        where: { conversationId: existing.id, profileId: { in: [me.id, target.id] } },
        data: { leftAt: null },
      });

      return { id: existing.id, created: false };
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        kind: 'DIRECT',
        participants: { create: [{ profileId: me.id }, { profileId: target.id }] },
      },
    });

    return { id: conversation.id, created: true };
  }

  async messages(userId: string, conversationId: string, before?: string) {
    const me = await this.people.profileFor(userId);
    await this.participantOrThrow(conversationId, me.id);

    const blocked = await this.people.blockedIdsFor(me.id);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        profileId: { notIn: blocked },
        createdAt: before ? { lt: new Date(before) } : undefined,
      },
      include: {
        profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: { select: { profileId: true, emoji: true } },
        replyTo: {
          select: { id: true, body: true, profile: { select: { displayName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return messages.reverse().map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      pinnedAt: message.pinnedAt,
      author: message.profile,
      isOwn: message.profileId === me.id,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            body: message.replyTo.body.slice(0, 120),
            author: message.replyTo.profile.displayName,
          }
        : null,
      reactions: message.reactions.reduce<Record<string, number>>((counts, reaction) => {
        counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
        return counts;
      }, {}),
    }));
  }

  async send(
    userId: string,
    conversationId: string,
    body: string,
    replyToId?: string,
  ): Promise<{ message: SentMessage; recipients: string[] }> {
    const me = await this.people.profileFor(userId);
    await this.participantOrThrow(conversationId, me.id);

    if (!body.trim()) throw new BadRequestException('A message cannot be empty');

    if (replyToId) {
      const parent = await this.prisma.message.findFirst({
        where: { id: replyToId, conversationId, deletedAt: null },
        select: { id: true },
      });

      if (!parent) throw new BadRequestException('That message no longer exists');
    }

    const created = await this.prisma.message.create({
      data: { conversationId, profileId: me.id, body: body.trim(), replyToId },
      include: {
        profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: created.createdAt },
    });

    await this.prisma.conversationParticipant.update({
      where: { conversationId_profileId: { conversationId, profileId: me.id } },
      data: { lastReadAt: created.createdAt },
    });

    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, leftAt: null, profileId: { not: me.id } },
      include: { profile: { select: { id: true, userId: true } } },
    });

    return {
      message: {
        id: created.id,
        conversationId,
        body: created.body,
        createdAt: created.createdAt,
        replyToId: created.replyToId,
        author: created.profile,
      },
      recipients: others.map((row) => row.profile.id),
    };
  }

  async notifyRecipients(conversationId: string, senderProfileId: string, preview: string) {
    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, leftAt: null, profileId: { not: senderProfileId } },
      include: { profile: { select: { userId: true } } },
    });

    const sender = await this.prisma.profile.findUniqueOrThrow({
      where: { id: senderProfileId },
      select: { displayName: true },
    });

    for (const other of others) {
      await this.notifications.notify({
        userId: other.profile.userId,
        category: 'SOCIAL',
        key: 'message',
        vars: { name: sender.displayName },
        title: `${sender.displayName} sent you a message`,
        body: preview.slice(0, 120),
        href: `/messages?c=${conversationId}`,
      });
    }
  }

  async markRead(userId: string, conversationId: string) {
    const me = await this.people.profileFor(userId);
    await this.participantOrThrow(conversationId, me.id);

    await this.prisma.conversationParticipant.update({
      where: { conversationId_profileId: { conversationId, profileId: me.id } },
      data: { lastReadAt: new Date() },
    });

    return { read: true };
  }

  async react(userId: string, messageId: string, emoji: string) {
    const me = await this.people.profileFor(userId);

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, deletedAt: null },
      select: { id: true, conversationId: true },
    });

    if (!message) throw new NotFoundException('Message not found');

    await this.participantOrThrow(message.conversationId, me.id);

    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_profileId_emoji: { messageId, profileId: me.id, emoji } },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({
        where: { messageId_profileId_emoji: { messageId, profileId: me.id, emoji } },
      });
    } else {
      await this.prisma.messageReaction.create({ data: { messageId, profileId: me.id, emoji } });
    }

    const reactions = await this.prisma.messageReaction.groupBy({
      by: ['emoji'],
      where: { messageId },
      _count: true,
    });

    return {
      messageId,
      conversationId: message.conversationId,
      reactions: Object.fromEntries(reactions.map((row) => [row.emoji, row._count])),
    };
  }

  async removeMessage(userId: string, messageId: string) {
    const me = await this.people.profileFor(userId);

    const result = await this.prisma.message.updateMany({
      where: { id: messageId, profileId: me.id, deletedAt: null },
      data: { deletedAt: new Date(), body: '' },
    });

    if (result.count === 0) throw new NotFoundException('Message not found');

    return { deleted: true };
  }

  async createGroup(userId: string, title: string, usernames: string[]) {
    const me = await this.people.profileFor(userId);

    const profiles = await this.prisma.profile.findMany({
      where: { username: { in: usernames.map((name) => name.toLowerCase()) } },
      select: { id: true },
    });

    if (profiles.length === 0) throw new BadRequestException('Add at least one other person');

    const conversation = await this.prisma.conversation.create({
      data: {
        kind: 'GROUP',
        title: title.trim(),
        participants: {
          create: [{ profileId: me.id }, ...profiles.map((profile) => ({ profileId: profile.id }))],
        },
      },
    });

    return { id: conversation.id };
  }
}
