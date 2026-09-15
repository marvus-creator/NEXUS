import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { BusinessCategory, BusinessRole, BusinessStatus } from '@nexus/db';
import { PrismaService } from '../prisma/prisma.service.js';

const RANK: Record<BusinessRole, number> = { OWNER: 3, MANAGER: 2, STAFF: 1 };

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

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, city: true, countryCode: true, currency: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async uniqueSlug(base: string) {
    let slug = slugify(base) || randomBytes(4).toString('hex');
    let attempt = 1;

    while (
      await this.prisma.business.findUnique({ where: { slug }, select: { id: true } })
    ) {
      attempt += 1;
      slug = `${slugify(base) || 'business'}-${attempt}`;
    }

    return slug;
  }

  async membershipOf(profileId: string, businessId: string) {
    return this.prisma.businessMember.findUnique({
      where: { businessId_profileId: { businessId, profileId } },
    });
  }

  async requireRole(profileId: string, businessId: string, minimum: BusinessRole) {
    const membership = await this.membershipOf(profileId, businessId);

    if (!membership || RANK[membership.role] < RANK[minimum]) {
      throw new ForbiddenException('You do not have permission on that business');
    }

    return membership;
  }

  async list(
    userId: string,
    options: { scope?: 'all' | 'mine'; category?: BusinessCategory; city?: string; query?: string } = {},
  ) {
    const profile = await this.profileFor(userId);

    const businesses = await this.prisma.business.findMany({
      where: {
        deletedAt: null,
        ...(options.scope === 'mine'
          ? { members: { some: { profileId: profile.id } } }
          : { status: 'ACTIVE' }),
        ...(options.category ? { category: options.category } : {}),
        ...(options.city ? { city: { equals: options.city, mode: 'insensitive' } } : {}),
        ...(options.query && options.query.trim().length >= 2
          ? {
              OR: [
                { name: { contains: options.query.trim(), mode: 'insensitive' } },
                { tagline: { contains: options.query.trim(), mode: 'insensitive' } },
                { description: { contains: options.query.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        place: { select: { slug: true, name: true, city: true } },
        members: { where: { profileId: profile.id }, select: { role: true } },
        _count: { select: { listings: true } },
      },
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    });

    return businesses.map((business) => this.shape(business));
  }

  private shape(business: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    category: BusinessCategory;
    status: BusinessStatus;
    logoUrl: string | null;
    coverUrl: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    city: string | null;
    countryCode: string;
    currency: string;
    verified: boolean;
    createdAt: Date;
    place?: { slug: string; name: string; city: string | null } | null;
    members?: { role: BusinessRole }[];
    _count?: { listings: number };
  }) {
    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      tagline: business.tagline,
      description: business.description,
      category: business.category,
      status: business.status,
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
      phone: business.phone,
      email: business.email,
      website: business.website,
      city: business.city,
      countryCode: business.countryCode,
      currency: business.currency,
      verified: business.verified,
      createdAt: business.createdAt,
      place: business.place ?? null,
      myRole: business.members?.[0]?.role ?? null,
      listingCount: business._count?.listings ?? 0,
    };
  }

  async detail(userId: string, slug: string) {
    const profile = await this.profileFor(userId);

    const business = await this.prisma.business.findFirst({
      where: { slug, deletedAt: null },
      include: {
        place: { select: { slug: true, name: true, city: true } },
        members: {
          include: {
            profile: { select: { username: true, displayName: true, avatarUrl: true } },
          },
        },
        _count: { select: { listings: true } },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    const mine = business.members.find((member) => member.profileId === profile.id);

    if (business.status !== 'ACTIVE' && !mine) {
      throw new NotFoundException('Business not found');
    }

    return {
      ...this.shape({ ...business, members: mine ? [{ role: mine.role }] : [] }),
      team: business.members.map((member) => ({
        role: member.role,
        username: member.profile.username,
        displayName: member.profile.displayName,
        avatarUrl: member.profile.avatarUrl,
      })),
    };
  }

  async create(
    userId: string,
    input: {
      name: string;
      tagline?: string;
      description?: string;
      category?: BusinessCategory;
      phone?: string;
      email?: string;
      website?: string;
      city?: string;
      placeSlug?: string;
    },
  ) {
    const profile = await this.profileFor(userId);

    let placeId: string | undefined;

    if (input.placeSlug) {
      const place = await this.prisma.place.findFirst({
        where: { slug: input.placeSlug, deletedAt: null },
        select: { id: true },
      });

      if (!place) throw new NotFoundException('Place not found');

      placeId = place.id;
    }

    const business = await this.prisma.business.create({
      data: {
        slug: await this.uniqueSlug(input.name),
        name: input.name,
        tagline: input.tagline,
        description: input.description,
        category: input.category ?? 'OTHER',
        phone: input.phone,
        email: input.email,
        website: input.website,
        city: input.city ?? profile.city,
        countryCode: profile.countryCode,
        currency: profile.currency,
        placeId,
        members: { create: { profileId: profile.id, role: 'OWNER' } },
      },
      include: {
        place: { select: { slug: true, name: true, city: true } },
        members: { where: { profileId: profile.id }, select: { role: true } },
        _count: { select: { listings: true } },
      },
    });

    return this.shape(business);
  }

  async update(
    userId: string,
    slug: string,
    input: {
      name?: string;
      tagline?: string;
      description?: string;
      category?: BusinessCategory;
      status?: BusinessStatus;
      phone?: string;
      email?: string;
      website?: string;
      city?: string;
    },
  ) {
    const profile = await this.profileFor(userId);
    const business = await this.prisma.business.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!business) throw new NotFoundException('Business not found');

    await this.requireRole(profile.id, business.id, 'MANAGER');

    const updated = await this.prisma.business.update({
      where: { id: business.id },
      data: input,
      include: {
        place: { select: { slug: true, name: true, city: true } },
        members: { where: { profileId: profile.id }, select: { role: true } },
        _count: { select: { listings: true } },
      },
    });

    return this.shape(updated);
  }

  async addMember(userId: string, slug: string, username: string, role: BusinessRole) {
    const profile = await this.profileFor(userId);
    const business = await this.prisma.business.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!business) throw new NotFoundException('Business not found');

    const actor = await this.requireRole(profile.id, business.id, 'MANAGER');

    if (RANK[role] >= RANK[actor.role] && actor.role !== 'OWNER') {
      throw new ForbiddenException('You cannot grant a role at or above your own');
    }

    if (role === 'OWNER' && actor.role !== 'OWNER') {
      throw new ForbiddenException('Only an owner can add another owner');
    }

    const target = await this.prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    if (!target) throw new NotFoundException('No one by that username');

    if (await this.membershipOf(target.id, business.id)) {
      throw new BadRequestException('They are already on the team');
    }

    return this.prisma.businessMember.create({
      data: { businessId: business.id, profileId: target.id, role },
    });
  }

  async removeMember(userId: string, slug: string, username: string) {
    const profile = await this.profileFor(userId);
    const business = await this.prisma.business.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!business) throw new NotFoundException('Business not found');

    const actor = await this.requireRole(profile.id, business.id, 'MANAGER');

    const target = await this.prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    if (!target) throw new NotFoundException('No one by that username');

    const membership = await this.membershipOf(target.id, business.id);

    if (!membership) throw new NotFoundException('They are not on the team');

    if (membership.role === 'OWNER') {
      const owners = await this.prisma.businessMember.count({
        where: { businessId: business.id, role: 'OWNER' },
      });

      if (owners <= 1) throw new BadRequestException('A business needs at least one owner');
    }

    if (RANK[membership.role] >= RANK[actor.role] && actor.profileId !== membership.profileId) {
      throw new ForbiddenException('You cannot remove someone at or above your own role');
    }

    await this.prisma.businessMember.delete({
      where: { businessId_profileId: { businessId: business.id, profileId: target.id } },
    });

    return { removed: true };
  }

  async remove(userId: string, slug: string) {
    const profile = await this.profileFor(userId);
    const business = await this.prisma.business.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!business) throw new NotFoundException('Business not found');

    await this.requireRole(profile.id, business.id, 'OWNER');

    await this.prisma.$transaction([
      this.prisma.listing.updateMany({
        where: { businessId: business.id, deletedAt: null },
        data: { status: 'ARCHIVED' },
      }),
      this.prisma.business.update({
        where: { id: business.id },
        data: { deletedAt: new Date(), status: 'CLOSED' },
      }),
    ]);

    return { id: business.id, deleted: true };
  }

  async categories() {
    const grouped = await this.prisma.business.groupBy({
      by: ['category'],
      where: { deletedAt: null, status: 'ACTIVE' },
      _count: { _all: true },
    });

    return grouped
      .map((row) => ({ category: row.category, count: row._count._all }))
      .sort((a, b) => b.count - a.count);
  }
}
