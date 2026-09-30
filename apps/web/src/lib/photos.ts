const stock = (name: string) => `/images/stock/${name}.jpg`;

export const IMG = {
  hero: '/images/hero-kigali-night.jpg',
  auth: '/images/auth-cowork.jpg',
  designNight: '/images/design-night.jpg',
  techMeetup: '/images/tech-meetup.jpg',
  kigaliAerial: stock('kigali-aerial'),
  kigaliSunset: stock('kigali-sunset'),
  kigaliRooftops: stock('kigali-rooftops'),
  nyamirambo: stock('nyamirambo'),
  downtown: stock('downtown'),
  hills: stock('hills'),
  cafeBarista: stock('cafe-barista'),
  cafeCozy: stock('cafe-cozy'),
  cafeInterior: stock('cafe-interior'),
  cowork1: stock('cowork-1'),
  cowork2: stock('cowork-2'),
  cowork3: stock('cowork-3'),
  cowork4: stock('cowork-4'),
  concert: stock('concert'),
  crowd: stock('crowd'),
  football: stock('football'),
  footballNight: stock('football-night'),
  bags: stock('bags'),
  hats: stock('hats'),
  beads: stock('beads'),
  lamps: stock('lamps'),
  foodChef: stock('food-chef'),
  foodShare: stock('food-share'),
  foodPatio: stock('food-patio'),
} as const;

export const PEOPLE = {
  malvyn: '/images/people/malvyn.jpg',
  kevin: '/images/people/kevin.jpg',
  aline: '/images/people/aline.jpg',
  grace: '/images/people/grace.jpg',
  eric: '/images/people/eric.jpg',
  divine: '/images/people/divine.jpg',
  patrick: '/images/people/patrick.jpg',
  sandrine: '/images/people/sandrine.jpg',
} as const;

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function pick(list: readonly string[], seed: string) {
  return list[hash(seed) % list.length]!;
}

const PLACE_SETS: Record<string, readonly string[]> = {
  CAFE: [IMG.cafeCozy, IMG.cafeBarista, IMG.cafeInterior],
  RESTAURANT: [IMG.foodChef, IMG.foodShare, IMG.foodPatio],
  WORKSPACE: [IMG.cowork2, IMG.cowork1, IMG.cowork3, IMG.cowork4],
  VENUE: [IMG.techMeetup, IMG.concert, IMG.designNight],
  STORE: [IMG.beads, IMG.bags, IMG.hats, IMG.lamps],
  SPORT: [IMG.football, IMG.footballNight],
  ATTRACTION: [IMG.kigaliSunset, IMG.hills, IMG.kigaliAerial],
  SERVICE: [IMG.cowork4, IMG.downtown],
  OTHER: [IMG.kigaliRooftops, IMG.downtown, IMG.nyamirambo],
};

type PlaceLike = { category: string; slug?: string; name?: string; coverUrl?: string | null };

export function placeImage(place: PlaceLike) {
  if (place.coverUrl) return place.coverUrl;
  return pick(PLACE_SETS[place.category] ?? PLACE_SETS.OTHER!, place.slug ?? place.name ?? '');
}

export function placeGallery(place: PlaceLike) {
  const set = PLACE_SETS[place.category] ?? PLACE_SETS.OTHER!;
  const first = placeImage(place);
  return [first, ...set.filter((image) => image !== first)];
}

const EVENT_RULES: [RegExp, readonly string[]][] = [
  [/tech|code|dev|hack|meetup|startup|\bai\b|product/i, [IMG.techMeetup, IMG.cowork1]],
  [/design|critique|art|creative|film|photo/i, [IMG.designNight]],
  [/football|match|run|sport|fitness|gym|marathon|basket/i, [IMG.football, IMG.footballNight]],
  [/jazz|music|concert|party|night|dj|live/i, [IMG.concert, IMG.crowd]],
  [/breakfast|coffee|brunch|founder|business/i, [IMG.cafeBarista, IMG.cafeCozy]],
  [/read|book|study|library|class|lecture|workshop/i, [IMG.cowork4, IMG.cowork3]],
  [/food|dinner|lunch|brochette|cook/i, [IMG.foodShare, IMG.foodPatio]],
];

export function eventImage(event: { title: string; slug?: string; coverUrl?: string | null }) {
  if (event.coverUrl) return event.coverUrl;
  for (const [pattern, images] of EVENT_RULES) {
    if (pattern.test(event.title)) return pick(images, event.slug ?? event.title);
  }
  return pick([IMG.crowd, IMG.kigaliSunset, IMG.techMeetup, IMG.concert], event.slug ?? event.title);
}

export function circleImage(circle: { name: string; slug?: string; coverUrl?: string | null }) {
  if (circle.coverUrl) return circle.coverUrl;
  const rules: [RegExp, string][] = [
    [/build|dev|code|tech|engineer/i, IMG.cowork1],
    [/design|art|creative/i, IMG.designNight],
    [/ball|football|sport|run|fit/i, IMG.footballNight],
    [/coffee|cafe|food/i, IMG.cafeBarista],
    [/faith|church|fellowship|pray/i, IMG.kigaliSunset],
    [/\bcs\b|class|year|study|student|\bur\b|alu/i, IMG.cowork4],
    [/music|jazz/i, IMG.concert],
  ];
  for (const [pattern, image] of rules) if (pattern.test(circle.name)) return image;
  return pick(
    [IMG.kigaliRooftops, IMG.nyamirambo, IMG.cowork2, IMG.crowd, IMG.hills],
    circle.slug ?? circle.name,
  );
}

export function listingImage(listing: { title: string; id?: string; imageUrl?: string | null }) {
  if (listing.imageUrl) return listing.imageUrl;
  const rules: [RegExp, string][] = [
    [/coffee|bean|tea/i, IMG.cafeBarista],
    [/basket|agaseke|hat|weav/i, IMG.hats],
    [/imigongo|panel|bead|jewel|art/i, IMG.beads],
    [/bag|leather|sleeve|fashion|shirt|dress/i, IMG.bags],
    [/lamp|light|decor|clay/i, IMG.lamps],
    [/brochette|food|meal|platter|cake/i, IMG.foodChef],
    [/pass|desk|cowork|office/i, IMG.cowork2],
    [/design|brand|logo|service|lesson|class/i, IMG.designNight],
  ];
  for (const [pattern, image] of rules) if (pattern.test(listing.title)) return image;
  return pick([IMG.beads, IMG.bags, IMG.lamps, IMG.hats], listing.id ?? listing.title);
}

export const CATEGORY_COLOR: Record<string, string> = {
  CAFE: '#F5A524',
  RESTAURANT: '#FF7A59',
  WORKSPACE: '#3B82F6',
  VENUE: '#8B5CF6',
  STORE: '#EC4899',
  SPORT: '#22C55E',
  SERVICE: '#14B8A6',
  ATTRACTION: '#A855F7',
  OTHER: '#8A93A3',
};
