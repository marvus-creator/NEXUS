import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { money } from '../common/util/money.js';

const DAY_MS = 86_400_000;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function emptySeries(days: number) {
  const keys: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    keys.push(dayKey(new Date(Date.now() - index * DAY_MS)));
  }

  return keys;
}

function countInto(keys: string[], dates: Date[]) {
  const counts = new Map(keys.map((key) => [key, 0]));

  for (const date of dates) {
    const key = dayKey(date);

    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return keys.map((key) => ({ date: key, count: counts.get(key) ?? 0 }));
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(days = 30) {
    const since = new Date(Date.now() - days * DAY_MS);
    const keys = emptySeries(days);

    const [
      users,
      activeUsers,
      verifiedUsers,
      suspended,
      signups,
      logins,
      posts,
      postsRecent,
      circles,
      events,
      places,
      listings,
      orders,
      paidOrders,
      openReports,
      studyMinutes,
      messages,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { deletedAt: null, emailVerifiedAt: { not: null } } }),
      this.prisma.user.count({ where: { deletedAt: null, status: 'SUSPENDED' } }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { lastLoginAt: { gte: since }, deletedAt: null },
        select: { lastLoginAt: true },
      }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.post.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
      }),
      this.prisma.circle.count({ where: { deletedAt: null } }),
      this.prisma.event.count({ where: { deletedAt: null } }),
      this.prisma.place.count({ where: { deletedAt: null } }),
      this.prisma.listing.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.order.count(),
      this.prisma.order.findMany({
        where: { paidTransactionId: { not: null } },
        select: { totalMinor: true, currency: true, createdAt: true },
      }),
      this.prisma.report.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
      this.prisma.studySession.aggregate({ _sum: { minutes: true } }),
      this.prisma.message.count({ where: { deletedAt: null } }),
    ]);

    const settledByCurrency = new Map<string, number>();

    for (const order of paidOrders) {
      settledByCurrency.set(
        order.currency,
        (settledByCurrency.get(order.currency) ?? 0) + order.totalMinor,
      );
    }

    return {
      windowDays: days,
      people: {
        total: users,
        active: activeUsers,
        verified: verifiedUsers,
        suspended,
        newInWindow: signups.length,
        signedInInWindow: logins.length,
      },
      content: {
        posts,
        postsInWindow: postsRecent.length,
        circles,
        events,
        places,
        messages,
        studyHours: Math.round((studyMinutes._sum.minutes ?? 0) / 60),
      },
      commerce: {
        activeListings: listings,
        orders,
        paidOrders: paidOrders.length,
        settled: [...settledByCurrency.entries()].map(([currency, minor]) => money(minor, currency)),
      },
      moderation: {
        openReports,
      },
      series: {
        signups: countInto(keys, signups.map((row) => row.createdAt)),
        posts: countInto(keys, postsRecent.map((row) => row.createdAt)),
        logins: countInto(
          keys,
          logins.flatMap((row) => (row.lastLoginAt ? [row.lastLoginAt] : [])),
        ),
      },
    };
  }
}
