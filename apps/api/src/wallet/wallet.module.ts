import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service.js';
import { WalletController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';

@Module({
  controllers: [WalletController],
  providers: [LedgerService, WalletService],
  exports: [LedgerService, WalletService],
})
export class WalletModule {}
