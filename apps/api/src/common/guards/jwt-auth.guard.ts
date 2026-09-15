import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ACCESS_COOKIE, AccessTokenPayload, TokensService } from '../../auth/tokens.service.js';
import { SecurityStore } from '../security-store.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly revocations: SecurityStore,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const token = this.extractToken(request);

    if (isPublic) {
      if (token) {
        try {
          request.user = await this.tokens.verifyAccessToken(token);
        } catch {
          request.user = undefined;
        }
      }

      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const payload = await this.tokens.verifyAccessToken(token);

    if (payload.status === 'SUSPENDED' || payload.status === 'DEACTIVATED') {
      throw new UnauthorizedException('This account is not active');
    }

    if (await this.revocations.isRevoked(payload.sub)) {
      throw new UnauthorizedException('This session is no longer valid');
    }

    request.user = payload;
    return true;
  }

  private extractToken(request: Request) {
    const header = request.headers.authorization;

    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }

    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[ACCESS_COOKIE];
  }
}
