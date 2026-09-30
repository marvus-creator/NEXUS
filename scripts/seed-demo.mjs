import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PEOPLE_DIR = path.join(ROOT, 'apps/web/public/images/people');
const PASSWORD = process.env.DEMO_PASSWORD ?? 'nexus-demo-2026';
const HOST_EMAIL = process.env.DEMO_HOST_EMAIL ?? 'malvyn.1789358144@nexus.local';
const HOST_PASSWORD = process.env.DEMO_HOST_PASSWORD ?? 'correct-horse-battery';

class Jar {
  constructor() {
    this.cookies = new Map();
  }
  absorb(response) {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function call(route, { method = 'GET', body, jar, form } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${BASE}${route}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  if (jar) jar.absorb(response);
  let payload = null;
  try {
    payload = await response.json();
  } catch {}
  return { status: response.status, body: payload };
}

function kigali(daysAhead, hour, minute = 0) {
  const now = new Date();
  const local = new Date(now.getTime() + 2 * 3600000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate() + daysAhead;
  return new Date(Date.UTC(y, m, d, hour - 2, minute)).toISOString();
}

const log = (...parts) => console.log('[seed]', ...parts);
const created = { people: 0, places: 0, events: 0, circles: 0, posts: 0, listings: 0, friends: 0 };

const PEOPLE = [
  { key: 'kevin', name: 'Kevin Mugisha', username: 'kevin_m', bio: 'Backend engineer at a fintech in Kigali Heights. Runs the Kigali Tech Meetup.', occupation: 'Backend engineer', type: 'PROFESSIONAL', interests: ['tech', 'business', 'fitness', 'programming'] },
  { key: 'aline', name: 'Aline Uwase', username: 'aline_designs', bio: 'Product designer. Hosting Design Critique Night every month at Norrsken.', occupation: 'Product designer', type: 'CREATOR', interests: ['design', 'art', 'film', 'photography'] },
  { key: 'grace', name: 'Grace Ingabire', username: 'grace_i', bio: 'Founder, Imigongo Studio. Handmade décor from Nyamirambo.', occupation: 'Founder', type: 'ENTREPRENEUR', interests: ['business', 'art', 'faith', 'entrepreneurship'] },
  { key: 'eric', name: 'Eric Habimana', username: 'eric_runs', bio: 'Striker on Sundays. Coach on weekdays. Training for the Kigali Peace Marathon.', occupation: 'Football coach', type: 'PROFESSIONAL', interests: ['football', 'fitness', 'music', 'running'] },
  { key: 'divine', name: 'Divine Keza', username: 'divine_k', bio: 'Filmmaker and storyteller. Shooting Kigali one frame at a time.', occupation: 'Filmmaker', type: 'CREATOR', interests: ['film', 'music', 'art', 'photography'] },
  { key: 'patrick', name: 'Patrick Niyonzima', username: 'pat_codes', bio: 'Mobile developer. Flutter and Kotlin. Coffee maximalist.', occupation: 'Mobile developer', type: 'PROFESSIONAL', interests: ['tech', 'food', 'programming', 'coffee'] },
  { key: 'sandrine', name: 'Sandrine Umutoni', username: 'sandrine_u', bio: 'Fashion stylist. Kigali Fashion Week alum.', occupation: 'Fashion stylist', type: 'CREATOR', interests: ['design', 'art', 'business', 'fashion'] },
];

const PLACES = [
  { name: 'Inzora Rooftop Café', category: 'CAFE', address: 'KG 9 Ave, Kimihurura', lat: -1.953, lng: 30.082, description: 'Books, brunch and a rooftop that catches the evening light.' },
  { name: 'Kigali Heights Hub', category: 'WORKSPACE', address: 'KG 7 Ave, Kimihurura', lat: -1.9535, lng: 30.092, description: 'Meeting rooms, parking and a calm floor for deep work.' },
  { name: 'Amahoro Stadium', category: 'SPORT', address: 'KG 17 Ave, Remera', lat: -1.9555, lng: 30.118, description: 'Football, a running track and the biggest events in the city.' },
  { name: 'Imigongo Studio', category: 'STORE', address: 'KN 2 Ave, Nyamirambo', lat: -1.979, lng: 30.044, description: 'Handmade Imigongo panels, baskets and gifts made in Nyamirambo.' },
  { name: 'FixIt Phone Repair', category: 'SERVICE', address: 'KN 4 Ave, CBD', lat: -1.946, lng: 30.061, description: 'Same-day screen and battery repairs.' },
  { name: 'Pili Pili', category: 'RESTAURANT', address: 'KG 303 St, Kibagabaga', lat: -1.931, lng: 30.118, description: 'Pizza by the pool with a sunset over the hills.' },
  { name: 'Camp Kigali Hall', category: 'VENUE', address: 'KN 3 Rd, Nyarugenge', lat: -1.951, lng: 30.056, description: 'Concerts, expos and the city’s bigger gatherings.' },
  { name: 'Waka Fitness', category: 'SPORT', address: 'KG 11 Ave, Kacyiru', lat: -1.942, lng: 30.088, description: 'Classes, boxing and a gym open late.' },
];

const EVENTS = [
  { host: 'kevin', title: 'Kigali Tech Meetup', place: 'Norrsken House Kigali', day: 2, start: 18, end: 21, capacity: 200, description: 'Monthly gathering of Kigali’s builders. This edition: shipping AI features on slow networks, plus lightning demos from three student teams.', going: ['patrick', 'aline', 'divine'] },
  { host: 'eric', title: 'Sunday Football at Amahoro', place: 'Amahoro Stadium', day: 4, start: 7, end: 9, capacity: 30, description: 'Friendly 7-a-side on the outer pitch. All levels welcome. Bring water, bibs provided.', going: ['kevin', 'patrick'] },
  { host: 'aline', title: 'Design Critique Night', place: 'Norrsken House Kigali', day: 6, start: 18, end: 20, capacity: 60, description: 'Bring a work in progress and get honest, kind feedback from peers. Product, brand and motion welcome.', going: ['sandrine', 'divine', 'grace'] },
  { host: 'grace', title: 'Friday Jazz on the Terrace', place: 'Repub Lounge', day: 3, start: 20, end: 23, capacity: 150, description: 'Live Afro-jazz with the Isano Trio. Dinner menu from 19:00.', going: ['divine', 'sandrine'] },
  { host: 'grace', title: 'Founders Breakfast', place: 'Question Coffee', day: 5, start: 8, end: 10, capacity: 24, description: 'Small-table breakfast for early-stage founders. Topic: pricing in RWF when your costs are in USD.', going: ['kevin'] },
  { host: 'divine', title: 'Silent Reading Hour', place: 'Kigali Public Library', day: 7, start: 17, end: 18, capacity: 80, description: 'Bring a book. Phones in the basket. Tea after.', going: ['aline', 'patrick'] },
];

const CIRCLES = [
  { owner: 'kevin', name: 'Kigali Builders', visibility: 'PUBLIC', description: 'Developers, designers and founders shipping from Kigali.', members: ['patrick', 'aline', 'divine', 'grace'] },
  { owner: 'eric', name: 'Sunday Ballers', visibility: 'PUBLIC', description: 'Amahoro outer pitch, every Sunday at 07:00.', members: ['kevin', 'patrick'] },
  { owner: 'aline', name: 'Design Kigali', visibility: 'PUBLIC', description: 'Critique, jobs and inspiration. Monthly crit night at Norrsken.', members: ['sandrine', 'divine', 'grace'] },
  { owner: 'patrick', name: 'Coffee Crawlers', visibility: 'PUBLIC', description: 'Rating every cup in the city, one café at a time.', members: ['kevin', 'aline'] },
  { owner: 'grace', name: 'Young and Faithful', visibility: 'PUBLIC', description: 'Weekly fellowship, Thursday evenings in Kacyiru.', members: ['sandrine', 'eric'] },
  { owner: 'divine', name: 'Kigali Film Club', visibility: 'PUBLIC', description: 'Screenings, shoots and honest reviews of what we make.', members: ['aline', 'sandrine'] },
];

const POSTS = [
  { by: 'kevin', body: 'Kigali Tech Meetup is on this week at Norrsken. Three student teams are demoing, and the topic is shipping AI features that still work on slow networks. See you there.' },
  { by: 'aline', body: 'What should the theme be for next month’s Design Critique Night?', poll: ['Brand identities', 'Mobile apps', 'Motion and animation'] },
  { by: 'eric', body: '12 days in a row. The Kigali Peace Marathon training plan is actually working. Sunday football is still the best part of the week.' },
  { by: 'grace', body: 'New Imigongo wall panels just came out of the studio in Nyamirambo. Each one takes about a week by hand. Proud of this batch.' },
  { by: 'patrick', body: 'Best laptop-friendly café in Kigali?', poll: ['Question Coffee', 'Inzora Rooftop Café', 'Norrsken House'] },
  { by: 'divine', body: 'Shot the city from Rebero hill at sunrise this morning. Kigali wakes up slowly and then all at once.' },
];

const BUSINESS = {
  owner: 'grace',
  name: 'Imigongo Studio',
  tagline: 'Handmade décor from Nyamirambo',
  category: 'CRAFTS',
  description: 'A small studio making Imigongo art, woven baskets and lamps by hand in Nyamirambo.',
  listings: [
    { title: 'Imigongo wall panel, 40×40cm', price: 45000, quantity: 3, description: 'Hand-shaped and painted in the traditional black, white and red.' },
    { title: 'Agaseke woven basket set', price: 28000, quantity: 6, description: 'Three nesting baskets woven from sisal and sweetgrass.' },
    { title: 'Clay pendant lamp', price: 22000, quantity: 4, description: 'Fired clay shade with a warm, patterned glow.' },
  ],
};

const OTHER_LISTINGS = [
  { owner: 'patrick', title: 'Question Coffee, 500g Rwanda beans', price: 12000, quantity: 10, category: 'FOOD', description: 'Freshly roasted single-origin beans.' },
  { owner: 'sandrine', title: 'Leather laptop sleeve, 14 inch', price: 35000, quantity: 5, category: 'RETAIL', description: 'Soft full-grain leather, stitched in Kigali.' },
  { owner: 'aline', title: 'Brand identity sprint (5 days)', price: 250000, quantity: 2, category: 'SERVICES', kind: 'SERVICE', description: 'Logo, colour, type and a one-page brand guide in five focused days.' },
];

async function interestIndex() {
  const response = await call('/profiles/interests');
  const flat = (response.body ?? []).flatMap((group) => group.interests);
  return flat;
}

function pickInterests(catalogue, wanted) {
  const picks = [];
  for (const word of wanted) {
    const match = catalogue.find(
      (interest) =>
        !picks.includes(interest.slug) &&
        (interest.slug.includes(word) || interest.label.toLowerCase().includes(word)),
    );
    if (match) picks.push(match.slug);
  }
  for (const interest of catalogue) {
    if (picks.length >= 4) break;
    if (!picks.includes(interest.slug)) picks.push(interest.slug);
  }
  return picks.slice(0, 6);
}

async function signIn(email, password) {
  const jar = new Jar();
  const response = await call('/auth/login', { method: 'POST', jar, body: { email, password } });
  return response.status === 200 || response.status === 201 ? jar : null;
}

async function ensurePerson(person, catalogue) {
  const email = `${person.key}@demo.nexus.rw`;
  let jar = await signIn(email, PASSWORD);
  if (jar) return jar;

  jar = new Jar();
  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: PASSWORD, displayName: person.name, username: person.username },
  });
  if (registered.status >= 300) throw new Error(`register ${person.key}: ${registered.status} ${JSON.stringify(registered.body)}`);
  if (registered.body?.verificationToken) {
    await call('/auth/verify-email', { method: 'POST', body: { token: registered.body.verificationToken } });
  }
  jar = await signIn(email, PASSWORD);
  if (!jar) throw new Error(`login ${person.key} failed`);

  await call('/profiles/me/onboarding', { method: 'PATCH', jar, body: { step: 1, userType: person.type, occupation: person.occupation, city: 'Kigali' } });
  await call('/profiles/me/onboarding', { method: 'PATCH', jar, body: { step: 2, interestSlugs: pickInterests(catalogue, person.interests) } });
  await call('/profiles/me/onboarding', { method: 'PATCH', jar, body: { step: 3, goalAreas: ['LEARNING'] } });
  await call('/profiles/me/onboarding', { method: 'PATCH', jar, body: { step: 4, scheduleBlocks: [] } });
  await call('/profiles/me/onboarding/complete', { method: 'POST', jar });
  await call('/profiles/me', { method: 'PATCH', jar, body: { bio: person.bio, city: 'Kigali' } });

  const photo = path.join(PEOPLE_DIR, `${person.key}.jpg`);
  if (existsSync(photo)) {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(photo)], { type: 'image/jpeg' }), `${person.key}.jpg`);
    const uploaded = await call('/profiles/me/avatar', { method: 'POST', jar, form });
    if (uploaded.status >= 300) log(`avatar for ${person.key} failed: ${uploaded.status}`);
  }

  created.people += 1;
  log(`person ${person.name}`);
  return jar;
}

async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('[seed] API is not reachable at', BASE);
    process.exit(1);
  }

  const host = await signIn(HOST_EMAIL, HOST_PASSWORD);
  if (!host) {
    console.error('[seed] could not sign in the host account', HOST_EMAIL);
    process.exit(1);
  }
  const hostMe = await call('/auth/me', { jar: host });
  const hostUsername = hostMe.body?.profile?.username ?? hostMe.body?.user?.profile?.username;

  const catalogue = await interestIndex();
  const jars = {};
  for (const person of PEOPLE) jars[person.key] = await ensurePerson(person, catalogue);

  const existingPlaces = (await call('/places', { jar: host })).body ?? [];
  const placeSlugs = Object.fromEntries(existingPlaces.map((place) => [place.name, place.slug]));
  for (const place of PLACES) {
    if (placeSlugs[place.name]) continue;
    const response = await call('/places', {
      method: 'POST',
      jar: jars.grace,
      body: { name: place.name, category: place.category, address: place.address, city: 'Kigali', description: place.description, latitude: place.lat, longitude: place.lng },
    });
    if (response.status < 300) {
      placeSlugs[place.name] = response.body.slug;
      created.places += 1;
    } else log(`place ${place.name} failed: ${response.status}`);
  }

  const reviews = [
    ['Question Coffee', 'kevin', 5, 'Best flat white in Kiyovu and the Wi-Fi never drops.'],
    ['Norrsken House Kigali', 'patrick', 5, 'Where half of Kigali tech gets built.'],
    ['Inzora Rooftop Café', 'aline', 4, 'Come for the books, stay for the sunset.'],
    ['Amahoro Stadium', 'eric', 5, 'The outer pitch on a Sunday morning is perfect.'],
    ['Imigongo Studio', 'sandrine', 5, 'Every piece is a work of art.'],
    ['Repub Lounge', 'divine', 4, 'Brochettes and a view of the whole city.'],
  ];
  for (const [name, who, rating, body] of reviews) {
    if (placeSlugs[name]) await call(`/places/${placeSlugs[name]}/review`, { method: 'POST', jar: jars[who], body: { rating, body } });
  }
  for (const name of ['Question Coffee', 'Norrsken House Kigali']) {
    if (placeSlugs[name]) await call(`/places/${placeSlugs[name]}/save`, { method: 'POST', jar: host, body: { saved: true } });
  }

  const existingEvents = (await call('/events?scope=upcoming', { jar: host })).body ?? [];
  const eventTitles = new Set(existingEvents.map((event) => event.title));
  for (const event of EVENTS) {
    if (eventTitles.has(event.title)) continue;
    const response = await call('/events', {
      method: 'POST',
      jar: jars[event.host],
      body: {
        title: event.title,
        description: event.description,
        startAt: kigali(event.day, event.start),
        endAt: kigali(event.day, event.end),
        placeSlug: placeSlugs[event.place],
        locationText: placeSlugs[event.place] ? undefined : event.place,
        capacity: event.capacity,
        visibility: 'PUBLIC',
      },
    });
    if (response.status >= 300) {
      log(`event ${event.title} failed: ${response.status} ${JSON.stringify(response.body)}`);
      continue;
    }
    created.events += 1;
    for (const who of event.going) await call(`/events/${response.body.slug}/rsvp`, { method: 'POST', jar: jars[who], body: { status: 'GOING' } });
    if (['Kigali Tech Meetup', 'Design Critique Night', 'Sunday Football at Amahoro'].includes(event.title)) {
      await call(`/events/${response.body.slug}/rsvp`, { method: 'POST', jar: host, body: { status: 'GOING' } });
    }
  }

  const existingCircles = (await call('/circles?scope=discover', { jar: host })).body ?? [];
  const mine = (await call('/circles?scope=mine', { jar: host })).body ?? [];
  const circleNames = new Set([...existingCircles, ...mine].map((circle) => circle.name));
  for (const circle of CIRCLES) {
    if (circleNames.has(circle.name)) continue;
    const response = await call('/circles', {
      method: 'POST',
      jar: jars[circle.owner],
      body: { name: circle.name, description: circle.description, visibility: circle.visibility, city: 'Kigali' },
    });
    if (response.status >= 300) {
      log(`circle ${circle.name} failed: ${response.status}`);
      continue;
    }
    created.circles += 1;
    const slug = response.body.slug;
    for (const who of circle.members) await call(`/circles/${slug}/join`, { method: 'POST', jar: jars[who], body: {} });
    if (['Kigali Builders', 'Sunday Ballers', 'Design Kigali'].includes(circle.name)) {
      await call(`/circles/${slug}/join`, { method: 'POST', jar: host, body: {} });
    }
    await call(`/circles/${slug}/posts`, { method: 'POST', jar: jars[circle.owner], body: { body: `Welcome to ${circle.name}. ${circle.description}` } });
  }

  if (hostUsername) {
    for (const who of ['kevin', 'aline', 'eric', 'grace']) {
      const sent = await call(`/people/${hostUsername}/friend-request`, { method: 'POST', jar: jars[who], body: { message: 'Good to find you on NEXUS' } });
      if (sent.status < 300) created.friends += 1;
    }
    const connections = await call('/people/connections', { jar: host });
    for (const request of connections.body?.incoming ?? []) {
      await call(`/people/requests/${request.id}/respond`, { method: 'POST', jar: host, body: { decision: 'ACCEPTED' } });
    }
    for (const who of ['divine', 'patrick', 'sandrine']) await call(`/people/${PEOPLE.find((p) => p.key === who).username}/follow`, { method: 'POST', jar: host });
  }
  for (const [a, b] of [['kevin', 'patrick'], ['aline', 'sandrine'], ['aline', 'divine'], ['eric', 'kevin'], ['grace', 'aline']]) {
    const target = PEOPLE.find((p) => p.key === b).username;
    await call(`/people/${target}/friend-request`, { method: 'POST', jar: jars[a], body: {} });
    const incoming = await call('/people/connections', { jar: jars[b] });
    for (const request of incoming.body?.incoming ?? []) {
      await call(`/people/requests/${request.id}/respond`, { method: 'POST', jar: jars[b], body: { decision: 'ACCEPTED' } });
    }
  }

  for (const post of POSTS) {
    const username = PEOPLE.find((p) => p.key === post.by).username;
    const existing = await call(`/social/posts/by/${username}`, { jar: jars[post.by] });
    const list = Array.isArray(existing.body) ? existing.body : existing.body?.items ?? [];
    if (list.some((existingPost) => existingPost.body === post.body)) continue;
    const response = await call('/social/posts', {
      method: 'POST',
      jar: jars[post.by],
      body: post.poll
        ? { body: post.body, kind: 'POLL', visibility: 'PUBLIC', pollOptions: post.poll }
        : { body: post.body, visibility: 'PUBLIC' },
    });
    if (response.status < 300) {
      created.posts += 1;
      for (const who of ['kevin', 'aline', 'eric']) {
        if (who !== post.by) await call(`/social/posts/${response.body.id}/react`, { method: 'POST', jar: jars[who], body: {} });
      }
    } else log(`post by ${post.by} failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  const businesses = (await call('/businesses', { jar: host })).body ?? [];
  const businessList = Array.isArray(businesses) ? businesses : businesses.items ?? [];
  let businessSlug = businessList.find((business) => business.name === BUSINESS.name)?.slug;
  if (!businessSlug) {
    const response = await call('/businesses', {
      method: 'POST',
      jar: jars[BUSINESS.owner],
      body: { name: BUSINESS.name, tagline: BUSINESS.tagline, category: BUSINESS.category, description: BUSINESS.description, city: 'Kigali', placeSlug: placeSlugs['Imigongo Studio'] },
    });
    if (response.status < 300) businessSlug = response.body.slug;
    else log(`business failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  const listings = (await call('/listings', { jar: host })).body ?? [];
  const listingTitles = new Set((Array.isArray(listings) ? listings : listings.items ?? []).map((listing) => listing.title));
  for (const listing of BUSINESS.listings) {
    if (listingTitles.has(listing.title)) continue;
    const response = await call('/listings', {
      method: 'POST',
      jar: jars[BUSINESS.owner],
      body: { ...listing, category: 'CRAFTS', condition: 'NEW', businessSlug, city: 'Kigali' },
    });
    if (response.status < 300) created.listings += 1;
    else log(`listing ${listing.title} failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  for (const listing of OTHER_LISTINGS) {
    if (listingTitles.has(listing.title)) continue;
    const { owner, ...body } = listing;
    const response = await call('/listings', {
      method: 'POST',
      jar: jars[owner],
      body: { ...body, condition: body.kind === 'SERVICE' ? undefined : 'NEW', city: 'Kigali' },
    });
    if (response.status < 300) created.listings += 1;
    else log(`listing ${listing.title} failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  log('done', JSON.stringify(created));
  log(`demo people sign in with <name>@demo.nexus.rw / ${PASSWORD}`);
}

main().catch((error) => {
  console.error('[seed] failed:', error.message);
  process.exit(1);
});
