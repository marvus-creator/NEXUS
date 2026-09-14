import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../auth/tokens.service.js';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();

    if (!request.user?.emailVerified) {
      throw new ForbiddenException('Confirm your email address to do this');
    }

    return true;
  }
}
