import { Module } from '@nestjs/common';
import { PeopleModule } from '../people/people.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [PeopleModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
