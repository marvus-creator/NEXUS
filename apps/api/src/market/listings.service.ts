import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { BusinessCategory, ListingCondition, ListingKind, ListingStatus } from '@nexus/db';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isSupportedCurrency, money, toMinor } from '../common/util/money.js';
import { LedgerService } from '../wallet/ledger.service.js';
import { BusinessesService } from './businesses.service.js';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
}

const LISTING_INCLUDE = {
  seller: { select: { username: true, displayName: true, avatarUrl: true } },
  business: { select: { slug: true, name: true, logoUrl: true, verified: true } },
  _count: { select: { saves: true, orders: true } },
} as const;

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businesses: BusinessesService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
  ) {}

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, city: true, currency: true, username: true, displayName: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async uniqueSlug(base: string) {
    let slug = slugify(base) || randomBytes(4).toString('hex');
    let attempt = 1;

    while (await this.prisma.listing.findUnique({ where: { slug }, select: { id: true } })) {
      attempt += 1;
      slug = `${slugify(base) || 'listing'}-${attempt}`;
    }

    return slug;
  }

  private shape(
    listing: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      kind: ListingKind;
      status: ListingStatus;
      condition: ListingCondition | null;
      priceMinor: number;
      currency: string;
      negotiable: boolean;
      quantity: number;
      category: BusinessCategory;
      city: string | null;
      coverUrl: string | null;
      images: string[];
      createdAt: Date;
      sellerId: string;
      seller?: { username: string; displayName: string; avatarUrl: string | null };
      business?: { slug: string; name: string; logoUrl: string | null; verified: boolean } | null;
      _count?: { saves: number; orders: number };
    },
    saved = false,
    viewerProfileId?: string,
  ) {
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      description: listing.description,
      kind: listing.kind,
      status: listing.status,
      condition: listing.condition,
      price: money(listing.priceMinor, listing.currency),
      priceMinor: listing.priceMinor,
      currency: listing.currency,
      negotiable: listing.negotiable,
      quantity: listing.quantity,
      category: listing.category,
      city: listing.city,
      coverUrl: listing.coverUrl,
      images: listing.images,
      createdAt: listing.createdAt,
      seller: listing.seller ?? null,
      business: listing.business ?? null,
      saves: listing._count?.saves ?? 0,
      orders: listing._count?.orders ?? 0,
      saved,
      isMine: viewerProfileId === listing.sellerId,
    };
  }

  async list(
    userId: string,
    options: {
      category?: BusinessCategory;
      kind?: ListingKind;
      city?: string;
      query?: string;
      savedOnly?: boolean;
      mine?: boolean;
      businessSlug?: string;
      maxPrice?: number;
    } = {},
  ) {
    const profile = await this.profileFor(userId);
    const term = options.query?.trim() ?? '';

    const listings = await this.prisma.listing.findMany({
      where: {
        deletedAt: null,
        ...(options.mine ? { sellerId: profile.id } : { status: 'ACTIVE' }),
        ...(options.category ? { category: options.category } : {}),
        ...(options.kind ? { kind: options.kind } : {}),
        ...(options.city ? { city: { equals: options.city, mode: 'insensitive' } } : {}),
        ...(options.businessSlug ? { business: { slug: options.businessSlug } } : {}),
        ...(options.savedOnly ? { saves: { some: { profileId: profile.id } } } : {}),
        ...(options.maxPrice !== undefined ? { priceMinor: { lte: options.maxPrice } } : {}),
        ...(term.length >= 2
          ? {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { ...LISTING_INCLUDE, saves: { where: { profileId: profile.id }, select: { profileId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return listings.map((listing) => this.shape(listing, listing.saves.length > 0, profile.id));
  }

  async detail(userId: string, slug: string) {
    const profile = await this.profileFor(userId);

    const listing = await this.prisma.listing.findFirst({
      where: { slug, deletedAt: null },
      include: { ...LISTING_INCLUDE, saves: { where: { profileId: profile.id }, select: { profileId: true } } },
    });

    if (!listing) throw new NotFoundException('Listing not found');

    if (listing.status !== 'ACTIVE' && listing.sellerId !== profile.id) {
      throw new NotFoundException('Listing not found');
    }

    return this.shape(listing, listing.saves.length > 0, profile.id);
  }

  async create(
    userId: string,
    input: {
      title: string;
      description?: string;
      kind?: ListingKind;
      condition?: ListingCondition;
      price: number;
      currency?: string;
      negotiable?: boolean;
      quantity?: number;
      category?: BusinessCategory;
      city?: string;
      businessSlug?: string;
    },
  ) {
    const profile = await this.profileFor(userId);
    const currency = (input.currency ?? profile.currency).toUpperCase();

    if (!isSupportedCurrency(currency)) {
      throw new BadRequestException(`${currency} is not a supported currency`);
    }

    const priceMinor = toMinor(input.price, currency);

    if (priceMinor < 0) throw new BadRequestException('A price cannot be negative');

    let businessId: string | undefined;

    if (input.businessSlug) {
      const business = await this.prisma.business.findFirst({
        where: { slug: input.businessSlug, deletedAt: null },
        select: { id: true },
      });

      if (!business) throw new NotFoundException('Business not found');

      await this.businesses.requireRole(profile.id, business.id, 'STAFF');

      businessId = business.id;
    }

    const listing = await this.prisma.listing.create({
      data: {
        slug: await this.uniqueSlug(input.title),
        sellerId: profile.id,
        businessId,
        title: input.title,
        description: input.description,
        kind: input.kind ?? 'PRODUCT',
        condition: input.kind === 'SERVICE' ? null : input.condition,
        priceMinor,
        currency,
        negotiable: input.negotiable ?? false,
        quantity: input.quantity ?? 1,
        category: input.category ?? 'OTHER',
        city: input.city ?? profile.city,
      },
      include: LISTING_INCLUDE,
    });

    return this.shape(listing, false, profile.id);
  }

  async update(
    userId: string,
    slug: string,
    input: {
      title?: string;
      description?: string;
      price?: number;
      quantity?: number;
      status?: ListingStatus;
      negotiable?: boolean;
      category?: BusinessCategory;
    },
  ) {
    const profile = await this.profileFor(userId);
    const listing = await this.prisma.listing.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, sellerId: true, currency: true },
    });

    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== profile.id) throw new ForbiddenException('That is not your listing');

    const updated = await this.prisma.listing.update({
      where: { id: listing.id },
      data: {
        title: input.title,
        description: input.description,
        quantity: input.quantity,
        status: input.status,
        negotiable: input.negotiable,
        category: input.category,
        ...(input.price !== undefined
          ? { priceMinor: toMinor(input.price, listing.currency) }
          : {}),
      },
      include: LISTING_INCLUDE,
    });

    return this.shape(updated, false, profile.id);
  }

  async remove(userId: string, slug: string) {
    const profile = await this.profileFor(userId);
    const listing = await this.prisma.listing.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, sellerId: true },
    });

    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== profile.id) throw new ForbiddenException('That is not your listing');

    await this.prisma.listing.update({
      where: { id: listing.id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });

    return { id: listing.id, deleted: true };
  }

  async toggleSave(userId: string, slug: string, saved: boolean) {
    const profile = await this.profileFor(userId);
    const listing = await this.prisma.listing.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!listing) throw new NotFoundException('Listing not found');

    if (saved) {
      await this.prisma.listingSave.upsert({
        where: { listingId_profileId: { listingId: listing.id, profileId: profile.id } },
        create: { listingId: listing.id, profileId: profile.id },
        update: {},
      });
    } else {
      await this.prisma.listingSave
        .delete({
          where: { listingId_profileId: { listingId: listing.id, profileId: profile.id } },
        })
        .catch(() => undefined);
    }

    return { saved };
  }

  async categories() {
    const grouped = await this.prisma.listing.groupBy({
      by: ['category'],
      where: { deletedAt: null, status: 'ACTIVE' },
      _count: { _all: true },
    });

    return grouped
      .map((row) => ({ category: row.category, count: row._count._all }))
      .sort((a, b) => b.count - a.count);
  }
}
