import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { CommonModule } from './common/common.module.js';
import { DiscoverModule } from './discover/discover.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { CirclesModule } from './circles/circles.module.js';
import { EventsModule } from './events/events.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { PlacesModule } from './places/places.module.js';
import { PeopleModule } from './people/people.module.js';
import { LearningModule } from './learning/learning.module.js';
import { MarketModule } from './market/market.module.js';
import { WalletModule } from './wallet/wallet.module.js';
import { PlannerModule } from './planner/planner.module.js';
import { SocialModule } from './social/social.module.js';
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
    CommonModule,
    PrismaModule,
    AuditModule,
    MailModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    ProfilesModule,
    PlannerModule,
    LearningModule,
    WalletModule,
    MarketModule,
    AdminModule,
    DiscoverModule,
    PeopleModule,
    SocialModule,
    CirclesModule,
    MessagingModule,
    PlacesModule,
    EventsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
