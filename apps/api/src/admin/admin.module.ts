import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AdminController } from './admin.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { ControlController, PlatformController } from './control.controller.js';
import { ControlService } from './control.service.js';
import { ModerationService } from './moderation.service.js';

@Module({
  imports: [AuthModule, WalletModule],
  controllers: [AdminController, ControlController, PlatformController],
  providers: [ModerationService, AnalyticsService, ControlService],
  exports: [ModerationService, AnalyticsService, ControlService],
})
export class AdminModule {}
