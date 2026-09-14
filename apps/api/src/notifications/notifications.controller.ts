import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';
import type { NotificationCategory } from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  importantInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  socialInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  eventsInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  learningInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  goalsInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  discoverInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  systemInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDigest?: boolean;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query('category') category?: NotificationCategory,
    @Query('unread') unread?: string,
  ) {
    return this.notifications.list(userId, { category, unreadOnly: unread === 'true' });
  }

  @Get('count')
  count(@CurrentUser('sub') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Get('preferences')
  preferences(@CurrentUser('sub') userId: string) {
    return this.notifications.preferences(userId);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser('sub') userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.notifications.updatePreferences(userId, dto as Record<string, boolean>);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notifications.remove(userId, id);
  }
}
