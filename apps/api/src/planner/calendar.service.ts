import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateEventDto, UpdateEventDto } from './dto/calendar.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const MIN_GAP = 30;
const SLOT_STEP = 15;
const SLOT_LEAD = 10;
const SLOTS_PER_DAY = 2;
const MAX_SLOTS = 6;

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

export function zonedTime(dateKey: string, minutes: number, timezone: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  let guess = Date.UTC(
    year!,
    month! - 1,
    day!,
    Math.floor(minutes / 60),
    minutes % 60,
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = localParts(new Date(guess), timezone);
    const dayShift = Math.round(
      (Date.parse(parts.dateKey) - Date.parse(dateKey)) / DAY_MS,
    );
    const drift = parts.minutes + dayShift * 1440 - minutes;

    if (drift === 0) break;

    guess -= drift * 60_000;
  }

  return new Date(guess);
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

    const [events, blocks, tasks, attending] = await Promise.all([
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
      this.prisma.eventAttendee.findMany({
        where: {
          profileId: profile.id,
          status: 'GOING',
          event: { deletedAt: null, startAt: { gte: from, lt: to } },
        },
        select: {
          event: { select: { id: true, slug: true, title: true, startAt: true, endAt: true } },
        },
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
      attending: {
        id: string;
        slug: string;
        title: string;
        startMinute: number;
        endMinute: number;
        startAt: string;
      }[];
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

      const dayAttending = attending
        .filter((row) => localParts(row.event.startAt, profile.timezone).dateKey === parts.dateKey)
        .map((row) => {
          const start = localParts(row.event.startAt, profile.timezone);
          const end = row.event.endAt ? localParts(row.event.endAt, profile.timezone) : null;

          return {
            id: row.event.id,
            slug: row.event.slug,
            title: row.event.title,
            startMinute: start.minutes,
            endMinute: !end
              ? Math.min(DAY_END, start.minutes + 120)
              : end.dateKey === start.dateKey
                ? end.minutes
                : DAY_END,
            startAt: row.event.startAt.toISOString(),
          };
        })
        .sort((a, b) => a.startMinute - b.startMinute);

      const busy = [
        ...fixed.map((block) => ({ startMinute: block.startMinute, endMinute: block.endMinute })),
        ...dayEvents.map((event) => ({ startMinute: event.startMinute, endMinute: event.endMinute })),
        ...dayAttending.map((event) => ({
          startMinute: event.startMinute,
          endMinute: event.endMinute,
        })),
      ];

      days.push({
        dateKey: parts.dateKey,
        dayOfWeek: parts.dayOfWeek,
        fixed,
        events: dayEvents,
        tasks: dayTasks,
        attending: dayAttending,
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

    const dateKey = localParts(date, profile.timezone).dateKey;
    const start = zonedTime(dateKey, 0, profile.timezone);
    const { days } = await this.range(userId, start.toISOString(), new Date(start.getTime() + DAY_MS).toISOString());
    const gaps = (days[0]?.gaps ?? []).filter((gap) => gap.minutes >= minimumMinutes);

    return { dateKey, timezone: profile.timezone, gaps };
  }

  async suggest(userId: string, rawMinutes = 60, rawDays = 3) {
    const profile = await this.profileFor(userId);
    const minutes = Math.min(240, Math.max(15, Math.round(Number(rawMinutes) || 60)));
    const horizon = Math.min(7, Math.max(1, Math.round(Number(rawDays) || 3)));
    const now = new Date();
    const today = localParts(now, profile.timezone);
    const start = zonedTime(today.dateKey, 0, profile.timezone);
    const { days } = await this.range(
      userId,
      start.toISOString(),
      new Date(start.getTime() + horizon * DAY_MS).toISOString(),
    );
    const earliestToday = Math.ceil((today.minutes + SLOT_LEAD) / SLOT_STEP) * SLOT_STEP;
    const slots: { dateKey: string; startMinute: number; endMinute: number; startAt: string; endAt: string; roomMinutes: number }[] = [];

    for (const day of days) {
      let taken = 0;

      for (const gap of day.gaps) {
        const from = day.dateKey === today.dateKey ? Math.max(gap.startMinute, earliestToday) : gap.startMinute;

        if (gap.endMinute - from < minutes || taken >= SLOTS_PER_DAY) continue;

        slots.push({
          dateKey: day.dateKey,
          startMinute: from,
          endMinute: from + minutes,
          startAt: zonedTime(day.dateKey, from, profile.timezone).toISOString(),
          endAt: zonedTime(day.dateKey, from + minutes, profile.timezone).toISOString(),
          roomMinutes: gap.endMinute - from,
        });
        taken += 1;
      }

      if (slots.length >= MAX_SLOTS) break;
    }

    return { timezone: profile.timezone, minutes, slots: slots.slice(0, MAX_SLOTS) };
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
