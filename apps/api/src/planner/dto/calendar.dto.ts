import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum EventKindInput {
  PERSONAL = 'PERSONAL',
  STUDY = 'STUDY',
  TASK = 'TASK',
}

export class CreateEventDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsEnum(EventKindInput)
  kind?: EventKindInput;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  taskId?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class RangeQuery {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
