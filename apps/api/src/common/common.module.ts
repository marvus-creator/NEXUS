import { Global, Module } from '@nestjs/common';
import { SecurityStore } from './security-store.service.js';

@Global()
@Module({
  providers: [SecurityStore],
  exports: [SecurityStore],
})
export class CommonModule {}
