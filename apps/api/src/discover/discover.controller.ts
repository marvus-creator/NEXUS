import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RecommendationsService } from './recommendations.service.js';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('for-you')
  forYou(@CurrentUser('sub') userId: string, @Query('limit') limit?: string) {
    return this.recommendations.forYou(userId, limit ? Math.min(Number(limit), 60) : 24);
  }
}
