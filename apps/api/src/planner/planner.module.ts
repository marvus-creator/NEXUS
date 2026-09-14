import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { GoalsService } from './goals.service.js';
import { TasksService } from './tasks.service.js';
import { CalendarController, GoalsController, TasksController } from './planner.controller.js';

@Module({
  controllers: [TasksController, GoalsController, CalendarController],
  providers: [TasksService, GoalsService, CalendarService],
  exports: [TasksService, GoalsService, CalendarService],
})
export class PlannerModule {}
