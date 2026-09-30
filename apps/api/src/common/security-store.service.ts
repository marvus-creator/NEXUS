import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

const REVOKED = 'nexus:revoked:user:';
const FAILED = 'nexus:login-failures:';

@Injectable()
export class SecurityStore implements OnModuleDestroy {
  private readonly logger = new Logger(SecurityStore.name);
  private readonly client: Redis;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService<Env, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(`revocation store unavailable: ${error.message}`);
    });

    this.ttlSeconds = 15 * 60;
  }

  async revoke(userId: string) {
    try {
      await this.client.set(`${REVOKED}${userId}`, Date.now().toString(), 'EX', this.ttlSeconds);
    } catch (error) {
      this.logger.error(`could not revoke access for ${userId}: ${String(error)}`);
      throw error;
    }
  }

  async clear(userId: string) {
    try {
      await this.client.del(`${REVOKED}${userId}`);
    } catch {
      this.logger.warn(`could not clear revocation for ${userId}`);
    }
  }

  async isRevoked(userId: string, issuedAtMs?: number) {
    try {
      const revokedAt = await this.client.get(`${REVOKED}${userId}`);
      if (revokedAt === null) return false;
      if (issuedAtMs === undefined) return true;
      return issuedAtMs <= Number(revokedAt);
    } catch {
      return false;
    }
  }

  async recordFailure(key: string, windowSeconds = 900) {
    try {
      const count = await this.client.incr(`${FAILED}${key}`);

      if (count === 1) await this.client.expire(`${FAILED}${key}`, windowSeconds);

      return count;
    } catch {
      return 0;
    }
  }

  async failureCount(key: string) {
    try {
      return Number((await this.client.get(`${FAILED}${key}`)) ?? 0);
    } catch {
      return 0;
    }
  }

  async clearFailures(key: string) {
    try {
      await this.client.del(`${FAILED}${key}`);
    } catch {
      this.logger.warn(`could not clear login failures for ${key}`);
    }
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }
}
