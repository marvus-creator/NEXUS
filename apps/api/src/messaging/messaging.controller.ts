import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MessagingService } from './messaging.service.js';

class SendDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}

class GroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  title!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  usernames!: string[];
}

class ReactDto {
  @IsString()
  @MaxLength(8)
  emoji!: string;
}

@Controller('messages')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser('sub') userId: string) {
    return this.messaging.list(userId);
  }

  @Get('unread')
  unread(@CurrentUser('sub') userId: string) {
    return this.messaging.unreadTotal(userId);
  }

  @Post('direct/:username')
  openDirect(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.messaging.openDirect(userId, username);
  }

  @Post('group')
  createGroup(@CurrentUser('sub') userId: string, @Body() dto: GroupDto) {
    return this.messaging.createGroup(userId, dto.title, dto.usernames);
  }

  @Get(':conversationId')
  messages(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('before') before?: string,
  ) {
    return this.messaging.messages(userId, conversationId, before);
  }

  @Post(':conversationId')
  async send(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendDto,
  ) {
    const result = await this.messaging.send(userId, conversationId, dto.body, dto.replyToId);
    return result.message;
  }

  @Patch(':conversationId/read')
  markRead(@CurrentUser('sub') userId: string, @Param('conversationId') conversationId: string) {
    return this.messaging.markRead(userId, conversationId);
  }

  @Post('items/:messageId/react')
  react(
    @CurrentUser('sub') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReactDto,
  ) {
    return this.messaging.react(userId, messageId, dto.emoji);
  }

  @Delete('items/:messageId')
  remove(@CurrentUser('sub') userId: string, @Param('messageId') messageId: string) {
    return this.messaging.removeMessage(userId, messageId);
  }
}
