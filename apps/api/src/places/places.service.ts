import { randomBytes } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PlaceCategory, Prisma } from '@nexus/db';
import { PeopleService } from '../people/people.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { likeSafe } from '../common/like.js';

const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
}

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
  ) {}

  private async uniqueSlug(base: string, model: 'place' | 'event') {
    let slug = slugify(base) || randomBytes(4).toString('hex');
    let attempt = 1;

    const exists = async (candidate: string) =>
      model === 'place'
        ? Boolean(await this.prisma.place.findUnique({ where: { slug: candidate }, select: { id: true } }))
        : Boolean(await this.prisma.event.findUnique({ where: { slug: candidate }, select: { id: true } }));

    while (await exists(slug)) {
      attempt += 1;
      slug = `${slugify(base)}-${attempt}`;
    }

    return slug;
  }

  async list(
    userId: string,
    options: {
      category?: PlaceCategory;
      city?: string;
      query?: string;
      latitude?: number;
      longitude?: number;
      savedOnly?: boolean;
    },
  ) {
    const me = await this.people.profileFor(userId);

    const where: Prisma.PlaceWhereInput = {
      deletedAt: null,
      category: options.category,
      city: options.city ? { equals: options.city, mode: 'insensitive' } : undefined,
      saves: options.savedOnly ? { some: { profileId: me.id } } : undefined,
    };

    if (options.query && options.query.trim().length >= 2) {
      const term = options.query.trim();
      where.OR = [
        { name: { contains: likeSafe(term), mode: 'insensitive' } },
        { description: { contains: likeSafe(term), mode: 'insensitive' } },
        { address: { contains: likeSafe(term), mode: 'insensitive' } },
      ];
    }

    const places = await this.prisma.place.findMany({
      where,
      include: {
        reviews: { select: { rating: true } },
        saves: { where: { profileId: me.id }, select: { profileId: true } },
        _count: { select: { events: true } },
      },
      take: 80,
      orderBy: { createdAt: 'desc' },
    });

    const origin =
      options.latitude !== undefined && options.longitude !== undefined
        ? { latitude: options.latitude, longitude: options.longitude }
        : null;

    return places
      .map((place) => {
        const ratings = place.reviews.map((review) => review.rating);

        return {
          id: place.id,
          slug: place.slug,
          name: place.name,
          description: place.description,
          category: place.category,
          address: place.address,
          city: place.city,
          latitude: place.latitude,
          longitude: place.longitude,
          coverUrl: place.coverUrl,
          website: place.website,
          verified: place.verified,
          rating:
            ratings.length > 0
              ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
              : null,
          reviewCount: ratings.length,
          eventCount: place._count.events,
          saved: place.saves.length > 0,
          distanceKm:
            origin && place.latitude !== null && place.longitude !== null
              ? Math.round(
                  distanceKm(origin, { latitude: place.latitude, longitude: place.longitude }) * 10,
                ) / 10
              : null,
        };
      })
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
  }

  async detail(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);

    const place = await this.prisma.place.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      include: {
        reviews: {
          include: {
            profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        saves: { where: { profileId: me.id }, select: { profileId: true } },
        events: {
          where: { deletedAt: null, startAt: { gte: new Date() } },
          orderBy: { startAt: 'asc' },
          take: 5,
          select: { id: true, slug: true, title: true, startAt: true },
        },
      },
    });

    if (!place) throw new NotFoundException('No such place');

    const ratings = place.reviews.map((review) => review.rating);

    return {
      id: place.id,
      slug: place.slug,
      name: place.name,
      description: place.description,
      category: place.category,
      address: place.address,
      city: place.city,
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      coverUrl: place.coverUrl,
      website: place.website,
      phone: place.phone,
      openingHours: place.openingHours,
      verified: place.verified,
      saved: place.saves.length > 0,
      rating:
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
          : null,
      reviewCount: ratings.length,
      myReview: place.reviews.find((review) => review.profileId === me.id) ?? null,
      reviews: place.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
        author: review.profile,
      })),
      upcomingEvents: place.events,
    };
  }

  async create(
    userId: string,
    input: {
      name: string;
      category?: PlaceCategory;
      description?: string;
      address?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      website?: string;
      phone?: string;
      coverUrl?: string;
    },
  ) {
    const me = await this.people.profileFor(userId);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Confirm your email address before adding places');
    }

    if ((input.latitude === undefined) !== (input.longitude === undefined)) {
      throw new BadRequestException('Give both a latitude and a longitude, or neither');
    }

    if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) {
      throw new BadRequestException('Latitude has to be between -90 and 90');
    }

    if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
      throw new BadRequestException('Longitude has to be between -180 and 180');
    }

    const place = await this.prisma.place.create({
      data: {
        slug: await this.uniqueSlug(input.name, 'place'),
        name: input.name.trim(),
        category: input.category ?? 'OTHER',
        description: input.description,
        address: input.address,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        website: input.website,
        phone: input.phone,
        coverUrl: input.coverUrl,
        createdById: me.id,
      },
    });

    return { id: place.id, slug: place.slug, name: place.name };
  }

  async review(userId: string, slug: string, rating: number, body?: string) {
    const me = await this.people.profileFor(userId);

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Ratings run from 1 to 5');
    }

    const place = await this.prisma.place.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      select: { id: true },
    });

    if (!place) throw new NotFoundException('No such place');

    await this.prisma.placeReview.upsert({
      where: { placeId_profileId: { placeId: place.id, profileId: me.id } },
      create: { placeId: place.id, profileId: me.id, rating, body },
      update: { rating, body },
    });

    const reviews = await this.prisma.placeReview.findMany({
      where: { placeId: place.id },
      select: { rating: true },
    });

    return {
      rating:
        Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
        ) / 10,
      reviewCount: reviews.length,
    };
  }

  async toggleSave(userId: string, slug: string, saved: boolean) {
    const me = await this.people.profileFor(userId);

    const place = await this.prisma.place.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      select: { id: true },
    });

    if (!place) throw new NotFoundException('No such place');

    if (saved) {
      await this.prisma.placeSave.upsert({
        where: { placeId_profileId: { placeId: place.id, profileId: me.id } },
        create: { placeId: place.id, profileId: me.id },
        update: {},
      });
    } else {
      await this.prisma.placeSave.deleteMany({ where: { placeId: place.id, profileId: me.id } });
    }

    return { saved };
  }

  async categories() {
    const counts = await this.prisma.place.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      _count: true,
    });

    return counts.map((row) => ({ category: row.category, count: row._count }));
  }

  slugFor(name: string, model: 'place' | 'event') {
    return this.uniqueSlug(name, model);
  }
}
