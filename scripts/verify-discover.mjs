const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

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

async function call(path, { method = 'GET', body, jar } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (jar) jar.absorb(response);

  let payload = null;
  try {
    payload = await response.json();
  } catch {}

  return { status: response.status, body: payload };
}

const stamp = Date.now();
const HOUR = 3600000;

async function makeUser(tag, { verify = true } = {}) {
  const jar = new Jar();
  const username = `${tag}${stamp}`.slice(0, 24);
  const email = `${tag}.${stamp}@nexus.local`;

  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: `${tag} tester`, username },
  });

  if (verify && registered.body?.verificationToken) {
    await call('/auth/verify-email', {
      method: 'POST',
      body: { token: registered.body.verificationToken },
    });
    await call('/auth/login', {
      method: 'POST',
      jar,
      body: { email, password: 'correct-horse-battery' },
    });
  }

  return { jar, username };
}


function reasonsOf(items, kind, slug) {
  const hit = (items ?? []).find((entry) => entry.kind === kind && entry.slug === slug);
  return hit?.reasons ?? null;
}

async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const me = await makeUser('taste');
  const friend = await makeUser('pal');
  const host = await makeUser('hostr');
  const seller = await makeUser('vend');

  const anon = await call('/discover/for-you');
  record('recommendations require auth', anon.status === 401, `status ${anon.status}`);

  const cold = await call('/discover/for-you', { jar: me.jar });
  record('a brand new account still gets a response', cold.status === 200, `status ${cold.status}`);
  record('a cold start reports zero signals', cold.body?.signals === 0, `${cold.body?.signals} signals`);
  record('a cold start says it will sharpen', (cold.body?.note ?? '').includes('sharper'), cold.body?.note?.slice(0, 40));
  record('personalisation is on by default', cold.body?.personalized === true);

  const cafe = await call('/places', {
    method: 'POST',
    jar: host.jar,
    body: { name: `Kivu Roasters ${stamp}`, category: 'CAFE', city: 'Kigali', address: 'KG 9 Ave' },
  });
  const gym = await call('/places', {
    method: 'POST',
    jar: host.jar,
    body: { name: `Remera Gym ${stamp}`, category: 'SPORT', city: 'Kigali', address: 'KG 11 Ave' },
  });
  record('two places exist to choose between', cafe.status === 201 && gym.status === 201);

  await call(`/places/${cafe.body.slug}/save`, { method: 'POST', jar: me.jar, body: { saved: true } });
  await call(`/places/${cafe.body.slug}/review`, {
    method: 'POST',
    jar: me.jar,
    body: { rating: 5, body: 'Best flat white in town' },
  });

  const warmed = await call('/discover/for-you', { jar: me.jar });
  record('saving something registers as a signal', (warmed.body?.signals ?? 0) > 0, `${warmed.body?.signals} signals`);
  record('the note switches to what you have done', (warmed.body?.note ?? '').includes('actually done'), warmed.body?.note?.slice(0, 40));
  record('the top categories reflect the save', (warmed.body?.topCategories ?? []).includes('CAFE'), (warmed.body?.topCategories ?? []).join(','));

  const cafeEvent = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: {
      title: `Coffee cupping ${stamp}`,
      startAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      placeSlug: cafe.body.slug,
      visibility: 'PUBLIC',
    },
  });
  const gymEvent = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: {
      title: `Bench press clinic ${stamp}`,
      startAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      placeSlug: gym.body.slug,
      visibility: 'PUBLIC',
    },
  });
  record('both events were created', cafeEvent.status === 201 && gymEvent.status === 201);

  const ranked = await call('/discover/for-you?limit=60', { jar: me.jar });
  const items = ranked.body?.items ?? [];
  const cafeEntry = items.find((entry) => entry.kind === 'EVENT' && entry.slug === cafeEvent.body.slug);
  const gymEntry = items.find((entry) => entry.kind === 'EVENT' && entry.slug === gymEvent.body.slug);

  record('the event at a place you like outranks the one you do not', Boolean(cafeEntry) && (!gymEntry || cafeEntry.score > gymEntry.score), `${cafeEntry?.score?.toFixed(1)} vs ${gymEntry?.score?.toFixed(1)}`);
  record('it explains itself in words', (cafeEntry?.reasons ?? []).some((line) => line.includes('cafe')), (cafeEntry?.reasons ?? []).join(' / '));
  record('every recommendation carries at least one reason', items.every((entry) => entry.reasons.length > 0));
  record('nothing you already saved is recommended back', !items.some((entry) => entry.kind === 'PLACE' && entry.slug === cafe.body.slug));

  const online = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: {
      title: `Remote design review ${stamp}`,
      startAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      isOnline: true,
      joinUrl: 'https://meet.example.com/design-review',
      visibility: 'PUBLIC',
    },
  });
  record('an online event can be created without a place', online.status === 201, `status ${online.status}`);
  const onlineDetail = await call(`/events/${online.body.slug}`, { jar: me.jar });
  record('it is marked online', onlineDetail.body?.isOnline === true);
  record('the join link is carried on the event', onlineDetail.body?.joinUrl === 'https://meet.example.com/design-review');

  const withOnline = await call('/discover/for-you?limit=60', { jar: me.jar });
  const onlineReasons = reasonsOf(withOnline.body?.items, 'EVENT', online.body.slug);
  record('an online event says distance does not matter', (onlineReasons ?? []).some((line) => line.includes('distance')), (onlineReasons ?? []).join(' / '));

  await call(`/people/${friend.username}/follow`, { method: 'POST', jar: me.jar });
  const request = await call(`/people/${friend.username}/friend-request`, {
    method: 'POST',
    jar: me.jar,
    body: {},
  });
  const relationship = await call(`/people/${me.username}/relationship`, { jar: friend.jar });
  const requestId = relationship.body?.incomingRequestId;
  if (requestId) {
    await call(`/people/requests/${requestId}/respond`, {
      method: 'POST',
      jar: friend.jar,
      body: { decision: 'ACCEPTED' },
    });
  }
  const confirmed = await call(`/people/${friend.username}/relationship`, { jar: me.jar });
  record('a friendship was formed for the test', confirmed.body?.isFriend === true, `request ${request.status}`);

  await call(`/events/${gymEvent.body.slug}/rsvp`, {
    method: 'POST',
    jar: friend.jar,
    body: { status: 'GOING' },
  });

  const social = await call('/discover/for-you?limit=60', { jar: me.jar });
  const gymNow = (social.body?.items ?? []).find((entry) => entry.kind === 'EVENT' && entry.slug === gymEvent.body.slug);
  record('a friend going lifts an event you would otherwise skip', Boolean(gymNow), `score ${gymNow?.score?.toFixed(1)}`);
  record('and it says which friend signal caused it', (gymNow?.reasons ?? []).some((line) => line.includes('friend')), (gymNow?.reasons ?? []).join(' / '));

  const listing = await call('/listings', {
    method: 'POST',
    jar: seller.jar,
    body: { title: `Espresso tamper ${stamp}`, price: 12000, category: 'FOOD', city: 'Kigali' },
  });
  const unrelated = await call('/listings', {
    method: 'POST',
    jar: seller.jar,
    body: { title: `Tractor part ${stamp}`, price: 90000, category: 'AGRICULTURE', city: 'Kigali' },
  });
  record('two listings exist to choose between', listing.status === 201 && unrelated.status === 201);

  await call(`/listings/${listing.body.slug}/save`, {
    method: 'POST',
    jar: me.jar,
    body: { saved: true },
  });

  const shopping = await call('/discover/for-you?limit=60', { jar: me.jar });
  const tractor = (shopping.body?.items ?? []).find((entry) => entry.kind === 'LISTING' && entry.slug === unrelated.body.slug);
  record('an unrelated listing is not forced into the feed', !tractor || (tractor.reasons ?? []).length > 0, tractor ? tractor.reasons.join(' / ') : 'absent');

  const kinds = new Set((shopping.body?.items ?? []).map((entry) => entry.kind));
  record('the feed mixes more than one kind of thing', kinds.size >= 2, [...kinds].join(','));

  const before = await call('/discover/for-you', { jar: me.jar });
  record('personalisation reports as on', before.body?.personalized === true);

  await call('/profiles/me/privacy', {
    method: 'PATCH',
    jar: me.jar,
    body: { personalizationOptIn: false },
  });

  const optedOut = await call('/discover/for-you', { jar: me.jar });
  record('opting out turns personalisation off', optedOut.body?.personalized === false);
  record('opting out says so plainly', (optedOut.body?.note ?? '').includes('Personalisation is off'), optedOut.body?.note?.slice(0, 40));
  record('opting out stops counting your behaviour', optedOut.body?.signals === 0, `${optedOut.body?.signals} signals`);
  record('opting out still returns something to look at', (optedOut.body?.items ?? []).length > 0, `${optedOut.body?.items?.length} items`);

  await call('/profiles/me/privacy', {
    method: 'PATCH',
    jar: me.jar,
    body: { personalizationOptIn: true },
  });

  const backOn = await call('/discover/for-you', { jar: me.jar });
  record('opting back in restores it', backOn.body?.personalized === true && (backOn.body?.signals ?? 0) > 0, `${backOn.body?.signals} signals`);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
