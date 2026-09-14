import { Module } from '@nestjs/common';
import { PeopleModule } from '../people/people.module.js';
import { CirclesController } from './circles.controller.js';
import { CirclesService } from './circles.service.js';

@Module({
  imports: [PeopleModule],
  controllers: [CirclesController],
  providers: [CirclesService],
  exports: [CirclesService],
})
export class CirclesModule {}
