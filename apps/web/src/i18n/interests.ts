import { messages } from './messages';
import type { Translate } from './types';

type ItemKey = keyof (typeof messages)['interests']['items'];
type CategoryKey = keyof (typeof messages)['interests']['categories'];

export function interestLabel(t: Translate, slug: string, fallback: string) {
  return slug in messages.interests.items ? t(`interests.items.${slug as ItemKey}`) : fallback;
}

export function interestCategory(t: Translate, category: string) {
  return category in messages.interests.categories ? t(`interests.categories.${category as CategoryKey}`) : category;
}
