import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { NotificationCategory } from '@nexus/db';
import { PrismaService } from '../prisma/prisma.service.js';

export type NotifyInput = {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  href?: string;
  key?: string;
  vars?: Record<string, string | number>;
  dedupeKey?: string;
};

const CHANNEL_FIELD: Record<NotificationCategory, string> = {
  IMPORTANT: 'importantInApp',
  SOCIAL: 'socialInApp',
  EVENTS: 'eventsInApp',
  LEARNING: 'learningInApp',
  GOALS: 'goalsInApp',
  DISCOVER: 'discoverInApp',
  SYSTEM: 'systemInApp',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async preferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(userId: string, data: Record<string, boolean>) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async notify(input: NotifyInput) {
    try {
      const preferences = await this.preferences(input.userId);
      const field = CHANNEL_FIELD[input.category];

      if (preferences[field as keyof typeof preferences] === false) {
        return null;
      }

      return await this.prisma.notification.create({
        data: {
          userId: input.userId,
          category: input.category,
          title: input.title,
          body: input.body,
          href: input.href,
          key: input.key,
          vars: input.vars,
          dedupeKey: input.dedupeKey,
        },
      });
    } catch (error) {
      if (input.dedupeKey && (error as { code?: string }).code === 'P2002') return null;
      this.logger.error(`Failed to create notification "${input.title}"`, error as Error);
      return null;
    }
  }

  async list(userId: string, options: { category?: NotificationCategory; unreadOnly?: boolean } = {}) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        category: options.category,
        readAt: options.unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });

    const grouped = new Map<NotificationCategory, typeof notifications>();

    for (const notification of notifications) {
      const bucket = grouped.get(notification.category) ?? [];
      bucket.push(notification);
      grouped.set(notification.category, bucket);
    }

    return {
      unread,
      total: notifications.length,
      notifications,
      groups: [...grouped.entries()].map(([category, items]) => ({ category, items })),
    };
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { unread };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });

    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });

    return { read: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { marked: result.count };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({ where: { id, userId } });

    if (result.count === 0) throw new NotFoundException('Notification not found');

    return { deleted: true };
  }
}
