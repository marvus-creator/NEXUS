import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@nexus/db';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AccessTokenPayload } from '../../auth/tokens.service.js';

const RANK: Record<UserRole, number> = {
  USER: 0,
  BUSINESS: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const user = request.user;

    if (!user) throw new ForbiddenException('Insufficient permissions');

    const minimum = Math.min(...required.map((role) => RANK[role]));

    if (RANK[user.role] < minimum) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
