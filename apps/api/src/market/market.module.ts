import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module.js';
import { BusinessesService } from './businesses.service.js';
import { ListingsService } from './listings.service.js';
import { OrdersService } from './orders.service.js';
import {
  BusinessesController,
  ListingsController,
  OrdersController,
} from './market.controller.js';

@Module({
  imports: [WalletModule],
  controllers: [BusinessesController, ListingsController, OrdersController],
  providers: [BusinessesService, ListingsService, OrdersService],
  exports: [BusinessesService, ListingsService, OrdersService],
})
export class MarketModule {}
