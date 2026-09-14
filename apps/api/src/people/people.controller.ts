import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PeopleService } from './people.service.js';

class FriendRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;
}

class RespondDto {
  @IsEnum(['ACCEPTED', 'DECLINED'])
  decision!: 'ACCEPTED' | 'DECLINED';
}

class ReportDto {
  @IsEnum(['PROFILE', 'POST', 'COMMENT'])
  targetType!: 'PROFILE' | 'POST' | 'COMMENT';

  @IsString()
  targetId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

@Controller('people')
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Get('search')
  search(@CurrentUser('sub') userId: string, @Query('q') query = '') {
    return this.people.search(userId, query);
  }

  @Get('suggestions')
  suggestions(@CurrentUser('sub') userId: string) {
    return this.people.suggestions(userId);
  }

  @Get('connections')
  connections(@CurrentUser('sub') userId: string) {
    return this.people.connections(userId);
  }

  @Get(':username/relationship')
  relationship(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.people.relationshipByUsername(userId, username);
  }

  @Post(':username/follow')
  follow(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.people.follow(userId, username);
  }

  @Delete(':username/follow')
  unfollow(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.people.unfollow(userId, username);
  }

  @Post(':username/friend-request')
  sendRequest(
    @CurrentUser('sub') userId: string,
    @Param('username') username: string,
    @Body() dto: FriendRequestDto,
  ) {
    return this.people.sendFriendRequest(userId, username, dto.message);
  }

  @Post('requests/:requestId/respond')
  respond(
    @CurrentUser('sub') userId: string,
    @Param('requestId') requestId: string,
    @Body() dto: RespondDto,
  ) {
    return this.people.respondToRequest(userId, requestId, dto.decision);
  }

  @Delete('requests/:requestId')
  cancel(@CurrentUser('sub') userId: string, @Param('requestId') requestId: string) {
    return this.people.cancelRequest(userId, requestId);
  }

  @Delete(':username/friendship')
  removeFriend(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.people.removeFriend(userId, username);
  }

  @Post(':username/block')
  block(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.people.block(userId, username);
  }

  @Delete(':username/block')
  unblock(@CurrentUser('sub') userId: string, @Param('username') username: string) {
    return this.people.unblock(userId, username);
  }

  @Post('report')
  report(@CurrentUser('sub') userId: string, @Body() dto: ReportDto) {
    return this.people.report(userId, dto);
  }
}
