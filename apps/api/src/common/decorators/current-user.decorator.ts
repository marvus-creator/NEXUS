import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../auth/tokens.service.js';

export const CurrentUser = createParamDecorator((data: keyof AccessTokenPayload | undefined, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
  const user = request.user;

  if (!user) return undefined;

  return data ? user[data] : user;
});
