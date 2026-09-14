import { IsArray, ArrayMaxSize, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum GoalAreaInput {
  CAREER = 'CAREER',
  SCHOOL = 'SCHOOL',
  BUSINESS = 'BUSINESS',
  FITNESS = 'FITNESS',
  LEARNING = 'LEARNING',
  MONEY = 'MONEY',
  CREATIVE = 'CREATIVE',
  PERSONAL = 'PERSONAL',
}

export enum GoalHorizonInput {
  SHORT = 'SHORT',
  LONG = 'LONG',
}

export enum GoalStatusInput {
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  PAUSED = 'PAUSED',
  DROPPED = 'DROPPED',
}

export class CreateGoalDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(GoalAreaInput)
  area?: GoalAreaInput;

  @IsOptional()
  @IsEnum(GoalHorizonInput)
  horizon?: GoalHorizonInput;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  milestones?: string[];
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(GoalAreaInput)
  area?: GoalAreaInput;

  @IsOptional()
  @IsEnum(GoalHorizonInput)
  horizon?: GoalHorizonInput;

  @IsOptional()
  @IsEnum(GoalStatusInput)
  status?: GoalStatusInput;

  @IsOptional()
  @IsDateString()
  targetDate?: string | null;
}

export class CreateMilestoneDto {
  @IsString()
  @MaxLength(160)
  title!: string;
}
