import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { RedisIoAdapter } from './common/redis-io.adapter.js';
import { StorageService } from './storage/storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  app.set('query parser', (raw: string) => {
    const params: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(raw)) {
      if (!(key in params)) params[key] = value;
    }
    return params;
  });

  app.use(helmet());
  app.use('/uploads', (_request: unknown, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.use(cookieParser());

  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });

  const hops = config.get('TRUST_PROXY_HOPS', { infer: true });
  if (hops > 0) app.set('trust proxy', hops);

  if (config.get('STORAGE_DRIVER', { infer: true }) === 'database') {
    const storage = app.get(StorageService);

    app.use(
      '/uploads',
      (
        request: { method: string; path: string },
        response: {
          status: (code: number) => { end: () => void };
          setHeader: (name: string, value: string) => void;
          end: (body: Buffer) => void;
        },
        next: () => void,
      ) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') return next();
        const key = decodeURIComponent(request.path.replace(/^\//, ''));
        if (!/^[a-z]+\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(key)) return next();
        storage
          .readStored(key)
          .then((file) => {
            if (!file) return next();
            response.setHeader('Content-Type', file.contentType);
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            response.setHeader('X-Content-Type-Options', 'nosniff');
            response.end(Buffer.from(file.bytes));
          })
          .catch(() => response.status(500).end());
      },
    );
  }

  app.useStaticAssets(path.resolve(process.cwd(), '../../uploads'), { prefix: '/uploads/' });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const redisAdapter = new RedisIoAdapter(
    app,
    config.get('REDIS_URL', { infer: true }),
    config.get('WEB_ORIGIN', { infer: true }),
  );
  await redisAdapter.connect();
  app.useWebSocketAdapter(redisAdapter);

  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true }) ?? config.get('API_PORT', { infer: true });
  await app.listen(port);

  console.log(`nexus-api listening on http://localhost:${port}/api/v1`);
}

await bootstrap();
