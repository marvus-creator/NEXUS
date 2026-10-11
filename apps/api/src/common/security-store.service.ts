import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

const REVOKED = 'nexus:revoked:user:';
const FAILED = 'nexus:login-failures:';

type Store = {
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  close(): Promise<void>;
};

class MemoryStore implements Store {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  private live(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async get(key: string) {
    return this.live(key)?.value ?? null;
  }

  async del(key: string) {
    this.entries.delete(key);
  }

  async incr(key: string, ttlSeconds: number) {
    const current = this.live(key);
    const next = Number(current?.value ?? 0) + 1;
    this.entries.set(key, {
      value: String(next),
      expiresAt: current?.expiresAt ?? Date.now() + ttlSeconds * 1000,
    });
    return next;
  }

  async close() {
    this.entries.clear();
  }
}

class RedisStore implements Store {
  constructor(private readonly client: Redis) {}

  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async incr(key: string, ttlSeconds: number) {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, ttlSeconds);
    return count;
  }

  async close() {
    await this.client.quit().catch(() => undefined);
  }
}

@Injectable()
export class SecurityStore implements OnModuleDestroy {
  private readonly logger = new Logger(SecurityStore.name);
  private readonly store: Store;
  private readonly ttlSeconds = 15 * 60;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('REDIS_URL', { infer: true });

    if (!url) {
      this.store = new MemoryStore();
      this.logger.log('No REDIS_URL set, keeping sessions and login limits in memory');
      return;
    }

    const client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    client.on('error', (error: Error) => {
      this.logger.warn(`revocation store unavailable: ${error.message}`);
    });
    this.store = new RedisStore(client);
  }

  async revoke(userId: string) {
    try {
      await this.store.set(`${REVOKED}${userId}`, Date.now().toString(), this.ttlSeconds);
    } catch (error) {
      this.logger.error(`could not revoke access for ${userId}: ${String(error)}`);
      throw error;
    }
  }

  async clear(userId: string) {
    try {
      await this.store.del(`${REVOKED}${userId}`);
    } catch {
      this.logger.warn(`could not clear revocation for ${userId}`);
    }
  }

  async isRevoked(userId: string, issuedAtMs?: number) {
    try {
      const revokedAt = await this.store.get(`${REVOKED}${userId}`);
      if (revokedAt === null) return false;
      if (issuedAtMs === undefined) return true;
      return issuedAtMs <= Number(revokedAt);
    } catch {
      return false;
    }
  }

  async recordFailure(key: string, windowSeconds = 900) {
    try {
      return await this.store.incr(`${FAILED}${key}`, windowSeconds);
    } catch {
      return 0;
    }
  }

  async failureCount(key: string) {
    try {
      return Number((await this.store.get(`${FAILED}${key}`)) ?? 0);
    } catch {
      return 0;
    }
  }

  async clearFailures(key: string) {
    try {
      await this.store.del(`${FAILED}${key}`);
    } catch {
      this.logger.warn(`could not clear login failures for ${key}`);
    }
  }

  async onModuleDestroy() {
    await this.store.close();
  }
}
