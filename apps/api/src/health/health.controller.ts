import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'nexus-api',
      environment: this.config.get('NODE_ENV', { infer: true }),
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
