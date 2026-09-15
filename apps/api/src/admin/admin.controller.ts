import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { ReportStatus, UserRole } from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AnalyticsService } from './analytics.service.js';
import { ModerationService } from './moderation.service.js';

class ActOnReportDto {
  @IsEnum(['DISMISS', 'REMOVE_CONTENT', 'SUSPEND', 'WARN'])
  action!: 'DISMISS' | 'REMOVE_CONTENT' | 'SUSPEND' | 'WARN';

  @IsOptional() @IsString() @MaxLength(500) note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

class SetStatusDto {
  @IsEnum(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';

  @IsOptional() @IsString() @MaxLength(500) reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

class SetRoleDto {
  @IsEnum(['USER', 'BUSINESS', 'MODERATOR', 'ADMIN'])
  role!: UserRole;
}

@Controller('admin')
@Roles('MODERATOR')
export class AdminController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('reports')
  queue(@Query('status') status?: ReportStatus) {
    return this.moderation.queue({ status });
  }

  @Post('reports/:id/act')
  act(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ActOnReportDto,
  ) {
    return this.moderation.act(userId, id, dto);
  }

  @Get('users')
  users(
    @Query('q') query?: string,
    @Query('status') status?: string,
    @Query('role') role?: UserRole,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.moderation.users({
      query,
      status,
      role,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Patch('users/:id/status')
  setStatus(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SetStatusDto,
  ) {
    return this.moderation.setStatus(userId, id, dto);
  }

  @Patch('users/:id/role')
  @Roles('ADMIN')
  setRole(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: SetRoleDto) {
    return this.moderation.setRole(userId, id, dto.role);
  }

  @Get('audit')
  audit() {
    return this.moderation.auditTrail();
  }

  @Get('analytics')
  @Roles('ADMIN')
  analyticsOverview(@Query('days') days?: string) {
    return this.analytics.overview(days ? Math.min(Number(days), 90) : 30);
  }
}
