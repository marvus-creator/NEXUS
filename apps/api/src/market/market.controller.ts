import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type {
  BusinessCategory,
  BusinessRole,
  BusinessStatus,
  ListingCondition,
  ListingKind,
  ListingStatus,
} from '@nexus/db';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { IsImageUrl } from '../common/validators/is-image-url.js';
import { BusinessesService } from './businesses.service.js';
import { ListingsService } from './listings.service.js';
import { OrdersService } from './orders.service.js';

const CATEGORIES = [
  'RETAIL',
  'FOOD',
  'SERVICES',
  'TECH',
  'EDUCATION',
  'HEALTH',
  'CRAFTS',
  'AGRICULTURE',
  'TRANSPORT',
  'OTHER',
] as const;

class CreateBusinessDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(160) tagline?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(CATEGORIES) category?: BusinessCategory;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() placeSlug?: string;
  @IsImageUrl() coverUrl?: string;
}

class UpdateBusinessDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(160) tagline?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(CATEGORIES) category?: BusinessCategory;
  @IsOptional() @IsEnum(['ACTIVE', 'PAUSED', 'CLOSED']) status?: BusinessStatus;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsImageUrl() coverUrl?: string | null;
}

class TeamMemberDto {
  @IsString() @MinLength(2) @MaxLength(24) username!: string;

  @IsOptional()
  @IsEnum(['OWNER', 'MANAGER', 'STAFF'])
  role?: BusinessRole;
}

class CreateListingDto {
  @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional() @IsEnum(['PRODUCT', 'SERVICE']) kind?: ListingKind;

  @IsOptional()
  @IsEnum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS'])
  condition?: ListingCondition;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsBoolean() negotiable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  quantity?: number;

  @IsOptional() @IsEnum(CATEGORIES) category?: BusinessCategory;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() businessSlug?: string;
  @IsImageUrl() coverUrl?: string;
}

class UpdateListingDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  quantity?: number;

  @IsOptional() @IsEnum(['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED']) status?: ListingStatus;
  @IsOptional() @IsBoolean() negotiable?: boolean;
  @IsOptional() @IsEnum(CATEGORIES) category?: BusinessCategory;
  @IsImageUrl() coverUrl?: string | null;
}

class SaveDto {
  @IsBoolean() saved!: boolean;
}

class PlaceOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query('scope') scope?: 'all' | 'mine',
    @Query('category') category?: BusinessCategory,
    @Query('city') city?: string,
    @Query('q') query?: string,
  ) {
    return this.businesses.list(userId, { scope, category, city, query });
  }

  @Get('categories')
  categories() {
    return this.businesses.categories();
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateBusinessDto) {
    return this.businesses.create(userId, dto);
  }

  @Get(':slug')
  detail(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.businesses.detail(userId, slug);
  }

  @Patch(':slug')
  update(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businesses.update(userId, slug, dto);
  }

  @Delete(':slug')
  remove(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.businesses.remove(userId, slug);
  }

  @Post(':slug/team')
  addMember(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body() dto: TeamMemberDto,
  ) {
    return this.businesses.addMember(userId, slug, dto.username, dto.role ?? 'STAFF');
  }

  @Delete(':slug/team/:username')
  removeMember(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Param('username') username: string,
  ) {
    return this.businesses.removeMember(userId, slug, username);
  }
}

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly orders: OrdersService,
  ) {}

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query('category') category?: BusinessCategory,
    @Query('kind') kind?: ListingKind,
    @Query('city') city?: string,
    @Query('q') query?: string,
    @Query('saved') saved?: string,
    @Query('mine') mine?: string,
    @Query('business') businessSlug?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.listings.list(userId, {
      category,
      kind,
      city,
      query,
      savedOnly: saved === 'true',
      mine: mine === 'true',
      businessSlug,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('categories')
  categories() {
    return this.listings.categories();
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateListingDto) {
    return this.listings.create(userId, dto);
  }

  @Get(':slug')
  detail(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.listings.detail(userId, slug);
  }

  @Patch(':slug')
  update(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.update(userId, slug, dto);
  }

  @Delete(':slug')
  remove(@CurrentUser('sub') userId: string, @Param('slug') slug: string) {
    return this.listings.remove(userId, slug);
  }

  @Post(':slug/save')
  save(@CurrentUser('sub') userId: string, @Param('slug') slug: string, @Body() dto: SaveDto) {
    return this.listings.toggleSave(userId, slug, dto.saved);
  }

  @Post(':slug/order')
  order(
    @CurrentUser('sub') userId: string,
    @Param('slug') slug: string,
    @Body() dto: PlaceOrderDto,
  ) {
    return this.orders.place(userId, slug, dto);
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser('sub') userId: string, @Query('scope') scope: 'buying' | 'selling' = 'buying') {
    return this.orders.list(userId, scope);
  }

  @Get(':code')
  detail(@CurrentUser('sub') userId: string, @Param('code') code: string) {
    return this.orders.detail(userId, code);
  }

  @Post(':code/accept')
  accept(@CurrentUser('sub') userId: string, @Param('code') code: string) {
    return this.orders.decide(userId, code, true);
  }

  @Post(':code/decline')
  decline(@CurrentUser('sub') userId: string, @Param('code') code: string) {
    return this.orders.decide(userId, code, false);
  }

  @Post(':code/cancel')
  cancel(@CurrentUser('sub') userId: string, @Param('code') code: string) {
    return this.orders.cancel(userId, code);
  }

  @Post(':code/pay')
  pay(@CurrentUser('sub') userId: string, @Param('code') code: string) {
    return this.orders.pay(userId, code);
  }

  @Post(':code/refund')
  refund(@CurrentUser('sub') userId: string, @Param('code') code: string) {
    return this.orders.refund(userId, code);
  }
}
