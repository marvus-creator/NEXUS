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

type PlaceLike = { category: string; slug?: string; name?: string; coverUrl?: string | null };

export function placeImage(place: PlaceLike) {
  return place.coverUrl ?? null;
}

export function eventImage(event: { title: string; slug?: string; coverUrl?: string | null }) {
  return event.coverUrl ?? null;
}

export function circleImage(circle: { name: string; slug?: string; coverUrl?: string | null }) {
  return circle.coverUrl ?? null;
}

export function listingImage(listing: { title: string; id?: string; imageUrl?: string | null }) {
  return listing.imageUrl ?? null;
}

export const CATEGORY_COLOR: Record<string, string> = {
  CAFE: '#c98a2e',
  RESTAURANT: '#c9603f',
  WORKSPACE: '#5b67d8',
  VENUE: '#7d6bd6',
  STORE: '#b8577e',
  SPORT: '#2f9466',
  SERVICE: '#2a8f87',
  ATTRACTION: '#8a63c9',
  OTHER: '#7a7a82',
};
