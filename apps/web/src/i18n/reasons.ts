import { messages } from './messages';
import type { Translate } from './types';

type ReasonKey = keyof (typeof messages)['reasons'];
type InterestKey = keyof (typeof messages)['interests']['items'];
type PlaceKey = keyof (typeof messages)['enums']['place'];
type BusinessKey = keyof (typeof messages)['enums']['business'];

type Localize = 'interest' | 'interests' | 'place' | 'business';

const PATTERNS: [RegExp, ReasonKey, ReasonKey?, Localize?][] = [
  [/^(\d+) mutual friends?$/, 'mutualOne', 'mutualMany'],
  [/^(\d+) shared interests?$/, 'sharedOne', 'sharedMany'],
  [/^(\d+) friends? (?:is|are) going$/, 'friendsGoingOne', 'friendsGoingMany'],
  [/^(\d+) (?:person is|people are) going$/, 'peopleGoingOne', 'peopleGoingMany'],
  [/^(\d+) friends? saved this$/, 'friendsSavedOne', 'friendsSavedMany'],
  [/^(\d+) friends? (?:is|are) in it$/, 'friendsInOne', 'friendsInMany'],
  [/^hosted by (.+), who you follow$/, 'hostedBy'],
  [/^you spend time at (.+) places$/, 'spendTime', undefined, 'place'],
  [/^matches your interest in (.+)$/, 'interest', undefined, 'interest'],
  [/^from a circle you are in$/, 'fromCircle'],
  [/^online, so distance does not matter$/, 'online'],
  [/^happening in the next couple of days$/, 'soon'],
  [/^open to anyone, and coming up$/, 'openToAnyone'],
  [/^you like (.+) places$/, 'likePlaces', undefined, 'place'],
  [/^rated (.+) by people here$/, 'rated'],
  [/^things are happening here$/, 'happening'],
  [/^somewhere in (.+) you have not been$/, 'notBeen'],
  [/^added by someone on Nexus$/, 'addedBy'],
  [/^an active circle you are not in yet$/, 'activeCircle'],
  [/^a new circle looking for people$/, 'newCircle'],
  [/^you both like (.+)$/, 'bothLike', undefined, 'interests'],
  [/^you have crossed paths already$/, 'crossed'],
  [/^you look at (.+) listings$/, 'lookAt', undefined, 'business'],
  [/^sold by (.+)$/, 'soldBy'],
  [/^based in (.+)$/, 'basedIn'],
  [/^also in (.+)$/, 'alsoIn'],
  [/^about (.+)$/, 'about', undefined, 'interest'],
  [/^in (.+)$/, 'inCity'],
];

const INTEREST_BY_LABEL = new Map(
  Object.entries(messages.interests.items).map(([key, value]) => [value[0].toLowerCase(), key as InterestKey]),
);

function localize(value: string, kind: Localize | undefined, t: Translate): string {
  if (!kind) return value;

  if (kind === 'interests') {
    return value
      .split(' and ')
      .map((part) => localize(part, 'interest', t))
      .join(` ${t('reasons.and')} `);
  }

  if (kind === 'interest') {
    const key = INTEREST_BY_LABEL.get(value.toLowerCase());
    return key ? t(`interests.items.${key}`) : value;
  }

  const upper = value.toUpperCase();

  if (kind === 'place') {
    return upper in messages.enums.place ? t(`enums.place.${upper as PlaceKey}`).toLowerCase() : value;
  }

  return upper in messages.enums.business ? t(`enums.business.${upper as BusinessKey}`).toLowerCase() : value;
}

export function translateReason(reason: string, t: Translate) {
  for (const [pattern, one, many, kind] of PATTERNS) {
    const match = reason.match(pattern);
    if (!match) continue;
    const value = match[1];
    if (many && value !== undefined) {
      const n = Number(value);
      return t(`reasons.${n === 1 ? one : many}`, { n });
    }
    return t(`reasons.${one}`, { x: localize(value ?? '', kind, t) });
  }
  return reason;
}
