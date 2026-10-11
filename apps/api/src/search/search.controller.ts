import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { SearchService, type SearchKind } from './search.service.js';

const KINDS: SearchKind[] = ['person', 'event', 'circle', 'place', 'listing', 'post'];

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 90 } })
  find(@CurrentUser('sub') userId: string, @Query('q') q = '', @Query('kinds') kinds = '') {
    const wanted = kinds
      .split(',')
      .map((kind) => kind.trim())
      .filter((kind): kind is SearchKind => (KINDS as string[]).includes(kind));
    return this.search.search(userId, String(q), wanted);
  }
}
