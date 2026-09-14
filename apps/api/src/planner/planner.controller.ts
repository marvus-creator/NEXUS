import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CalendarService } from './calendar.service.js';
import { GoalsService } from './goals.service.js';
import { TasksService } from './tasks.service.js';
import { CreateEventDto, RangeQuery, UpdateEventDto } from './dto/calendar.dto.js';
import { CreateGoalDto, CreateMilestoneDto, UpdateGoalDto } from './dto/goal.dto.js';
import { CreateTaskDto, ListTasksQuery, ToggleTaskDto, UpdateTaskDto } from './dto/task.dto.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser('sub') userId: string, @Query() query: ListTasksQuery) {
    return this.tasks.list(userId, query);
  }

  @Get('counts')
  counts(@CurrentUser('sub') userId: string) {
    return this.tasks.counts(userId);
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(userId, id, dto);
  }

  @Patch(':id/toggle')
  toggle(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: ToggleTaskDto) {
    return this.tasks.toggle(userId, id, dto.done);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.tasks.remove(userId, id);
  }
}

@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  list(@CurrentUser('sub') userId: string) {
    return this.goals.list(userId);
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateGoalDto) {
    return this.goals.create(userId, dto);
  }

  @Patch('milestones/:milestoneId/toggle')
  toggleMilestone(
    @CurrentUser('sub') userId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: ToggleTaskDto,
  ) {
    return this.goals.toggleMilestone(userId, milestoneId, dto.done);
  }

  @Delete('milestones/:milestoneId')
  removeMilestone(@CurrentUser('sub') userId: string, @Param('milestoneId') milestoneId: string) {
    return this.goals.removeMilestone(userId, milestoneId);
  }

  @Patch(':id')
  update(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goals.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.goals.remove(userId, id);
  }

  @Post(':id/milestones')
  addMilestone(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.goals.addMilestone(userId, id, dto);
  }
}

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  range(@CurrentUser('sub') userId: string, @Query() query: RangeQuery) {
    return this.calendar.range(userId, query.from, query.to);
  }

  @Get('free')
  free(
    @CurrentUser('sub') userId: string,
    @Query('date') date: string,
    @Query('minutes') minutes?: string,
  ) {
    return this.calendar.freeSlots(userId, date, minutes ? Number(minutes) : 30);
  }

  @Post('events')
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateEventDto) {
    return this.calendar.create(userId, dto);
  }

  @Patch('events/:id')
  update(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.calendar.update(userId, id, dto);
  }

  @Delete('events/:id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.calendar.remove(userId, id);
  }
}
