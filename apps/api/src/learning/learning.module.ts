import { Module } from '@nestjs/common';
import { PlannerModule } from '../planner/planner.module.js';
import {
  LearningController,
  PlannerAiController,
  ProgressController,
} from './learning.controller.js';
import { BadgesService } from './badges.service.js';
import { LearningService } from './learning.service.js';
import { PlannerAiService } from './planner-ai.service.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [PlannerModule],
  controllers: [LearningController, ProgressController, PlannerAiController],
  providers: [LearningService, ProgressService, PlannerAiService, BadgesService],
  exports: [LearningService, ProgressService, PlannerAiService, BadgesService],
})
export class LearningModule {}
