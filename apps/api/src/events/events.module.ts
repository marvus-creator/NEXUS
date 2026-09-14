import { Module } from '@nestjs/common';
import { PeopleModule } from '../people/people.module.js';
import { PlacesModule } from '../places/places.module.js';
import { EventsController, PlacesController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  imports: [PeopleModule, PlacesModule],
  controllers: [PlacesController, EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
