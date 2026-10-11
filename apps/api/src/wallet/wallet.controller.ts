import { Body, Controller, Get, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { WalletService } from './wallet.service.js';

class TransferDto {
  @IsString() @MinLength(2) @MaxLength(24) username!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional() @IsString() @MaxLength(200) memo?: string;

  @IsOptional() @Matches(/^[A-Za-z0-9_-]{8,64}$/) idempotencyKey?: string;
}

class GrantDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;
}

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  overview(@CurrentUser('sub') userId: string) {
    return this.wallet.overview(userId);
  }

  @Post('transfer')
  transfer(@CurrentUser('sub') userId: string, @Body() dto: TransferDto) {
    return this.wallet.transfer(userId, dto);
  }

  @Post('dev-grant')
  grant(@CurrentUser('sub') userId: string, @Body() dto: GrantDto) {
    return this.wallet.devGrant(userId, dto.amount);
  }
}
