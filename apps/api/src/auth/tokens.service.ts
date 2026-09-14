import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserRole, UserStatus } from '@nexus/db';
import type { Response } from 'express';
import type { Env } from '../config/env.js';
import { durationToMs } from '../common/util/duration.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
};

export const ACCESS_COOKIE = 'nexus_access';
export const REFRESH_COOKIE = 'nexus_refresh';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export type IssuedRefreshToken = {
  token: string;
  sessionId: string;
  expiresAt: Date;
};

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  private get isProduction() {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async signAccessToken(payload: AccessTokenPayload) {
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  async issueRefreshToken(
    userId: string,
    context: { ipAddress?: string; userAgent?: string },
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString('base64url');
    const ttl = durationToMs(this.config.get('JWT_REFRESH_TTL', { infer: true }));
    const expiresAt = new Date(Date.now() + ttl);

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.hashToken(token),
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return { token, sessionId: session.id, expiresAt };
  }

  async consumeRefreshToken(token: string, context: { ipAddress?: string; userAgent?: string }) {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: this.hashToken(token) },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${session.userId}; revoking all active sessions`,
      );
      await this.revokeAllSessions(session.userId);
      throw new UnauthorizedException('Session reuse detected. Please sign in again.');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session expired');
    }

    const rotated = await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });

      const nextToken = randomBytes(48).toString('base64url');
      const ttl = durationToMs(this.config.get('JWT_REFRESH_TTL', { infer: true }));
      const expiresAt = new Date(Date.now() + ttl);

      const nextSession = await tx.session.create({
        data: {
          userId: session.userId,
          refreshTokenHash: this.hashToken(nextToken),
          expiresAt,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return { token: nextToken, sessionId: nextSession.id, expiresAt };
    });

    return { session, user: session.user, rotated };
  }

  async revokeSession(token: string) {
    const hash = this.hashToken(token);

    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  setAuthCookies(response: Response, accessToken: string, refresh: IssuedRefreshToken) {
    const accessTtl = durationToMs(this.config.get('JWT_ACCESS_TTL', { infer: true }));

    response.cookie(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: accessTtl,
    });

    response.cookie(REFRESH_COOKIE, refresh.token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      expires: refresh.expiresAt,
    });
  }

  clearAuthCookies(response: Response) {
    response.clearCookie(ACCESS_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }
}
