import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { MailModule } from './mail/mail.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PlannerModule } from './planner/planner.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['../../.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    MailModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    ProfilesModule,
    PlannerModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
