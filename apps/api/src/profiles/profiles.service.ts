import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { OnboardingStepDto } from './dto/onboarding.dto.js';
import type { UpdatePrivacyDto, UpdateProfileDto } from './dto/update-profile.dto.js';

const TOTAL_STEPS = 5;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async listInterests() {
    const interests = await this.prisma.interest.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const grouped = new Map<string, typeof interests>();

    for (const interest of interests) {
      const bucket = grouped.get(interest.category) ?? [];
      bucket.push(interest);
      grouped.set(interest.category, bucket);
    }

    return [...grouped.entries()].map(([category, items]) => ({
      category,
      interests: items.map((item) => ({
        slug: item.slug,
        label: item.label,
        tint: item.tint,
      })),
    }));
  }

  private async requireProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  private async linkInterests(profileId: string, slugs: string[]) {
    const interests = await this.prisma.interest.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });

    const missing = slugs.filter((slug) => !interests.some((item) => item.slug === slug));

    if (missing.length > 0) {
      throw new BadRequestException(`Unknown interests: ${missing.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.profileInterest.deleteMany({ where: { profileId } }),
      this.prisma.profileInterest.createMany({
        data: interests.map((interest) => ({ profileId, interestId: interest.id })),
      }),
    ]);
  }

  private async replaceSchedule(profileId: string, blocks: OnboardingStepDto['scheduleBlocks']) {
    if (!blocks) return;

    for (const block of blocks) {
      if (block.endMinute <= block.startMinute) {
        throw new BadRequestException(`"${block.label}" ends before it starts`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.scheduleBlock.deleteMany({ where: { profileId } }),
      ...(blocks.length > 0
        ? [
            this.prisma.scheduleBlock.createMany({
              data: blocks.map((block) => ({ profileId, ...block })),
            }),
          ]
        : []),
    ]);
  }

  async saveOnboardingStep(userId: string, dto: OnboardingStepDto) {
    const profile = await this.requireProfile(userId);

    if (dto.interestSlugs) {
      await this.linkInterests(profile.id, dto.interestSlugs);
    }

    if (dto.scheduleBlocks) {
      await this.replaceSchedule(profile.id, dto.scheduleBlocks);
    }

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        userType: dto.userType,
        occupation: dto.occupation,
        city: dto.city,
        goalAreas: dto.goalAreas,
        helpAreas: dto.helpAreas,
        onboardingStep: Math.max(profile.onboardingStep, dto.step),
      },
    });

    return { onboardingStep: updated.onboardingStep, totalSteps: TOTAL_STEPS };
  }

  async completeOnboarding(userId: string, context: { ipAddress?: string; userAgent?: string }) {
    const profile = await this.requireProfile(userId);

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        onboardingStep: TOTAL_STEPS,
        onboardedAt: profile.onboardedAt ?? new Date(),
      },
    });

    await this.notifications.notify({
      userId,
      category: 'IMPORTANT',
      title: 'Your Nexus is ready',
      body: 'Home now works from your real schedule, interests and goals.',
      href: '/home',
    });

    await this.audit.record({
      action: 'profile.onboarding.completed',
      actorUserId: userId,
      entityType: 'Profile',
      entityId: profile.id,
      ...context,
    });

    return { onboardedAt: updated.onboardedAt };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.requireProfile(userId);

    if (dto.interestSlugs) {
      await this.linkInterests(profile.id, dto.interestSlugs);
    }

    const { interestSlugs, ...rest } = dto;

    await this.prisma.profile.update({
      where: { id: profile.id },
      data: rest,
    });

    return { updated: true };
  }

  async updatePrivacy(userId: string, dto: UpdatePrivacyDto) {
    const profile = await this.requireProfile(userId);

    await this.prisma.privacySettings.upsert({
      where: { profileId: profile.id },
      create: { profileId: profile.id, ...dto },
      update: dto,
    });

    return { updated: true };
  }

  async setAvatar(userId: string, avatarUrl: string) {
    const profile = await this.requireProfile(userId);

    await this.prisma.profile.update({
      where: { id: profile.id },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  async getPublicProfile(username: string, viewerUserId?: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: {
        privacy: true,
        interests: { include: { interest: true } },
        user: { select: { id: true, status: true, emailVerifiedAt: true, createdAt: true } },
      },
    });

    if (!profile || profile.user.status === 'DEACTIVATED') {
      throw new NotFoundException('No such profile');
    }

    const isOwner = viewerUserId === profile.userId;
    const visibility = profile.privacy?.profileVisibility ?? 'PUBLIC';

    if (!isOwner && visibility === 'PRIVATE') {
      throw new ForbiddenException('This profile is private');
    }

    return {
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      coverUrl: profile.coverUrl,
      bio: profile.bio,
      occupation: profile.occupation,
      userType: profile.userType,
      countryCode: profile.countryCode,
      city: profile.city,
      skills: profile.skills,
      interests: profile.interests.map((link) => ({
        slug: link.interest.slug,
        label: link.interest.label,
      })),
      joinedAt: profile.user.createdAt,
      verified: profile.user.emailVerifiedAt !== null,
      isOwner,
    };
  }
}
