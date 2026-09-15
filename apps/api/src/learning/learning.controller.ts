import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { LearningSource, LearningStatus } from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { LearningService } from './learning.service.js';
import { PlannerAiService } from './planner-ai.service.js';
import { ProgressService } from './progress.service.js';

class ModuleSeedDto {
  @IsString() @MinLength(1) @MaxLength(160) title!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  estimatedMinutes?: number;
}

class CreatePathDto {
  @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(80) subject?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() goalId?: string;
  @IsOptional() @IsDateString() targetDate?: string;

  @IsOptional()
  @IsEnum(['SELF', 'COURSE', 'BOOK', 'VIDEO', 'CLASS', 'OTHER'])
  source?: LearningSource;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ModuleSeedDto)
  modules?: ModuleSeedDto[];
}

class UpdatePathDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(80) subject?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsString() goalId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])
  status?: LearningStatus;
}

class AddModuleDto {
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  estimatedMinutes?: number;
}

class ModuleDoneDto {
  @IsBoolean() done!: boolean;
}

class LogSessionDto {
  @IsOptional() @IsString() pathId?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsDateString() startedAt?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  minutes!: number;
}

class PlanDayDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'planFor must look like 2026-09-15' })
  planFor?: string;
}

@Controller('learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('paths')
  list(@CurrentUser('sub') userId: string, @Query('status') status?: LearningStatus) {
    return this.learning.list(userId, status);
  }

  @Post('paths')
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePathDto) {
    return this.learning.create(userId, dto);
  }

  @Get('sessions')
  sessions(@CurrentUser('sub') userId: string) {
    return this.learning.sessions(userId);
  }

  @Post('sessions')
  logSession(@CurrentUser('sub') userId: string, @Body() dto: LogSessionDto) {
    return this.learning.logSession(userId, dto);
  }

  @Get('paths/:id')
  detail(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.learning.detail(userId, id);
  }

  @Patch('paths/:id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePathDto,
  ) {
    return this.learning.update(userId, id, dto);
  }

  @Delete('paths/:id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.learning.remove(userId, id);
  }

  @Post('paths/:id/modules')
  addModule(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: AddModuleDto,
  ) {
    return this.learning.addModule(userId, id, dto);
  }

  @Patch('paths/:id/modules/:moduleId')
  setModuleDone(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: ModuleDoneDto,
  ) {
    return this.learning.setModuleDone(userId, id, moduleId, dto.done);
  }

  @Delete('paths/:id/modules/:moduleId')
  removeModule(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.learning.removeModule(userId, id, moduleId);
  }
}

@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  overview(@CurrentUser('sub') userId: string) {
    return this.progress.overview(userId);
  }
}

@Controller('ai/plan')
export class PlannerAiController {
  constructor(private readonly planner: PlannerAiService) {}

  @Get()
  list(@CurrentUser('sub') userId: string, @Query('planFor') planFor?: string) {
    return this.planner.list(userId, planFor);
  }

  @Post('generate')
  generate(@CurrentUser('sub') userId: string, @Body() dto: PlanDayDto) {
    return this.planner.generate(userId, dto.planFor);
  }

  @Post('accept-all')
  acceptAll(@CurrentUser('sub') userId: string, @Body() dto: PlanDayDto) {
    return this.planner.acceptAll(userId, dto.planFor);
  }

  @Post(':id/accept')
  accept(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.planner.decide(userId, id, true);
  }

  @Post(':id/decline')
  decline(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.planner.decide(userId, id, false);
  }
}
