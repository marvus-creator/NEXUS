import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 86_400_000;

export type Affinity = {
  profileId: string;
  city: string | null;
  personalized: boolean;
  categories: Map<string, number>;
  people: Map<string, number>;
  subjects: Set<string>;
  interests: Set<string>;
  friendIds: string[];
  circleIds: string[];
  signalCount: number;
};

function bump(map: Map<string, number>, key: string | null | undefined, weight: number) {
  if (!key) return;

  map.set(key, (map.get(key) ?? 0) + weight);
}

@Injectable()
export class AffinityService {
  constructor(private readonly prisma: PrismaService) {}

  async build(userId: string): Promise<Affinity> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        city: true,
        skills: true,
        interests: { select: { interest: { select: { slug: true, label: true } } } },
        privacy: { select: { personalizationOptIn: true } },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    const personalized = profile.privacy?.personalizationOptIn ?? true;

    const categories = new Map<string, number>();
    const people = new Map<string, number>();
    const subjects = new Set<string>();
    const interests = new Set(profile.interests.map((link) => link.interest.label));

    for (const skill of profile.skills) subjects.add(skill.toLowerCase());

    const [friendsA, friendsB, memberships] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { profileAId: profile.id },
        select: { profileBId: true },
      }),
      this.prisma.friendship.findMany({
        where: { profileBId: profile.id },
        select: { profileAId: true },
      }),
      this.prisma.circleMember.findMany({
        where: { profileId: profile.id },
        select: { circleId: true },
      }),
    ]);

    const friendIds = [
      ...friendsA.map((row) => row.profileBId),
      ...friendsB.map((row) => row.profileAId),
    ];

    const circleIds = memberships.map((row) => row.circleId);

    if (!personalized) {
      return {
        profileId: profile.id,
        city: profile.city,
        personalized: false,
        categories,
        people,
        subjects,
        interests,
        friendIds,
        circleIds,
        signalCount: 0,
      };
    }

    const [savedPlaces, reviewedPlaces, attended, savedListings, orders, paths, follows, reactions] =
      await Promise.all([
        this.prisma.placeSave.findMany({
          where: { profileId: profile.id },
          select: { place: { select: { category: true, city: true, createdById: true } } },
        }),
        this.prisma.placeReview.findMany({
          where: { profileId: profile.id },
          select: { rating: true, place: { select: { category: true } } },
        }),
        this.prisma.eventAttendee.findMany({
          where: { profileId: profile.id, status: { in: ['GOING', 'INTERESTED'] } },
          select: {
            status: true,
            checkedInAt: true,
            event: {
              select: { hostId: true, circleId: true, place: { select: { category: true } } },
            },
          },
        }),
        this.prisma.listingSave.findMany({
          where: { profileId: profile.id },
          select: { listing: { select: { category: true, sellerId: true } } },
        }),
        this.prisma.order.findMany({
          where: { buyerId: profile.id },
          select: { sellerId: true, listing: { select: { category: true } } },
        }),
        this.prisma.learningPath.findMany({
          where: { profileId: profile.id, deletedAt: null },
          select: { subject: true, title: true },
        }),
        this.prisma.follow.findMany({
          where: { followerId: profile.id },
          select: { followingId: true },
        }),
        this.prisma.postReaction.findMany({
          where: { profileId: profile.id },
          select: { post: { select: { profileId: true } } },
          take: 200,
        }),
      ]);

    for (const row of savedPlaces) {
      bump(categories, row.place.category, 3);
      bump(people, row.place.createdById, 1);
    }

    for (const row of reviewedPlaces) {
      bump(categories, row.place.category, row.rating >= 4 ? 4 : 1);
    }

    for (const row of attended) {
      const weight = row.checkedInAt ? 6 : row.status === 'GOING' ? 4 : 2;
      bump(people, row.event.hostId, weight);
      bump(categories, row.event.place?.category, weight);
    }

    for (const row of savedListings) {
      bump(categories, row.listing.category, 2);
      bump(people, row.listing.sellerId, 1);
    }

    for (const row of orders) {
      bump(categories, row.listing.category, 5);
      bump(people, row.sellerId, 3);
    }

    for (const path of paths) {
      if (path.subject) subjects.add(path.subject.toLowerCase());
      subjects.add(path.title.toLowerCase());
    }

    for (const row of follows) bump(people, row.followingId, 2);
    for (const row of reactions) bump(people, row.post.profileId, 0.5);
    for (const id of friendIds) bump(people, id, 5);

    const signalCount =
      savedPlaces.length +
      reviewedPlaces.length +
      attended.length +
      savedListings.length +
      orders.length +
      paths.length +
      follows.length;

    return {
      profileId: profile.id,
      city: profile.city,
      personalized: true,
      categories,
      people,
      subjects,
      interests,
      friendIds,
      circleIds,
      signalCount,
    };
  }

  freshness(date: Date, halfLifeDays = 14) {
    const age = Math.max(0, (Date.now() - date.getTime()) / DAY_MS);

    return 1 / (1 + age / halfLifeDays);
  }
}
