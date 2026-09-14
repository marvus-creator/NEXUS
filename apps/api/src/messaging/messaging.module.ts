import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PeopleModule } from '../people/people.module.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingGateway } from './messaging.gateway.js';
import { MessagingService } from './messaging.service.js';

@Module({
  imports: [AuthModule, PeopleModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
