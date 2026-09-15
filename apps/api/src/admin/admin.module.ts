import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminController } from './admin.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { ModerationService } from './moderation.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [ModerationService, AnalyticsService],
  exports: [ModerationService, AnalyticsService],
})
export class AdminModule {}
