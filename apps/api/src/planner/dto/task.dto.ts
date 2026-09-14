import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum TaskStatusInput {
  TODO = 'TODO',
  DOING = 'DOING',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED',
}

export enum TaskPriorityInput {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RecurrenceInput {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKDAYS = 'WEEKDAYS',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreateTaskDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsEnum(TaskPriorityInput)
  priority?: TaskPriorityInput;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsEnum(RecurrenceInput)
  recurrence?: RecurrenceInput;

  @IsOptional()
  @IsString()
  goalId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsEnum(TaskStatusInput)
  status?: TaskStatusInput;

  @IsOptional()
  @IsEnum(TaskPriorityInput)
  priority?: TaskPriorityInput;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsEnum(RecurrenceInput)
  recurrence?: RecurrenceInput;

  @IsOptional()
  @IsString()
  goalId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

export class ToggleTaskDto {
  @IsBoolean()
  done!: boolean;
}

export class ListTasksQuery {
  @IsOptional()
  @IsEnum(TaskStatusInput)
  status?: TaskStatusInput;

  @IsOptional()
  @IsString()
  goalId?: string;

  @IsOptional()
  @IsString()
  scope?: 'today' | 'week' | 'overdue' | 'all';
}
