import { Module } from '@nestjs/common';
import { PeopleModule } from '../people/people.module.js';
import { PlacesService } from './places.service.js';

@Module({
  imports: [PeopleModule],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
