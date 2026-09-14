import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum UserTypeInput {
  STUDENT = 'STUDENT',
  PROFESSIONAL = 'PROFESSIONAL',
  CREATOR = 'CREATOR',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  ENTREPRENEUR = 'ENTREPRENEUR',
  ATHLETE = 'ATHLETE',
  OTHER = 'OTHER',
}

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

export enum HelpAreaInput {
  LEARNING = 'LEARNING',
  PLANNING = 'PLANNING',
  MEETING_PEOPLE = 'MEETING_PEOPLE',
  DISCOVERING_PLACES = 'DISCOVERING_PLACES',
  EVENTS = 'EVENTS',
  GOALS = 'GOALS',
  MONEY = 'MONEY',
  COMMUNITIES = 'COMMUNITIES',
  OPPORTUNITIES = 'OPPORTUNITIES',
}

export enum ScheduleKindInput {
  CLASS = 'CLASS',
  WORK = 'WORK',
  TRAINING = 'TRAINING',
  COMMITMENT = 'COMMITMENT',
  OTHER = 'OTHER',
}

export class ScheduleBlockDto {
  @IsString()
  @MaxLength(80)
  label!: string;

  @IsEnum(ScheduleKindInput)
  kind!: ScheduleKindInput;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;
}

export class OnboardingStepDto {
  @IsInt()
  @Min(1)
  @Max(5)
  step!: number;

  @IsOptional()
  @IsEnum(UserTypeInput)
  userType?: UserTypeInput;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  interestSlugs?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(GoalAreaInput, { each: true })
  goalAreas?: GoalAreaInput[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsEnum(HelpAreaInput, { each: true })
  helpAreas?: HelpAreaInput[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ScheduleBlockDto)
  scheduleBlocks?: ScheduleBlockDto[];
}
