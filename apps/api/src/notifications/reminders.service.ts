import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

const MINUTE = 60_000;
const EVENT_LEAD_FROM = 45 * MINUTE;
const EVENT_LEAD_TO = 75 * MINUTE;
const BLOCK_LEAD = 15 * MINUTE;

@Injectable()
export class RemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RemindersService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    const every = Number(process.env.NEXUS_REMINDER_MS ?? MINUTE);
    if (!Number.isFinite(every) || every <= 0) return;

    this.timer = setInterval(() => void this.tick(), every);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(now = new Date()) {
    if (this.running) return 0;
    this.running = true;

    try {
      return (await this.eventReminders(now)) + (await this.blockReminders(now));
    } catch (error) {
      this.logger.error('Reminder pass failed', error as Error);
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async eventReminders(now: Date) {
    const events = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        startAt: { gt: new Date(now.getTime() + EVENT_LEAD_FROM), lte: new Date(now.getTime() + EVENT_LEAD_TO) },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        startAt: true,
        host: { select: { userId: true } },
        attendees: { where: { status: 'GOING' }, select: { profile: { select: { userId: true } } } },
      },
      take: 200,
    });

    let sent = 0;

    for (const event of events) {
      const people = new Set([event.host.userId, ...event.attendees.map((row) => row.profile.userId)]);

      for (const userId of people) {
        const created = await this.notifications.notify({
          userId,
          category: 'EVENTS',
          key: 'eventSoon',
          vars: { event: event.title, at: event.startAt.toISOString() },
          title: `${event.title} starts in about an hour`,
          href: `/events/${event.slug}`,
          dedupeKey: `remind:event:${event.id}:${event.startAt.getTime()}:${userId}`,
        });
        if (created) sent += 1;
      }
    }

    return sent;
  }

  private async blockReminders(now: Date) {
    const blocks = await this.prisma.calendarEvent.findMany({
      where: {
        taskId: { not: null },
        startAt: { gt: now, lte: new Date(now.getTime() + BLOCK_LEAD) },
        task: { status: { in: ['TODO', 'DOING'] } },
      },
      select: {
        id: true,
        startAt: true,
        task: { select: { title: true } },
        profile: { select: { userId: true } },
      },
      take: 500,
    });

    let sent = 0;

    for (const block of blocks) {
      const created = await this.notifications.notify({
        userId: block.profile.userId,
        category: 'GOALS',
        key: 'blockSoon',
        vars: { task: block.task?.title ?? '', at: block.startAt.toISOString() },
        title: `Time for ${block.task?.title ?? 'your task'}`,
        href: '/tasks',
        dedupeKey: `remind:block:${block.id}:${block.startAt.getTime()}`,
      });
      if (created) sent += 1;
    }

    return sent;
  }
}
