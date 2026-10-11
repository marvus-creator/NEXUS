import { Injectable } from '@nestjs/common';
import type { Prisma } from '@nexus/db';
import { money } from '../common/util/money.js';
import { PeopleService } from '../people/people.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { likeSafe } from '../common/like.js';

export type SearchKind = 'person' | 'event' | 'circle' | 'place' | 'listing' | 'post';

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  image: string | null;
  meta: Record<string, string | number | boolean | null>;
};

const PER_GROUP = 5;

function snippet(text: string, term: string, width = 90) {
  const flat = text.replace(/\s+/g, ' ').trim();
  const at = flat.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0 || flat.length <= width) return flat.slice(0, width);
  const start = Math.max(0, at - Math.floor(width / 3));
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + width)}${start + width < flat.length ? '…' : ''}`;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
  ) {}

  async search(userId: string, rawQuery: string, kinds?: SearchKind[]) {
    const term = rawQuery.trim().slice(0, 80);

    if (term.length < 2) return { query: term, total: 0, groups: [] as { kind: SearchKind; hits: SearchHit[] }[] };

    const me = await this.people.profileFor(userId);
    const [friendIds, blockedIds, memberships] = await Promise.all([
      this.people.friendIdsOf(me.id),
      this.people.blockedIdsFor(me.id),
      this.prisma.circleMember.findMany({ where: { profileId: me.id }, select: { circleId: true } }),
    ]);
    const circleIds = memberships.map((membership) => membership.circleId);
    const wanted = (kind: SearchKind) => !kinds || kinds.length === 0 || kinds.includes(kind);
    const contains = { contains: likeSafe(term), mode: 'insensitive' as const };

    const [people, events, circles, places, listings, posts] = await Promise.all([
      wanted('person') ? this.people.search(userId, term, PER_GROUP) : [],
      wanted('event')
        ? this.prisma.event.findMany({
            where: {
              deletedAt: null,
              hostId: { notIn: blockedIds },
              AND: [
                {
                  OR: [
                    { visibility: 'PUBLIC' },
                    { hostId: me.id },
                    { visibility: 'CIRCLE', circleId: { in: circleIds } },
                    { attendees: { some: { profileId: me.id } } },
                  ],
                },
                { OR: [{ title: contains }, { description: contains }, { locationText: contains }, { place: { name: contains } }] },
              ],
            } satisfies Prisma.EventWhereInput,
            orderBy: { startAt: 'desc' },
            take: 20,
            select: {
              id: true,
              slug: true,
              title: true,
              startAt: true,
              endAt: true,
              coverUrl: true,
              locationText: true,
              place: { select: { name: true } },
            },
          })
        : [],
      wanted('circle')
        ? this.prisma.circle.findMany({
            where: {
              deletedAt: null,
              OR: [{ visibility: { not: 'PRIVATE' } }, { id: { in: circleIds } }],
              AND: [{ OR: [{ name: contains }, { description: contains }, { city: contains }] }],
            },
            take: PER_GROUP,
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
              coverUrl: true,
              visibility: true,
              _count: { select: { members: true } },
            },
          })
        : [],
      wanted('place')
        ? this.prisma.place.findMany({
            where: {
              deletedAt: null,
              OR: [{ name: contains }, { address: contains }, { city: contains }, { description: contains }],
            },
            take: PER_GROUP,
            select: { id: true, slug: true, name: true, category: true, address: true, city: true, coverUrl: true },
          })
        : [],
      wanted('listing')
        ? this.prisma.listing.findMany({
            where: {
              deletedAt: null,
              status: 'ACTIVE',
              sellerId: { notIn: blockedIds },
              OR: [{ title: contains }, { description: contains }],
            },
            take: PER_GROUP,
            orderBy: { createdAt: 'desc' },
            select: { id: true, slug: true, title: true, priceMinor: true, currency: true, coverUrl: true, city: true },
          })
        : [],
      wanted('post')
        ? this.prisma.post.findMany({
            where: {
              deletedAt: null,
              profileId: { notIn: blockedIds },
              profile: { user: { deletedAt: null, status: { not: 'SUSPENDED' } } },
              body: contains,
              AND: [
                { OR: [{ circleId: null }, { circleId: { in: circleIds } }] },
                {
                  OR: [
                    { profileId: me.id },
                    { visibility: 'PUBLIC' },
                    { visibility: 'FRIENDS', profileId: { in: friendIds } },
                  ],
                },
              ],
            } satisfies Prisma.PostWhereInput,
            orderBy: { createdAt: 'desc' },
            take: PER_GROUP,
            select: {
              id: true,
              body: true,
              createdAt: true,
              circle: { select: { slug: true, name: true } },
              profile: { select: { username: true, displayName: true, avatarUrl: true } },
            },
          })
        : [],
    ]);

    const now = Date.now();
    const upcomingFirst = [...events]
      .sort((a, b) => {
        const aFuture = a.startAt.getTime() >= now;
        const bFuture = b.startAt.getTime() >= now;
        if (aFuture !== bFuture) return aFuture ? -1 : 1;
        return aFuture ? a.startAt.getTime() - b.startAt.getTime() : b.startAt.getTime() - a.startAt.getTime();
      })
      .slice(0, PER_GROUP);

    const groups: { kind: SearchKind; hits: SearchHit[] }[] = [
      {
        kind: 'person' as const,
        hits: people.map((person) => ({
          kind: 'person' as const,
          id: person.id,
          title: person.displayName,
          subtitle: [`@${person.username}`, person.occupation, person.city].filter(Boolean).join(' · '),
          href: `/u/${person.username}`,
          image: person.avatarUrl,
          meta: { mutualFriends: person.mutualFriends },
        })),
      },
      {
        kind: 'event' as const,
        hits: upcomingFirst.map((event) => ({
          kind: 'event' as const,
          id: event.id,
          title: event.title,
          subtitle: event.place?.name ?? event.locationText ?? null,
          href: `/events/${event.slug}`,
          image: event.coverUrl,
          meta: {
            startAt: event.startAt.toISOString(),
            past: (event.endAt ?? event.startAt).getTime() < now,
          },
        })),
      },
      {
        kind: 'circle' as const,
        hits: circles.map((circle) => ({
          kind: 'circle' as const,
          id: circle.id,
          title: circle.name,
          subtitle: circle.description ? snippet(circle.description, term, 80) : null,
          href: `/circles/${circle.slug}`,
          image: circle.coverUrl,
          meta: { members: circle._count.members, visibility: circle.visibility },
        })),
      },
      {
        kind: 'place' as const,
        hits: places.map((place) => ({
          kind: 'place' as const,
          id: place.id,
          title: place.name,
          subtitle: [place.address, place.city].filter(Boolean).join(' · ') || null,
          href: `/nearby?place=${place.slug}`,
          image: place.coverUrl,
          meta: { category: place.category },
        })),
      },
      {
        kind: 'listing' as const,
        hits: listings.map((listing) => ({
          kind: 'listing' as const,
          id: listing.id,
          title: listing.title,
          subtitle: listing.city,
          href: `/market?listing=${listing.slug}`,
          image: listing.coverUrl,
          meta: { price: money(listing.priceMinor, listing.currency).display },
        })),
      },
      {
        kind: 'post' as const,
        hits: posts.map((post) => ({
          kind: 'post' as const,
          id: post.id,
          title: snippet(post.body, term),
          subtitle: post.circle ? `${post.profile.displayName} · ${post.circle.name}` : post.profile.displayName,
          href: post.circle ? `/circles/${post.circle.slug}` : `/u/${post.profile.username}`,
          image: post.profile.avatarUrl,
          meta: { createdAt: post.createdAt.toISOString() },
        })),
      },
    ].filter((group) => group.hits.length > 0);

    return { query: term, total: groups.reduce((sum, group) => sum + group.hits.length, 0), groups };
  }
}
