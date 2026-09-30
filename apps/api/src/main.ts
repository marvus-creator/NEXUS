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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

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

  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);

  console.log(`nexus-api listening on http://localhost:${port}/api/v1`);
}

await bootstrap();
