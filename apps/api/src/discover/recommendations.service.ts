import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { money } from '../common/util/money.js';
import { AffinityService, type Affinity } from './affinity.service.js';

const DAY_MS = 86_400_000;

export type RecommendationKind = 'EVENT' | 'PLACE' | 'CIRCLE' | 'PERSON' | 'LISTING';

export type Recommendation = {
  kind: RecommendationKind;
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  score: number;
  reasons: string[];
  meta: Record<string, unknown>;
};

function topKeys(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly affinity: AffinityService,
  ) {}

  private categoryAffinity(affinity: Affinity, category: string | null | undefined) {
    if (!category) return 0;

    const raw = affinity.categories.get(category) ?? 0;
    const max = Math.max(1, ...affinity.categories.values());

    return raw / max;
  }

  private personAffinity(affinity: Affinity, profileId: string | null | undefined) {
    if (!profileId) return 0;

    const raw = affinity.people.get(profileId) ?? 0;
    const max = Math.max(1, ...affinity.people.values());

    return raw / max;
  }

  private matchesSubject(affinity: Affinity, text: string | null | undefined) {
    if (!text) return null;

    const haystack = text.toLowerCase();

    for (const interest of affinity.interests) {
      if (haystack.includes(interest.toLowerCase())) return interest;
    }

    for (const subject of affinity.subjects) {
      if (subject.length >= 4 && haystack.includes(subject)) return subject;
    }

    return null;
  }

  async forYou(userId: string, limit = 24) {
    const affinity = await this.affinity.build(userId);
    const now = new Date();

    const [events, places, circles, people, listings] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          startAt: { gte: now },
          OR: [
            { visibility: 'PUBLIC' },
            { visibility: 'CIRCLE', circleId: { in: affinity.circleIds } },
          ],
        },
        include: {
          host: { select: { id: true, username: true, displayName: true } },
          place: { select: { slug: true, name: true, category: true, city: true } },
          attendees: { select: { profileId: true, status: true } },
        },
        orderBy: { startAt: 'asc' },
        take: 60,
      }),
      this.prisma.place.findMany({
        where: { deletedAt: null },
        include: {
          saves: { select: { profileId: true } },
          reviews: { select: { rating: true } },
          _count: { select: { events: true } },
        },
        take: 60,
      }),
      this.prisma.circle.findMany({
        where: { deletedAt: null, visibility: { in: ['PUBLIC', 'PRIVATE'] } },
        include: {
          members: { select: { profileId: true } },
          _count: { select: { posts: true } },
        },
        take: 60,
      }),
      this.prisma.profile.findMany({
        where: {
          id: { not: affinity.profileId },
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
          interests: { select: { interest: { select: { label: true } } } },
        },
        take: 60,
      }),
      this.prisma.listing.findMany({
        where: { deletedAt: null, status: 'ACTIVE', sellerId: { not: affinity.profileId } },
        include: {
          seller: { select: { id: true, username: true, displayName: true } },
          business: { select: { slug: true, name: true } },
          saves: { select: { profileId: true } },
        },
        take: 60,
      }),
    ]);

    const out: Recommendation[] = [];
    const friends = new Set(affinity.friendIds);

    for (const event of events) {
      if (event.attendees.some((row) => row.profileId === affinity.profileId)) continue;

      const reasons: string[] = [];
      let score = 10;

      const going = event.attendees.filter((row) => row.status === 'GOING');
      const friendsGoing = going.filter((row) => friends.has(row.profileId)).length;

      if (friendsGoing > 0) {
        score += friendsGoing * 14;
        reasons.push(`${friendsGoing} ${friendsGoing === 1 ? 'friend is' : 'friends are'} going`);
      }

      const hostWeight = this.personAffinity(affinity, event.hostId);
      if (hostWeight > 0.2) {
        score += hostWeight * 12;
        reasons.push(`hosted by ${event.host.displayName}, who you follow`);
      }

      const categoryWeight = this.categoryAffinity(affinity, event.place?.category);
      if (categoryWeight > 0.2) {
        score += categoryWeight * 10;
        reasons.push(`you spend time at ${(event.place?.category ?? '').toLowerCase()} places`);
      }

      const subject = this.matchesSubject(affinity, `${event.title} ${event.description ?? ''}`);
      if (subject) {
        score += 12;
        reasons.push(`matches your interest in ${subject}`);
      }

      if (event.circleId && affinity.circleIds.includes(event.circleId)) {
        score += 16;
        reasons.push('from a circle you are in');
      }

      if (event.isOnline) {
        score += 3;
        reasons.push('online, so distance does not matter');
      } else if (affinity.city && event.place?.city === affinity.city) {
        score += 5;
        reasons.push(`in ${affinity.city}`);
      }

      const days = (event.startAt.getTime() - now.getTime()) / DAY_MS;
      score += Math.max(0, 8 - days * 0.6);

      if (going.length > 0) score += Math.min(6, going.length * 0.8);

      if (reasons.length === 0) {
        reasons.push(
          days <= 2
            ? 'happening in the next couple of days'
            : going.length > 0
              ? `${going.length} ${going.length === 1 ? 'person is' : 'people are'} going`
              : 'open to anyone, and coming up',
        );
      }

      out.push({
        kind: 'EVENT',
        id: event.id,
        slug: event.slug,
        title: event.title,
        subtitle: event.isOnline
          ? 'Online'
          : (event.place?.name ?? event.locationText ?? null),
        imageUrl: event.coverUrl,
        score,
        reasons,
        meta: {
          startAt: event.startAt,
          isOnline: event.isOnline,
          goingCount: going.length,
          host: event.host.username,
        },
      });
    }

    for (const place of places) {
      if (place.saves.some((row) => row.profileId === affinity.profileId)) continue;

      const reasons: string[] = [];
      let score = 4;

      const friendsSaved = place.saves.filter((row) => friends.has(row.profileId)).length;
      if (friendsSaved > 0) {
        score += friendsSaved * 10;
        reasons.push(`${friendsSaved} ${friendsSaved === 1 ? 'friend saved' : 'friends saved'} this`);
      }

      const categoryWeight = this.categoryAffinity(affinity, place.category);
      if (categoryWeight > 0.2) {
        score += categoryWeight * 14;
        reasons.push(`you like ${place.category.toLowerCase()} places`);
      }

      const rating =
        place.reviews.length > 0
          ? place.reviews.reduce((sum, row) => sum + row.rating, 0) / place.reviews.length
          : null;

      if (rating !== null && rating >= 4) {
        score += (rating - 3) * 4;
        reasons.push(`rated ${rating.toFixed(1)} by people here`);
      }

      if (affinity.city && place.city === affinity.city) score += 4;
      if (place._count.events > 0) score += Math.min(6, place._count.events * 2);

      if (reasons.length === 0) {
        reasons.push(
          place._count.events > 0
            ? 'things are happening here'
            : affinity.city && place.city === affinity.city
              ? `somewhere in ${affinity.city} you have not been`
              : 'added by someone on Nexus',
        );
      }

      out.push({
        kind: 'PLACE',
        id: place.id,
        slug: place.slug,
        title: place.name,
        subtitle: [place.category.toLowerCase(), place.city].filter(Boolean).join(' · '),
        imageUrl: place.coverUrl,
        score,
        reasons,
        meta: { rating, category: place.category, upcomingEvents: place._count.events },
      });
    }

    for (const circle of circles) {
      if (affinity.circleIds.includes(circle.id)) continue;

      const reasons: string[] = [];
      let score = 6;

      const friendsIn = circle.members.filter((row) => friends.has(row.profileId)).length;
      if (friendsIn > 0) {
        score += friendsIn * 12;
        reasons.push(`${friendsIn} ${friendsIn === 1 ? 'friend is' : 'friends are'} in it`);
      }

      const subject = this.matchesSubject(
        affinity,
        `${circle.name} ${circle.description ?? ''}`,
      );
      if (subject) {
        score += 14;
        reasons.push(`about ${subject}`);
      }

      if (affinity.city && circle.city === affinity.city) {
        score += 5;
        reasons.push(`based in ${affinity.city}`);
      }

      score += Math.min(8, circle.members.length * 0.3 + circle._count.posts * 0.5);

      if (reasons.length === 0) {
        reasons.push(
          circle._count.posts > 0
            ? 'an active circle you are not in yet'
            : 'a new circle looking for people',
        );
      }

      out.push({
        kind: 'CIRCLE',
        id: circle.id,
        slug: circle.slug,
        title: circle.name,
        subtitle: circle.description?.slice(0, 120) ?? null,
        imageUrl: circle.coverUrl,
        score,
        reasons,
        meta: { members: circle.members.length, posts: circle._count.posts },
      });
    }

    for (const person of people) {
      if (friends.has(person.id)) continue;

      const reasons: string[] = [];
      let score = 2;

      const shared = person.interests
        .map((link) => link.interest.label)
        .filter((label) => affinity.interests.has(label));

      if (shared.length > 0) {
        score += shared.length * 6;
        reasons.push(`you both like ${shared.slice(0, 2).join(' and ')}`);
      }

      const weight = this.personAffinity(affinity, person.id);
      if (weight > 0.1) {
        score += weight * 10;
        reasons.push('you have crossed paths already');
      }

      if (affinity.city && person.city === affinity.city) {
        score += 4;
        reasons.push(`also in ${affinity.city}`);
      }

      if (reasons.length === 0) continue;

      out.push({
        kind: 'PERSON',
        id: person.id,
        slug: person.username,
        title: person.displayName,
        subtitle: person.occupation,
        imageUrl: person.avatarUrl,
        score,
        reasons,
        meta: { username: person.username, sharedInterests: shared.length },
      });
    }

    for (const listing of listings) {
      if (listing.saves.some((row) => row.profileId === affinity.profileId)) continue;

      const reasons: string[] = [];
      let score = 3;

      const categoryWeight = this.categoryAffinity(affinity, listing.category);
      if (categoryWeight > 0.2) {
        score += categoryWeight * 12;
        reasons.push(`you look at ${listing.category.toLowerCase()} listings`);
      }

      const sellerWeight = this.personAffinity(affinity, listing.sellerId);
      if (sellerWeight > 0.2) {
        score += sellerWeight * 8;
        reasons.push(`sold by ${listing.seller.displayName}`);
      }

      const subject = this.matchesSubject(affinity, `${listing.title} ${listing.description ?? ''}`);
      if (subject) {
        score += 10;
        reasons.push(`matches your interest in ${subject}`);
      }

      if (affinity.city && listing.city === affinity.city) score += 3;
      score += this.affinity.freshness(listing.createdAt) * 4;

      if (reasons.length === 0) continue;

      out.push({
        kind: 'LISTING',
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        subtitle: listing.business?.name ?? listing.seller.displayName,
        imageUrl: listing.coverUrl,
        score,
        reasons,
        meta: {
          price: money(listing.priceMinor, listing.currency),
          category: listing.category,
        },
      });
    }

    const ranked = out.sort((a, b) => b.score - a.score).slice(0, limit);

    return {
      personalized: affinity.personalized,
      signals: affinity.signalCount,
      note: affinity.personalized
        ? affinity.signalCount === 0
          ? 'Ranked on what you told us you are interested in. It gets sharper as you save places, join circles and turn up to things.'
          : `Ranked against ${affinity.signalCount} things you have actually done, not just what you said you liked.`
        : 'Personalisation is off in your privacy settings, so this is ranked by what is popular and close, not by you.',
      topCategories: topKeys(affinity.categories, 3),
      items: ranked,
    };
  }
}
