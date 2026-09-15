import { Module } from '@nestjs/common';
import { PlannerModule } from '../planner/planner.module.js';
import { LearningController, PlannerAiController, ProgressController } from './learning.controller.js';
import { LearningService } from './learning.service.js';
import { PlannerAiService } from './planner-ai.service.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [PlannerModule],
  controllers: [LearningController, ProgressController, PlannerAiController],
  providers: [LearningService, ProgressService, PlannerAiService],
  exports: [LearningService, ProgressService, PlannerAiService],
})
export class LearningModule {}
