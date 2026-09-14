import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { AttendeeStatus, PlaceCategory } from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PlacesService } from '../places/places.service.js';
import { EventsService } from './events.service.js';

class CreatePlaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsEnum(['CAFE', 'RESTAURANT', 'VENUE', 'STORE', 'SPORT', 'ATTRACTION', 'SERVICE', 'WORKSPACE', 'OTHER'])
  category?: PlaceCategory;

  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}

class ReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;
}

class SaveDto {
  @IsBoolean()
  saved!: boolean;
}

class CreateEventDto {
  @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() startAt!: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() placeSlug?: string;
  @IsOptional() @IsString() @MaxLength(200) locationText?: string;
  @IsOptional() @IsString() circleId?: string;

  @IsOptional()
  @IsEnum(['PUBLIC', 'CIRCLE', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'CIRCLE' | 'PRIVATE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  capacity?: number;
}

class RsvpDto {
  @IsEnum(['GOING', 'INTERESTED', 'DECLINED'])
  status!: AttendeeStatus;
}

class InviteDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  usernames!: string[];
}

class CheckInDto {
  @IsString()
  @MaxLength(16)
  code!: string;
}

@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query('category') category?: PlaceCategory,
    @Query('city') city?: string,
    @Query('q') query?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('saved') saved?: string,
  ) {
    return this.places.list(userId, {
      category,
      city,
      query,
      latitude: lat ? Number(lat) : undefined,
      longitude: lng ? Number(lng) : undefined,
      savedOnly: saved === 'true',
    });
  }

  @Get('categories')
  categories() {
    return this.places.categories();
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePlaceDto) {
    return this.places.create(userId, dto);
  }

  @Get(':slug')
  detail(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.places.detail(userId, slug);
  }

  @Post(':slug/review')
  review(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body() dto: ReviewDto,
  ) {
    return this.places.review(userId, slug, dto.rating, dto.body);
  }

  @Post(':slug/save')
  save(@CurrentUser('sub') userId: string, @Param('slug') slug: string, @Body() dto: SaveDto) {
    return this.places.toggleSave(userId, slug, dto.saved);
  }
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query('scope') scope: 'upcoming' | 'going' | 'hosting' | 'past' = 'upcoming',
  ) {
    return this.events.list(userId, scope);
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateEventDto) {
    return this.events.create(userId, dto);
  }

  @Get(':slug')
  detail(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.events.detail(userId, slug);
  }

  @Get(':slug/attendees')
  attendees(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.events.attendees(userId, slug);
  }

  @Post(':slug/rsvp')
  rsvp(@CurrentUser('sub') userId: string, @Param('slug') slug: string, @Body() dto: RsvpDto) {
    return this.events.rsvp(userId, slug, dto.status);
  }

  @Post(':slug/invite')
  invite(@CurrentUser('sub') userId: string, @Param('slug') slug: string, @Body() dto: InviteDto) {
    return this.events.invite(userId, slug, dto.usernames);
  }

  @Post(':slug/check-in')
  checkIn(@CurrentUser('sub') userId: string, @Param('slug') slug: string, @Body() dto: CheckInDto) {
    return this.events.checkIn(userId, slug, dto.code);
  }

  @Post(':slug/review')
  review(@CurrentUser('sub') userId: string, @Param('slug') slug: string, @Body() dto: ReviewDto) {
    return this.events.review(userId, slug, dto.rating, dto.body);
  }

  @Delete(':slug')
  cancel(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.events.cancel(userId, slug);
  }
}
