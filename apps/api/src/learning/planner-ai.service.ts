import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PlanEngine } from '@nexus/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { gapsAround, localParts } from '../planner/calendar.service.js';
import { planWithModel } from './plan-model.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_BLOCK = 30;
const MAX_BLOCK = 90;
const BUFFER = 10;
const LATE_CUTOFF = 20 * 60;

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

function minutesOf(date: Date, timezone: string, dateKey: string) {
  const parts = localParts(date, timezone);
  const dayShift = Math.round(
    (Date.parse(parts.dateKey) - Date.parse(dateKey)) / DAY_MS,
  );

  return parts.minutes + dayShift * 1440;
}

function clock(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function humanDays(days: number) {
  if (days < 0)
    return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';

  return `due in ${days} days`;
}

type Candidate = {
  key: string;
  title: string;
  minutes: number;
  score: number;
  reason: string;
  taskId?: string;
  pathId?: string;
};

@Injectable()
export class PlannerAiService {
  constructor(private readonly prisma: PrismaService) {}

  private configuredEngine(): PlanEngine {
    return process.env.ANTHROPIC_API_KEY ? 'ASSISTED' : 'RULES';
  }

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, timezone: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async busySpans(
    profileId: string,
    timezone: string,
    dateKey: string,
  ) {
    const dayOfWeek = localParts(
      zonedTime(dateKey, 12 * 60, timezone),
      timezone,
    ).dayOfWeek;
    const dayStart = zonedTime(dateKey, 0, timezone);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    const [blocks, calendar, attending] = await Promise.all([
      this.prisma.scheduleBlock.findMany({ where: { profileId, dayOfWeek } }),
      this.prisma.calendarEvent.findMany({
        where: { profileId, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
        select: { title: true, startAt: true, endAt: true },
      }),
      this.prisma.eventAttendee.findMany({
        where: {
          profileId,
          status: 'GOING',
          event: { deletedAt: null, startAt: { lt: dayEnd, gte: dayStart } },
        },
        select: {
          event: { select: { title: true, startAt: true, endAt: true } },
        },
      }),
    ]);

    const spans = [
      ...blocks.map((block) => ({
        label: block.label,
        startMinute: block.startMinute,
        endMinute: block.endMinute,
      })),
      ...calendar.map((entry) => ({
        label: entry.title,
        startMinute: minutesOf(entry.startAt, timezone, dateKey),
        endMinute: minutesOf(entry.endAt, timezone, dateKey),
      })),
      ...attending.map((row) => ({
        label: row.event.title,
        startMinute: minutesOf(row.event.startAt, timezone, dateKey),
        endMinute: row.event.endAt
          ? minutesOf(row.event.endAt, timezone, dateKey)
          : minutesOf(row.event.startAt, timezone, dateKey) + 120,
      })),
    ];

    return spans
      .map((span) => ({
        ...span,
        startMinute: Math.max(0, Math.min(1440, span.startMinute)),
        endMinute: Math.max(0, Math.min(1440, span.endMinute)),
      }))
      .filter((span) => span.endMinute > span.startMinute);
  }

  private async candidates(
    profileId: string,
    timezone: string,
    dateKey: string,
  ) {
    const reference = zonedTime(dateKey, 12 * 60, timezone);

    const [tasks, paths] = await Promise.all([
      this.prisma.task.findMany({
        where: { profileId, status: { in: ['TODO', 'DOING'] } },
        select: {
          id: true,
          title: true,
          dueAt: true,
          priority: true,
          goalId: true,
        },
        orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }],
        take: 40,
      }),
      this.prisma.learningPath.findMany({
        where: { profileId, deletedAt: null, status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          targetDate: true,
          modules: {
            where: { completedAt: null },
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { title: true, estimatedMinutes: true },
          },
        },
      }),
    ]);

    const list: Candidate[] = [];

    for (const task of tasks) {
      const days = task.dueAt
        ? Math.round(
            (Date.parse(localParts(task.dueAt, timezone).dateKey) -
              Date.parse(dateKey)) /
              DAY_MS,
          )
        : null;

      if (days !== null && days > 7) continue;

      const urgency =
        days === null ? 20 : days < 0 ? 120 : Math.max(20, 100 - days * 12);
      const weight =
        task.priority === 'HIGH' ? 25 : task.priority === 'LOW' ? -10 : 0;

      list.push({
        key: `task:${task.id}`,
        title: task.title,
        minutes: task.priority === 'HIGH' ? 60 : 45,
        score: urgency + weight,
        reason: days === null ? 'No due date, still open' : humanDays(days),
        taskId: task.id,
      });
    }

    for (const path of paths) {
      const next = path.modules[0];

      if (!next) continue;

      const days = path.targetDate
        ? Math.round(
            (Date.parse(localParts(path.targetDate, timezone).dateKey) -
              Date.parse(dateKey)) /
              DAY_MS,
          )
        : null;

      const lastSession = await this.prisma.studySession.findFirst({
        where: { profileId, pathId: path.id },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true },
      });

      const idleDays = lastSession
        ? Math.round(
            (reference.getTime() - lastSession.startedAt.getTime()) / DAY_MS,
          )
        : null;

      const urgency = days === null ? 35 : Math.max(25, 95 - days * 6);
      const neglect = idleDays === null ? 20 : Math.min(30, idleDays * 4);

      list.push({
        key: `path:${path.id}`,
        title: `${path.title} — ${next.title}`,
        minutes: Math.min(
          MAX_BLOCK,
          Math.max(MIN_BLOCK, next.estimatedMinutes),
        ),
        score: urgency + neglect,
        reason:
          idleDays === null
            ? 'Not started yet'
            : idleDays === 0
              ? 'Studied today already'
              : `Last studied ${idleDays} ${idleDays === 1 ? 'day' : 'days'} ago`,
        pathId: path.id,
      });
    }

    return list.sort((a, b) => b.score - a.score);
  }

  async generate(userId: string, planFor?: string) {
    const profile = await this.profileFor(userId);
    const timezone = profile.timezone;
    const now = new Date();
    const today = localParts(now, timezone);

    const dateKey =
      planFor ??
      (today.minutes >= LATE_CUTOFF
        ? localParts(new Date(now.getTime() + DAY_MS), timezone).dateKey
        : today.dateKey);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException('planFor must look like 2026-09-15');
    }

    const busy = await this.busySpans(profile.id, timezone, dateKey);
    const isToday = dateKey === today.dateKey;
    const floor = isToday ? Math.ceil((today.minutes + 15) / 15) * 15 : 0;

    const gaps = gapsAround(busy)
      .map((gap) => ({ ...gap, startMinute: Math.max(gap.startMinute, floor) }))
      .map((gap) => ({ ...gap, minutes: gap.endMinute - gap.startMinute }))
      .filter((gap) => gap.minutes >= MIN_BLOCK);

    const ranked = await this.candidates(profile.id, timezone, dateKey);
    const used = new Set<string>();
    const drafts: {
      title: string;
      rationale: string;
      startMinute: number;
      endMinute: number;
      taskId?: string;
      pathId?: string;
    }[] = [];

    const modelBlocks = await planWithModel({
      dateKey,
      isToday,
      gaps,
      candidates: ranked,
    });
    const engine: PlanEngine = modelBlocks ? 'ASSISTED' : 'RULES';

    for (const block of modelBlocks ?? []) {
      const pick = ranked.find((candidate) => candidate.key === block.key)!;

      drafts.push({
        title: pick.title,
        rationale: block.rationale,
        startMinute: block.startMinute,
        endMinute: block.endMinute,
        taskId: pick.taskId,
        pathId: pick.pathId,
      });
    }

    for (const gap of modelBlocks ? [] : gaps) {
      let cursor = gap.startMinute;

      while (gap.endMinute - cursor >= MIN_BLOCK) {
        const available = gap.endMinute - cursor;
        const pick = ranked.find(
          (candidate) =>
            !used.has(candidate.key) &&
            Math.min(candidate.minutes, MAX_BLOCK) <= available,
        );

        if (!pick) break;

        used.add(pick.key);

        const length = Math.min(pick.minutes, MAX_BLOCK, available);
        const windowLabel = `${clock(gap.startMinute)}–${clock(gap.endMinute)}`;

        drafts.push({
          title: pick.title,
          rationale: `${pick.reason}. You are free ${windowLabel}, so this fits without moving anything.`,
          startMinute: cursor,
          endMinute: cursor + length,
          taskId: pick.taskId,
          pathId: pick.pathId,
        });

        cursor += length + BUFFER;
      }
    }

    await this.prisma.planProposal.updateMany({
      where: { profileId: profile.id, planFor: dateKey, status: 'PROPOSED' },
      data: { status: 'SUPERSEDED', decidedAt: new Date() },
    });

    if (drafts.length > 0) {
      await this.prisma.planProposal.createMany({
        data: drafts.map((draft) => ({
          profileId: profile.id,
          title: draft.title,
          rationale: draft.rationale,
          engine,
          planFor: dateKey,
          startAt: zonedTime(dateKey, draft.startMinute, timezone),
          endAt: zonedTime(dateKey, draft.endMinute, timezone),
          taskId: draft.taskId,
          pathId: draft.pathId,
        })),
      });
    }

    return this.list(userId, dateKey);
  }

  async list(userId: string, planFor?: string) {
    const profile = await this.profileFor(userId);
    const timezone = profile.timezone;
    const dateKey = planFor ?? localParts(new Date(), timezone).dateKey;

    const proposals = await this.prisma.planProposal.findMany({
      where: {
        profileId: profile.id,
        planFor: dateKey,
        status: { in: ['PROPOSED', 'ACCEPTED'] },
      },
      orderBy: { startAt: 'asc' },
      include: {
        task: { select: { id: true, title: true, dueAt: true } },
        path: { select: { id: true, title: true } },
      },
    });

    const busy = await this.busySpans(profile.id, timezone, dateKey);
    const configured = this.configuredEngine();
    const engine: PlanEngine = proposals[0]?.engine ?? configured;

    return {
      planFor: dateKey,
      timezone,
      engine,
      engineNote:
        engine === 'ASSISTED'
          ? 'Claude chose the order and timing from your calendar, tasks and learning paths. Nothing is added until you accept it.'
          : configured === 'ASSISTED'
            ? 'Planned by rule this time because the AI planner was unavailable. Try again in a moment.'
            : 'Planned from your calendar, tasks and learning paths by rule. No language model is configured.',
      commitments: busy
        .sort((a, b) => a.startMinute - b.startMinute)
        .map((span) => ({
          label: span.label,
          start: clock(span.startMinute),
          end: clock(span.endMinute),
        })),
      proposals,
    };
  }

  async decide(userId: string, id: string, accept: boolean) {
    const profile = await this.profileFor(userId);

    const proposal = await this.prisma.planProposal.findFirst({
      where: { id, profileId: profile.id },
      include: { path: { select: { title: true } } },
    });

    if (!proposal) throw new NotFoundException('Proposal not found');

    if (proposal.status !== 'PROPOSED') {
      throw new BadRequestException(
        `That plan was already ${proposal.status.toLowerCase()}`,
      );
    }

    if (!accept) {
      return this.prisma.planProposal.update({
        where: { id },
        data: { status: 'DECLINED', decidedAt: new Date() },
      });
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        profileId: profile.id,
        title: proposal.title,
        description: proposal.rationale,
        kind: proposal.pathId ? 'STUDY' : 'PERSONAL',
        startAt: proposal.startAt,
        endAt: proposal.endAt,
        taskId: proposal.taskId,
      },
    });

    return this.prisma.planProposal.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        decidedAt: new Date(),
        calendarEventId: event.id,
      },
    });
  }

  async acceptAll(userId: string, planFor?: string) {
    const profile = await this.profileFor(userId);
    const timezone = profile.timezone;
    const dateKey = planFor ?? localParts(new Date(), timezone).dateKey;

    const pending = await this.prisma.planProposal.findMany({
      where: { profileId: profile.id, planFor: dateKey, status: 'PROPOSED' },
      orderBy: { startAt: 'asc' },
      select: { id: true },
    });

    for (const proposal of pending) {
      await this.decide(userId, proposal.id, true);
    }

    return this.list(userId, dateKey);
  }
}
