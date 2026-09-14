import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async check() {
    const databaseUp = await this.prisma.isHealthy();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      service: 'nexus-api',
      environment: this.config.get('NODE_ENV', { infer: true }),
      checks: {
        database: databaseUp ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
