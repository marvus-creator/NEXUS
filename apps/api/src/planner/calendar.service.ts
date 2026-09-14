import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateEventDto, UpdateEventDto } from './dto/calendar.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const MIN_GAP = 30;

export type LocalParts = {
  dateKey: string;
  dayOfWeek: number;
  minutes: number;
};

export function localParts(date: Date, timezone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  const hour = Number(parts.hour === '24' ? '0' : parts.hour);
  const minute = Number(parts.minute);

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(String(parts.weekday)),
    minutes: hour * 60 + minute,
  };
}

type Span = { startMinute: number; endMinute: number };

function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.startMinute - b.startMinute);
  const merged: Span[] = [];

  for (const span of sorted) {
    const last = merged[merged.length - 1];

    if (last && span.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, span.endMinute);
    } else {
      merged.push({ ...span });
    }
  }

  return merged;
}

export function gapsAround(busy: Span[]): (Span & { minutes: number })[] {
  const merged = mergeSpans(busy);
  const gaps: (Span & { minutes: number })[] = [];
  let cursor = DAY_START;

  for (const span of merged) {
    if (span.startMinute - cursor >= MIN_GAP) {
      gaps.push({
        startMinute: cursor,
        endMinute: span.startMinute,
        minutes: span.startMinute - cursor,
      });
    }

    cursor = Math.max(cursor, span.endMinute);
  }

  if (DAY_END - cursor >= MIN_GAP) {
    gaps.push({ startMinute: cursor, endMinute: DAY_END, minutes: DAY_END - cursor });
  }

  return gaps;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, timezone: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  async range(userId: string, fromIso: string, toIso: string) {
    const profile = await this.profileFor(userId);
    const from = new Date(fromIso);
    const to = new Date(toIso);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException('Give a valid from and to range');
    }

    if (to.getTime() - from.getTime() > 62 * DAY_MS) {
      throw new BadRequestException('Ranges are limited to about two months');
    }

    const [events, blocks, tasks] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: { profileId: profile.id, startAt: { gte: from, lt: to } },
        orderBy: { startAt: 'asc' },
        include: { task: { select: { id: true, title: true, status: true } } },
      }),
      this.prisma.scheduleBlock.findMany({ where: { profileId: profile.id } }),
      this.prisma.task.findMany({
        where: {
          profileId: profile.id,
          dueAt: { gte: from, lt: to },
          status: { in: ['TODO', 'DOING'] },
        },
        select: { id: true, title: true, dueAt: true, priority: true, status: true },
      }),
    ]);

    const days: {
      dateKey: string;
      dayOfWeek: number;
      fixed: { id: string; label: string; kind: string; startMinute: number; endMinute: number }[];
      events: {
        id: string;
        title: string;
        kind: string;
        startMinute: number;
        endMinute: number;
        startAt: string;
        endAt: string;
        location: string | null;
      }[];
      tasks: { id: string; title: string; minutes: number; priority: string }[];
      gaps: { startMinute: number; endMinute: number; minutes: number }[];
    }[] = [];

    for (let cursor = from.getTime(); cursor < to.getTime(); cursor += DAY_MS) {
      const parts = localParts(new Date(cursor), profile.timezone);

      const fixed = blocks
        .filter((block) => block.dayOfWeek === parts.dayOfWeek)
        .map((block) => ({
          id: block.id,
          label: block.label,
          kind: block.kind,
          startMinute: block.startMinute,
          endMinute: block.endMinute,
        }))
        .sort((a, b) => a.startMinute - b.startMinute);

      const dayEvents = events
        .filter((event) => localParts(event.startAt, profile.timezone).dateKey === parts.dateKey)
        .map((event) => {
          const start = localParts(event.startAt, profile.timezone);
          const end = localParts(event.endAt, profile.timezone);

          return {
            id: event.id,
            title: event.title,
            kind: event.kind,
            startMinute: start.minutes,
            endMinute: end.dateKey === start.dateKey ? end.minutes : DAY_END,
            startAt: event.startAt.toISOString(),
            endAt: event.endAt.toISOString(),
            location: event.location,
          };
        })
        .sort((a, b) => a.startMinute - b.startMinute);

      const dayTasks = tasks
        .filter((task) => task.dueAt && localParts(task.dueAt, profile.timezone).dateKey === parts.dateKey)
        .map((task) => ({
          id: task.id,
          title: task.title,
          minutes: localParts(task.dueAt!, profile.timezone).minutes,
          priority: task.priority,
        }));

      const busy = [
        ...fixed.map((block) => ({ startMinute: block.startMinute, endMinute: block.endMinute })),
        ...dayEvents.map((event) => ({ startMinute: event.startMinute, endMinute: event.endMinute })),
      ];

      days.push({
        dateKey: parts.dateKey,
        dayOfWeek: parts.dayOfWeek,
        fixed,
        events: dayEvents,
        tasks: dayTasks,
        gaps: gapsAround(busy),
      });
    }

    return { timezone: profile.timezone, days };
  }

  async freeSlots(userId: string, dateIso: string, minimumMinutes = 30) {
    const profile = await this.profileFor(userId);
    const date = new Date(dateIso);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Give a valid date');
    }

    const parts = localParts(date, profile.timezone);

    const [blocks, events] = await Promise.all([
      this.prisma.scheduleBlock.findMany({
        where: { profileId: profile.id, dayOfWeek: parts.dayOfWeek },
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          profileId: profile.id,
          startAt: { gte: new Date(date.getTime() - DAY_MS), lt: new Date(date.getTime() + DAY_MS) },
        },
      }),
    ]);

    const busy = [
      ...blocks.map((block) => ({ startMinute: block.startMinute, endMinute: block.endMinute })),
      ...events
        .filter((event) => localParts(event.startAt, profile.timezone).dateKey === parts.dateKey)
        .map((event) => ({
          startMinute: localParts(event.startAt, profile.timezone).minutes,
          endMinute: localParts(event.endAt, profile.timezone).minutes,
        })),
    ];

    const gaps = gapsAround(busy).filter((gap) => gap.minutes >= minimumMinutes);

    return { dateKey: parts.dateKey, timezone: profile.timezone, gaps };
  }

  async create(userId: string, dto: CreateEventDto) {
    const profile = await this.profileFor(userId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) {
      throw new BadRequestException('An event has to end after it starts');
    }

    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, profileId: profile.id },
        select: { id: true },
      });

      if (!task) throw new BadRequestException('That task does not exist');
    }

    const clash = await this.prisma.calendarEvent.findFirst({
      where: {
        profileId: profile.id,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, title: true },
    });

    const event = await this.prisma.calendarEvent.create({
      data: {
        profileId: profile.id,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        kind: dto.kind,
        taskId: dto.taskId,
        startAt,
        endAt,
        allDay: dto.allDay ?? false,
      },
    });

    return { event, clashesWith: clash };
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const profile = await this.profileFor(userId);

    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Event not found');

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;

    if (endAt <= startAt) {
      throw new BadRequestException('An event has to end after it starts');
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startAt,
        endAt,
      },
    });
  }

  async remove(userId: string, id: string) {
    const profile = await this.profileFor(userId);

    const result = await this.prisma.calendarEvent.deleteMany({ where: { id, profileId: profile.id } });

    if (result.count === 0) throw new NotFoundException('Event not found');

    return { deleted: true };
  }
}
