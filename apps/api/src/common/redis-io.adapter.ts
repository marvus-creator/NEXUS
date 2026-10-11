import { Logger, type INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private clients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
    private readonly origin: string,
  ) {
    super(app);
  }

  async connect() {
    if (!this.redisUrl) {
      this.logger.log('No REDIS_URL set, realtime runs single-instance');
      return;
    }

    try {
      const publisher = new Redis(this.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
      const subscriber = publisher.duplicate();

      await publisher.connect();
      await subscriber.connect();

      this.clients = [publisher, subscriber];
      this.adapterConstructor = createAdapter(publisher, subscriber);

      this.logger.log('Realtime is using the Redis adapter');
    } catch (error) {
      this.logger.warn(
        `Redis unavailable, realtime will run single-instance only: ${(error as Error).message}`,
      );
    }
  }

  async close() {
    await Promise.all(this.clients.map((client) => client.quit().catch(() => undefined)));
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin, credentials: true },
      addTrailingSlash: false,
    } as ServerOptions);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
