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

async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const host = await makeUser('host');
  const guest = await makeUser('guest');
  const other = await makeUser('other');
  const unverified = await makeUser('unvev', { verify: false });

  const place = await call('/places', {
    method: 'POST',
    jar: host.jar,
    body: {
      name: `Question Coffee ${stamp}`,
      category: 'CAFE',
      city: 'Kigali',
      address: 'KG 7 Ave',
      latitude: -1.9536,
      longitude: 30.0606,
    },
  });
  record('place created with coordinates', place.status === 201 && Boolean(place.body?.slug), place.body?.slug);

  const placeSlug = place.body?.slug;

  const blockedPlace = await call('/places', {
    method: 'POST',
    jar: unverified.jar,
    body: { name: 'Unverified place' },
  });
  record('unverified account cannot add places', blockedPlace.status === 403, `status ${blockedPlace.status}`);

  const halfCoords = await call('/places', {
    method: 'POST',
    jar: host.jar,
    body: { name: `Half coords ${stamp}`, latitude: -1.95 },
  });
  record('latitude without longitude is rejected', halfCoords.status === 400, `status ${halfCoords.status}`);

  const badLat = await call('/places', {
    method: 'POST',
    jar: host.jar,
    body: { name: `Bad lat ${stamp}`, latitude: 120, longitude: 30 },
  });
  record('an impossible latitude is rejected', badLat.status === 400, `status ${badLat.status}`);

  const far = await call('/places', {
    method: 'POST',
    jar: host.jar,
    body: {
      name: `Far Place ${stamp}`,
      category: 'VENUE',
      city: 'Kigali',
      latitude: -2.6,
      longitude: 29.74,
    },
  });

  const nearby = await call('/places?lat=-1.9536&lng=30.0606', { jar: guest.jar });
  const first = (nearby.body ?? [])[0];
  const withDistance = (nearby.body ?? []).filter((item) => item.distanceKm !== null);
  record(
    'places come back sorted by real distance',
    withDistance.length >= 2 && first?.distanceKm === 0,
    `nearest ${first?.name} at ${first?.distanceKm}km`,
  );

  const farEntry = (nearby.body ?? []).find((item) => item.slug === far.body?.slug);
  record(
    'distance is computed, not faked',
    farEntry && farEntry.distanceKm > 80 && farEntry.distanceKm < 130,
    `far place at ${farEntry?.distanceKm}km`,
  );

  const filtered = await call('/places?category=CAFE', { jar: guest.jar });
  record(
    'category filtering works',
    (filtered.body ?? []).every((item) => item.category === 'CAFE'),
    `${filtered.body?.length} cafés`,
  );

  const reviewed = await call(`/places/${placeSlug}/review`, {
    method: 'POST',
    jar: guest.jar,
    body: { rating: 5, body: 'Quiet enough to work' },
  });
  record('a place review updates the average', reviewed.body?.rating === 5 && reviewed.body?.reviewCount === 1);

  const second = await call(`/places/${placeSlug}/review`, {
    method: 'POST',
    jar: other.jar,
    body: { rating: 3 },
  });
  record('a second review moves the average', second.body?.rating === 4 && second.body?.reviewCount === 2, `now ${second.body?.rating}`);

  const changed = await call(`/places/${placeSlug}/review`, {
    method: 'POST',
    jar: guest.jar,
    body: { rating: 1 },
  });
  record(
    'reviewing twice replaces rather than stacks',
    changed.body?.reviewCount === 2,
    `${changed.body?.reviewCount} reviews, average ${changed.body?.rating}`,
  );

  const badRating = await call(`/places/${placeSlug}/review`, {
    method: 'POST',
    jar: guest.jar,
    body: { rating: 9 },
  });
  record('out of range ratings are rejected', badRating.status === 400, `status ${badRating.status}`);

  await call(`/places/${placeSlug}/save`, { method: 'POST', jar: guest.jar, body: { saved: true } });
  const saved = await call('/places?saved=true', { jar: guest.jar });
  record('saved places can be listed on their own', (saved.body ?? []).length === 1);

  const event = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: {
      title: `Kigali Tech Night ${stamp}`,
      description: 'Talks, demos and the part afterwards.',
      startAt: new Date(Date.now() + 48 * HOUR).toISOString(),
      endAt: new Date(Date.now() + 52 * HOUR).toISOString(),
      placeSlug,
      capacity: 2,
    },
  });
  record('event created with a check-in code', event.status === 201 && Boolean(event.body?.checkInCode));

  const eventSlug = event.body?.slug;
  const code = event.body?.checkInCode;

  const pastEvent = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: { title: 'Past event', startAt: new Date(Date.now() - 72 * HOUR).toISOString() },
  });
  record('events cannot be created in the past', pastEvent.status === 400, `status ${pastEvent.status}`);

  const backwards = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: {
      title: 'Backwards event',
      startAt: new Date(Date.now() + 48 * HOUR).toISOString(),
      endAt: new Date(Date.now() + 24 * HOUR).toISOString(),
    },
  });
  record('an event ending before it starts is rejected', backwards.status === 400, `status ${backwards.status}`);

  const hostView = await call(`/events/${eventSlug}`, { jar: host.jar });
  record('the host is counted as going', hostView.body?.goingCount === 1 && hostView.body?.myStatus === 'GOING');
  record('the host can see the check-in code', hostView.body?.checkInCode === code);

  const guestView = await call(`/events/${eventSlug}`, { jar: guest.jar });
  record('a guest cannot see the check-in code', guestView.body?.checkInCode === null);

  const rsvp = await call(`/events/${eventSlug}/rsvp`, {
    method: 'POST',
    jar: guest.jar,
    body: { status: 'GOING' },
  });
  record('rsvp going works', rsvp.body?.status === 'GOING');

  const afterRsvp = await call(`/events/${eventSlug}`, { jar: guest.jar });
  record(
    'capacity counts down as people join',
    afterRsvp.body?.goingCount === 2 && afterRsvp.body?.spotsLeft === 0,
    `${afterRsvp.body?.goingCount} going, ${afterRsvp.body?.spotsLeft} left`,
  );

  const full = await call(`/events/${eventSlug}/rsvp`, {
    method: 'POST',
    jar: other.jar,
    body: { status: 'GOING' },
  });
  record('a full event refuses another attendee', full.status === 400, `status ${full.status}`);

  const interested = await call(`/events/${eventSlug}/rsvp`, {
    method: 'POST',
    jar: other.jar,
    body: { status: 'INTERESTED' },
  });
  record('interested still works when going is full', interested.body?.status === 'INTERESTED');

  const hostDecline = await call(`/events/${eventSlug}/rsvp`, {
    method: 'POST',
    jar: host.jar,
    body: { status: 'DECLINED' },
  });
  record('a host cannot decline their own event', hostDecline.status === 400, `status ${hostDecline.status}`);

  const wrongCode = await call(`/events/${eventSlug}/check-in`, {
    method: 'POST',
    jar: guest.jar,
    body: { code: 'WRONG123' },
  });
  record('a wrong check-in code is refused', wrongCode.status === 400, `status ${wrongCode.status}`);

  const tooEarly = await call(`/events/${eventSlug}/check-in`, {
    method: 'POST',
    jar: guest.jar,
    body: { code },
  });
  record(
    'check-in refuses to open days early',
    tooEarly.status === 400,
    `status ${tooEarly.status}`,
  );

  const soon = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: {
      title: `Starting soon ${stamp}`,
      startAt: new Date(Date.now() + HOUR).toISOString(),
    },
  });

  const checkedIn = await call(`/events/${soon.body?.slug}/check-in`, {
    method: 'POST',
    jar: guest.jar,
    body: { code: soon.body?.checkInCode },
  });
  record('check-in works inside the window', checkedIn.body?.checkedIn === true);

  const attendees = await call(`/events/${soon.body?.slug}/attendees`, { jar: host.jar });
  record(
    'the host sees who has checked in',
    attendees.body?.some((person) => person.username === guest.username && person.checkedIn === true),
  );

  const guestAttendees = await call(`/events/${soon.body?.slug}/attendees`, { jar: guest.jar });
  record(
    'a guest does not see check-in state',
    guestAttendees.body?.every((person) => person.checkedIn === undefined),
  );

  const earlyReview = await call(`/events/${eventSlug}/review`, {
    method: 'POST',
    jar: guest.jar,
    body: { rating: 5 },
  });
  record(
    'an event cannot be reviewed before it happens',
    earlyReview.status === 400,
    `status ${earlyReview.status}`,
  );

  const privateEvent = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: {
      title: `Private dinner ${stamp}`,
      startAt: new Date(Date.now() + 72 * HOUR).toISOString(),
      visibility: 'PRIVATE',
    },
  });

  const hidden = await call(`/events/${privateEvent.body?.slug}`, { jar: other.jar });
  record('a private event is hidden from strangers', hidden.status === 403, `status ${hidden.status}`);

  const upcoming = await call('/events', { jar: other.jar });
  record(
    'the upcoming list excludes private events you are not part of',
    !(upcoming.body ?? []).some((item) => item.slug === privateEvent.body?.slug),
  );

  const invited = await call(`/events/${eventSlug}/invite`, {
    method: 'POST',
    jar: host.jar,
    body: { usernames: [other.username] },
  });
  record('invites go out', invited.body?.invited === 1);

  const theirNotifications = await call('/notifications', { jar: other.jar });
  record(
    'an invite arrives as an EVENTS notification',
    (theirNotifications.body?.notifications ?? []).some((item) => item.category === 'EVENTS'),
  );

  const going = await call('/events?scope=going', { jar: guest.jar });
  record('the going scope lists what you rsvped to', (going.body ?? []).length >= 1, `${going.body?.length} events`);

  const hosting = await call('/events?scope=hosting', { jar: host.jar });
  record('the hosting scope lists what you run', (hosting.body ?? []).length >= 3, `${hosting.body?.length} events`);

  const foreignCancel = await call(`/events/${eventSlug}`, { method: 'DELETE', jar: guest.jar });
  record('only the host can cancel', foreignCancel.status === 403, `status ${foreignCancel.status}`);

  const cancelled = await call(`/events/${privateEvent.body?.slug}`, { method: 'DELETE', jar: host.jar });
  record('the host can cancel', cancelled.body?.cancelled === true);

  const anon = await call('/events');
  record('events require auth', anon.status === 401, `status ${anon.status}`);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
