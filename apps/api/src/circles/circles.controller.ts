import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CircleRole } from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { IsImageUrl } from '../common/validators/is-image-url.js';
import { CirclesService } from './circles.service.js';

class CreateCircleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY'])
  visibility?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rules?: string;

  @IsImageUrl()
  coverUrl?: string;
}

class UpdateCircleDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rules?: string;

  @IsImageUrl()
  coverUrl?: string | null;
}

class JoinDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;
}

class DecideDto {
  @IsBoolean()
  approve!: boolean;
}

class RoleDto {
  @IsEnum(['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER'])
  role!: CircleRole;
}

class CirclePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsEnum(['TEXT', 'POLL', 'ANNOUNCEMENT'])
  kind?: 'TEXT' | 'POLL' | 'ANNOUNCEMENT';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  pollOptions?: string[];
}

@Controller('circles')
export class CirclesController {
  constructor(private readonly circles: CirclesService) {}

  @Get()
  list(@CurrentUser('sub') userId: string, @Query('scope') scope: 'discover' | 'mine' = 'discover') {
    return this.circles.list(userId, scope);
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateCircleDto) {
    return this.circles.create(userId, dto);
  }

  @Patch(':slug')
  update(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateCircleDto,
  ) {
    return this.circles.update(userId, slug, dto);
  }

  @Post('requests/:requestId/decide')
  decide(
    @CurrentUser('sub') userId: string,
    @Param('requestId') requestId: string,
    @Body() dto: DecideDto,
  ) {
    return this.circles.decideRequest(userId, requestId, dto.approve);
  }

  @Delete('posts/:postId')
  removePost(@CurrentUser('sub') userId: string, @Param('postId') postId: string) {
    return this.circles.removePost(userId, postId);
  }

  @Get(':slug')
  detail(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.circles.detail(userId, slug);
  }

  @Get(':slug/posts')
  posts(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.circles.posts(userId, slug);
  }

  @Post(':slug/posts')
  post(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body() dto: CirclePostDto,
  ) {
    return this.circles.post(userId, slug, dto);
  }

  @Get(':slug/requests')
  requests(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.circles.pendingRequests(userId, slug);
  }

  @Post(':slug/join')
  join(@CurrentUser('sub') userId: string, @Param('slug') slug: string, @Body() dto: JoinDto) {
    return this.circles.join(userId, slug, dto.message);
  }

  @Delete(':slug/membership')
  leave(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.circles.leave(userId, slug);
  }

  @Patch(':slug/members/:username/role')
  setRole(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Param('username') username: string,
    @Body() dto: RoleDto,
  ) {
    return this.circles.setRole(userId, slug, username, dto.role);
  }

  @Delete(':slug/members/:username')
  removeMember(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Param('username') username: string,
  ) {
    return this.circles.removeMember(userId, slug, username);
  }
}
