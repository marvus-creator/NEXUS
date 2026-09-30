import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';
import type { User, UserStatus } from '@nexus/db';
import { AuditService } from '../audit/audit.service.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Env } from '../config/env.js';
import { SecurityStore } from '../common/security-store.service.js';
import { TokensService, type AccessTokenPayload } from './tokens.service.js';
import type { RegisterDto } from './dto/register.dto.js';

const MAX_LOGIN_FAILURES = Number(process.env.MAX_LOGIN_FAILURES ?? 6);
import type { LoginDto } from './dto/login.dto.js';

const ARGON_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<Env, true>,
    private readonly security: SecurityStore,
  ) {}

  private failureKey(email: string, ip?: string) {
    return `${email.toLowerCase()}|${ip ?? 'unknown'}`;
  }

  private get isProduction() {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  private toPayload(user: User): AccessTokenPayload {
    return {
      sub: user.id,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }

  private async createVerificationToken(userId: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
    const token = randomBytes(32).toString('base64url');
    const ttl = purpose === 'EMAIL_VERIFICATION' ? VERIFICATION_TTL_MS : RESET_TTL_MS;

    await this.prisma.verificationToken.create({
      data: {
        userId,
        purpose,
        tokenHash: this.tokens.hashToken(token),
        expiresAt: new Date(Date.now() + ttl),
      },
    });

    return token;
  }

  async register(dto: RegisterDto, context: RequestContext) {
    const registration = await this.prisma.platformSetting.findUnique({
      where: { key: 'registrationOpen' },
      select: { value: true },
    });

    if (registration?.value === false) {
      throw new ForbiddenException('New sign-ups are paused right now. Please try again later.');
    }

    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } }),
      this.prisma.profile.findUnique({ where: { username: dto.username }, select: { id: true } }),
    ]);

    if (existingEmail) {
      throw new ConflictException('An account with that email already exists');
    }

    if (existingUsername) {
      throw new ConflictException('That username is already taken');
    }

    const passwordHash = await hash(dto.password, ARGON_OPTIONS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        status: 'PENDING',
        profile: {
          create: {
            username: dto.username,
            displayName: dto.displayName,
            privacy: { create: {} },
          },
        },
      },
    });

    const token = await this.createVerificationToken(user.id, 'EMAIL_VERIFICATION');
    await this.mail.sendEmailVerification(user.email, token);

    await this.audit.record({
      action: 'auth.register',
      actorUserId: user.id,
      entityType: 'User',
      entityId: user.id,
      ...context,
    });

    await this.notifications.notify({
      userId: user.id,
      category: 'SYSTEM',
      title: 'Welcome to Nexus',
      body: 'Build your Nexus in five short steps and this place becomes yours.',
      href: '/onboarding',
    });

    const session = await this.issueSession(user, context);

    return {
      ...session,
      verificationToken: this.isProduction ? undefined : token,
    };
  }

  private async liftExpiredSuspension(user: {
    id: string;
    status: UserStatus;
    suspendedUntil: Date | null;
  }) {
    if (
      user.status !== 'SUSPENDED' ||
      !user.suspendedUntil ||
      user.suspendedUntil.getTime() > Date.now()
    ) {
      return { status: user.status, suspendedUntil: user.suspendedUntil };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', suspendedUntil: null, suspendedReason: null },
    });

    await this.audit.record({
      action: 'moderation.user.suspension_expired',
      actorUserId: null,
      entityType: 'user',
      entityId: user.id,
    });

    return { status: 'ACTIVE' as UserStatus, suspendedUntil: null };
  }

  async login(dto: LoginDto, context: RequestContext) {
    const key = this.failureKey(dto.email, context.ipAddress);

    if ((await this.security.failureCount(key)) >= MAX_LOGIN_FAILURES) {
      await this.audit.record({
        action: 'auth.login.locked',
        metadata: { email: dto.email },
        ...context,
      });
      throw new HttpException(
        'Too many failed attempts. Wait a few minutes and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || user.deletedAt) {
      await this.simulateHashWork();
      await this.security.recordFailure(key);
      await this.audit.record({
        action: 'auth.login.failed',
        metadata: { email: dto.email, reason: 'no_account' },
        ...context,
      });
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const valid = await verify(user.passwordHash, dto.password);

    if (!valid) {
      await this.security.recordFailure(key);
      await this.audit.record({
        action: 'auth.login.failed',
        actorUserId: user.id,
        metadata: { reason: 'bad_password' },
        ...context,
      });
      throw new UnauthorizedException('Email or password is incorrect');
    }

    await this.security.clearFailures(key);

    const served = await this.liftExpiredSuspension(user);

    if (served.status === 'SUSPENDED' || served.status === 'DEACTIVATED') {
      await this.audit.record({
        action: 'auth.login.blocked',
        actorUserId: user.id,
        metadata: { status: served.status, until: served.suspendedUntil },
        ...context,
      });
      throw new UnauthorizedException(
        served.status === 'SUSPENDED' && served.suspendedUntil
          ? `This account is suspended until ${served.suspendedUntil.toISOString().slice(0, 10)}`
          : 'This account is not active',
      );
    }

    user.status = served.status;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      action: 'auth.login.success',
      actorUserId: user.id,
      ...context,
    });

    return this.issueSession(user, context);
  }

  async refresh(refreshToken: string, context: RequestContext) {
    const { user, rotated } = await this.tokens.consumeRefreshToken(refreshToken, context);

    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      await this.tokens.revokeAllSessions(user.id);
      throw new UnauthorizedException('This account is not active');
    }

    const accessToken = await this.tokens.signAccessToken(this.toPayload(user));

    await this.audit.record({
      action: 'auth.refresh',
      actorUserId: user.id,
      ...context,
    });

    return { user, accessToken, refresh: rotated };
  }

  async logout(refreshToken: string | undefined, userId: string | undefined, context: RequestContext) {
    if (refreshToken) {
      await this.tokens.revokeSession(refreshToken);
    }

    await this.audit.record({ action: 'auth.logout', actorUserId: userId ?? null, ...context });
  }

  async logoutEverywhere(userId: string, context: RequestContext) {
    await this.tokens.revokeAllSessions(userId);
    await this.audit.record({ action: 'auth.logout.all', actorUserId: userId, ...context });
  }

  async verifyEmail(token: string, context: RequestContext) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: this.tokens.hashToken(token) },
      include: { user: true },
    });

    if (!record || record.purpose !== 'EMAIL_VERIFICATION') {
      throw new BadRequestException('That confirmation link is not valid');
    }

    if (record.consumedAt) {
      throw new BadRequestException('That confirmation link has already been used');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('That confirmation link has expired');
    }

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: record.user.status === 'PENDING' ? 'ACTIVE' : record.user.status,
        },
      }),
    ]);

    await this.audit.record({
      action: 'auth.email.verified',
      actorUserId: record.userId,
      ...context,
    });

    return { verified: true };
  }

  async resendVerification(email: string, context: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && !user.emailVerifiedAt) {
      await this.prisma.verificationToken.updateMany({
        where: { userId: user.id, purpose: 'EMAIL_VERIFICATION', consumedAt: null },
        data: { consumedAt: new Date() },
      });

      const token = await this.createVerificationToken(user.id, 'EMAIL_VERIFICATION');
      await this.mail.sendEmailVerification(user.email, token);

      await this.audit.record({
        action: 'auth.email.verification_resent',
        actorUserId: user.id,
        ...context,
      });
    }

    return { sent: true };
  }

  async forgotPassword(email: string, context: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && !user.deletedAt) {
      await this.prisma.verificationToken.updateMany({
        where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null },
        data: { consumedAt: new Date() },
      });

      const token = await this.createVerificationToken(user.id, 'PASSWORD_RESET');
      await this.mail.sendPasswordReset(user.email, token);

      await this.audit.record({
        action: 'auth.password.reset_requested',
        actorUserId: user.id,
        ...context,
      });

      if (!this.isProduction) {
        return { sent: true, resetToken: token };
      }
    }

    return { sent: true };
  }

  async resetPassword(token: string, password: string, context: RequestContext) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: this.tokens.hashToken(token) },
    });

    if (!record || record.purpose !== 'PASSWORD_RESET') {
      throw new BadRequestException('That reset link is not valid');
    }

    if (record.consumedAt) {
      throw new BadRequestException('That reset link has already been used');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('That reset link has expired');
    }

    const passwordHash = await hash(password, ARGON_OPTIONS);

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
    ]);

    await this.tokens.revokeAllSessions(record.userId);

    await this.audit.record({
      action: 'auth.password.reset',
      actorUserId: record.userId,
      ...context,
    });

    return { reset: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    context: RequestContext,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await verify(user.passwordHash, currentPassword);

    if (!valid) {
      await this.audit.record({
        action: 'auth.password.change_failed',
        actorUserId: userId,
        ...context,
      });
      throw new UnauthorizedException('Your current password is incorrect');
    }

    const passwordHash = await hash(newPassword, ARGON_OPTIONS);

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokens.revokeAllSessions(userId);

    await this.audit.record({
      action: 'auth.password.changed',
      actorUserId: userId,
      ...context,
    });

    return { changed: true };
  }

  async currentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            privacy: true,
            interests: { include: { interest: true } },
            scheduleBlocks: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Account no longer exists');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt,
      profile: user.profile && {
        id: user.profile.id,
        username: user.profile.username,
        displayName: user.profile.displayName,
        avatarUrl: user.profile.avatarUrl,
        bio: user.profile.bio,
        occupation: user.profile.occupation,
        userType: user.profile.userType,
        countryCode: user.profile.countryCode,
        city: user.profile.city,
        timezone: user.profile.timezone,
        locale: user.profile.locale,
        currency: user.profile.currency,
        goalAreas: user.profile.goalAreas,
        helpAreas: user.profile.helpAreas,
        skills: user.profile.skills,
        onboardingStep: user.profile.onboardingStep,
        onboardedAt: user.profile.onboardedAt,
        interests: user.profile.interests.map((link) => ({
          slug: link.interest.slug,
          label: link.interest.label,
        })),
        scheduleBlocks: user.profile.scheduleBlocks,
        privacy: user.profile.privacy,
      },
    };
  }

  async listSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? this.tokens.hashToken(currentRefreshToken) : null;

    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      current: currentHash !== null && session.refreshTokenHash === currentHash,
    }));
  }

  private async issueSession(user: User, context: RequestContext) {
    const accessToken = await this.tokens.signAccessToken(this.toPayload(user));
    const refresh = await this.tokens.issueRefreshToken(user.id, context);

    return { user, accessToken, refresh };
  }

  private async simulateHashWork() {
    await hash('nexus-timing-equaliser', ARGON_OPTIONS);
  }
}
