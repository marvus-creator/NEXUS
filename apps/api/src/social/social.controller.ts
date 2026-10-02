import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
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
import type { ReactionType } from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { IsImageUrl } from '../common/validators/is-image-url.js';
import { SocialService, type FeedScope } from './social.service.js';

class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsEnum(['TEXT', 'IMAGE', 'POLL', 'PROJECT', 'ACHIEVEMENT', 'ANNOUNCEMENT'])
  kind?: 'TEXT' | 'IMAGE' | 'POLL' | 'PROJECT' | 'ACHIEVEMENT' | 'ANNOUNCEMENT';

  @IsOptional()
  @IsEnum(['PUBLIC', 'FRIENDS', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

  @IsImageUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  pollOptions?: string[];
}

class ReactDto {
  @IsOptional()
  @IsEnum(['LIKE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL'])
  type?: ReactionType;
}

class SaveDto {
  @IsBoolean()
  saved!: boolean;
}

class CommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

@Controller('social')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get('feed')
  feed(@CurrentUser('sub') userId: string, @Query('scope') scope: FeedScope = 'for-you') {
    return this.social.feed(userId, scope);
  }

  @Get('posts/by/:username')
  byUser(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.social.postsByUsername(userId, username);
  }

  @Post('posts')
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePostDto) {
    return this.social.create(userId, dto);
  }

  @Delete('posts/:id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.social.remove(userId, id);
  }

  @Post('posts/:id/react')
  react(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: ReactDto) {
    return this.social.react(userId, id, dto.type ?? null);
  }

  @Post('posts/:id/save')
  save(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: SaveDto) {
    return this.social.toggleSave(userId, id, dto.saved);
  }

  @Post('poll-options/:optionId/vote')
  vote(@CurrentUser('sub') userId: string, @Param('optionId') optionId: string) {
    return this.social.votePoll(userId, optionId);
  }

  @Get('posts/:id/comments')
  comments(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.social.comments(userId, id);
  }

  @Post('posts/:id/comments')
  comment(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: CommentDto) {
    return this.social.comment(userId, id, dto.body, dto.parentId);
  }

  @Delete('comments/:commentId')
  removeComment(@CurrentUser('sub') userId: string, @Param('commentId') commentId: string) {
    return this.social.removeComment(userId, commentId);
  }
}
