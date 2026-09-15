import { Module } from '@nestjs/common';
import { AffinityService } from './affinity.service.js';
import { DiscoverController } from './discover.controller.js';
import { RecommendationsService } from './recommendations.service.js';

@Module({
  controllers: [DiscoverController],
  providers: [AffinityService, RecommendationsService],
  exports: [AffinityService, RecommendationsService],
})
export class DiscoverModule {}
