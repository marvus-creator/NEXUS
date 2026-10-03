import type { messages } from './messages';
import type { Translate } from './types';

type ReasonKey = keyof (typeof messages)['reasons'];

const PATTERNS: [RegExp, ReasonKey, ReasonKey?][] = [
  [/^(\d+) mutual friends?$/, 'mutualOne', 'mutualMany'],
  [/^(\d+) shared interests?$/, 'sharedOne', 'sharedMany'],
  [/^(\d+) friends? (?:is|are) going$/, 'friendsGoingOne', 'friendsGoingMany'],
  [/^(\d+) (?:person is|people are) going$/, 'peopleGoingOne', 'peopleGoingMany'],
  [/^(\d+) friends? saved this$/, 'friendsSavedOne', 'friendsSavedMany'],
  [/^(\d+) friends? (?:is|are) in it$/, 'friendsInOne', 'friendsInMany'],
  [/^hosted by (.+), who you follow$/, 'hostedBy'],
  [/^you spend time at (.+) places$/, 'spendTime'],
  [/^matches your interest in (.+)$/, 'interest'],
  [/^from a circle you are in$/, 'fromCircle'],
  [/^online, so distance does not matter$/, 'online'],
  [/^happening in the next couple of days$/, 'soon'],
  [/^open to anyone, and coming up$/, 'openToAnyone'],
  [/^you like (.+) places$/, 'likePlaces'],
  [/^rated (.+) by people here$/, 'rated'],
  [/^things are happening here$/, 'happening'],
  [/^somewhere in (.+) you have not been$/, 'notBeen'],
  [/^added by someone on Nexus$/, 'addedBy'],
  [/^an active circle you are not in yet$/, 'activeCircle'],
  [/^a new circle looking for people$/, 'newCircle'],
  [/^you both like (.+)$/, 'bothLike'],
  [/^you have crossed paths already$/, 'crossed'],
  [/^you look at (.+) listings$/, 'lookAt'],
  [/^sold by (.+)$/, 'soldBy'],
  [/^based in (.+)$/, 'basedIn'],
  [/^also in (.+)$/, 'alsoIn'],
  [/^about (.+)$/, 'about'],
  [/^in (.+)$/, 'inCity'],
];

export function translateReason(reason: string, t: Translate) {
  for (const [pattern, one, many] of PATTERNS) {
    const match = reason.match(pattern);
    if (!match) continue;
    const value = match[1];
    if (many && value !== undefined) {
      const n = Number(value);
      return t(`reasons.${n === 1 ? one : many}`, { n });
    }
    return t(`reasons.${one}`, { x: value ?? '' });
  }
  return reason;
}
