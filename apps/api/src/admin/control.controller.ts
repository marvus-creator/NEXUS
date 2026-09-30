import { BadRequestException, Body, Controller, Delete, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { UserRole } from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CONTENT_TYPES, ControlService, type ContentType } from './control.service.js';

class MessageDto {
  @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) body?: string;
  @IsOptional() @IsString() @MaxLength(300) href?: string;
}

class BroadcastDto extends MessageDto {
  @IsOptional() @IsEnum(['USER', 'BUSINESS', 'MODERATOR', 'ADMIN']) role?: UserRole;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
}

class ReasonDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

class ContentStateDto extends ReasonDto {
  @IsBoolean() removed!: boolean;
}

class VerifyDto {
  @IsBoolean() verified!: boolean;
}

class AnnouncementDto {
  @IsString() @MaxLength(280) message!: string;
  @IsIn(['info', 'warning', 'success']) tone!: 'info' | 'warning' | 'success';
  @IsBoolean() active!: boolean;
}

class SettingsDto {
  @IsOptional() @IsBoolean() registrationOpen?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AnnouncementDto)
  announcement?: AnnouncementDto | null;
}

function contentType(value: string): ContentType {
  if (!(CONTENT_TYPES as readonly string[]).includes(value)) throw new BadRequestException('Unknown content type');
  return value as ContentType;
}

@Controller('admin/control')
@Roles('MODERATOR')
export class ControlController {
  constructor(private readonly control: ControlService) {}

  @Get('people')
  people(
    @Query('q') query?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('sort') sort?: 'newest' | 'oldest' | 'active' | 'name',
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.control.directory({ query, role, status, city, sort, includeDeleted: includeDeleted === 'true' });
  }

  @Get('people.csv')
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="nexus-people.csv"')
  exportPeople() {
    return this.control.exportCsv();
  }

  @Get('people/:id')
  person(@Param('id') id: string) {
    return this.control.dossier(id);
  }

  @Post('people/:id/verify-email')
  verifyEmail(@CurrentUser('sub') actor: string, @Param('id') id: string) {
    return this.control.verifyEmail(actor, id);
  }

  @Post('people/:id/sign-out')
  signOut(@CurrentUser('sub') actor: string, @Param('id') id: string) {
    return this.control.signOutEverywhere(actor, id);
  }

  @Post('people/:id/message')
  message(@CurrentUser('sub') actor: string, @Param('id') id: string, @Body() dto: MessageDto) {
    return this.control.message(actor, id, dto);
  }

  @Delete('people/:id')
  @Roles('ADMIN')
  remove(@CurrentUser('sub') actor: string, @Param('id') id: string, @Body() dto: ReasonDto) {
    return this.control.deleteAccount(actor, id, dto.reason);
  }

  @Post('people/:id/restore')
  @Roles('ADMIN')
  restore(@CurrentUser('sub') actor: string, @Param('id') id: string) {
    return this.control.restoreAccount(actor, id);
  }

  @Post('broadcast')
  @Roles('ADMIN')
  broadcast(@CurrentUser('sub') actor: string, @Body() dto: BroadcastDto) {
    return this.control.broadcast(actor, dto);
  }

  @Get('content/:type')
  content(@Param('type') type: string, @Query('q') query?: string, @Query('state') state?: 'live' | 'removed' | 'all') {
    return this.control.content(contentType(type), { query, state });
  }

  @Patch('content/:type/:id')
  setRemoved(
    @CurrentUser('sub') actor: string,
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: ContentStateDto,
  ) {
    return this.control.setRemoved(actor, contentType(type), id, dto.removed, dto.reason);
  }

  @Patch('content/:type/:id/verify')
  verify(@CurrentUser('sub') actor: string, @Param('type') type: string, @Param('id') id: string, @Body() dto: VerifyDto) {
    const kind = contentType(type);
    if (kind !== 'places' && kind !== 'businesses') throw new BadRequestException('Only places and businesses can be verified');
    return this.control.setVerified(actor, kind, id, dto.verified);
  }

  @Get('settings')
  settings() {
    return this.control.settings();
  }

  @Patch('settings')
  @Roles('ADMIN')
  updateSettings(@CurrentUser('sub') actor: string, @Body() dto: SettingsDto) {
    return this.control.updateSettings(actor, dto);
  }

  @Get('audit')
  audit(@Query('action') action?: string, @Query('limit') limit?: string) {
    return this.control.auditLog({ action, limit: limit ? Number(limit) : undefined });
  }
}

@Controller('platform')
export class PlatformController {
  constructor(private readonly control: ControlService) {}

  @Public()
  @Get('status')
  async status() {
    const settings = await this.control.settings();
    return {
      registrationOpen: settings.registrationOpen,
      announcement: settings.announcement?.active ? settings.announcement : null,
    };
  }
}
