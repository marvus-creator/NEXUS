import type { Request } from 'express';

export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }

  return request.ip ?? request.socket.remoteAddress ?? undefined;
}

export function userAgent(request: Request): string | undefined {
  const value = request.headers['user-agent'];
  return typeof value === 'string' ? value.slice(0, 512) : undefined;
}
