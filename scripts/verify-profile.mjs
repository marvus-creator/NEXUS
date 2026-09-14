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
const email = `profile.${stamp}@nexus.local`;
const username = `profile_${stamp}`.slice(0, 24);

async function main() {
  const jar = new Jar();

  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const interests = await call('/profiles/interests');
  const flat = (interests.body ?? []).flatMap((group) => group.interests);
  record(
    'interest catalogue is public and grouped',
    interests.status === 200 && (interests.body?.length ?? 0) > 0,
    `${interests.body?.length ?? 0} categories, ${flat.length} interests`,
  );

  await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: 'Onboard Check', username },
  });

  const before = await call('/auth/me', { jar });
  record(
    'new profile starts un-onboarded',
    before.body?.profile?.onboardingStep === 0 && before.body?.profile?.onboardedAt === null,
    `step ${before.body?.profile?.onboardingStep}`,
  );

  const step1 = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: { step: 1, userType: 'STUDENT', occupation: 'Software engineering student', city: 'Kigali' },
  });
  record('step 1 saves identity', step1.status === 200 && step1.body?.onboardingStep === 1);

  const picks = flat.slice(0, 5).map((interest) => interest.slug);
  const step2 = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: { step: 2, interestSlugs: picks },
  });
  record('step 2 links interests', step2.status === 200, `${picks.length} linked`);

  const badInterest = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: { step: 2, interestSlugs: ['not-a-real-interest'] },
  });
  record('unknown interest rejected', badInterest.status === 400, `status ${badInterest.status}`);

  const step3 = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: { step: 3, goalAreas: ['SCHOOL', 'LEARNING'] },
  });
  record('step 3 saves goals', step3.status === 200);

  const schedule = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    label: 'Classes',
    kind: 'CLASS',
    dayOfWeek,
    startMinute: 450,
    endMinute: 1040,
  }));

  const step4 = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: { step: 4, scheduleBlocks: schedule },
  });
  record('step 4 saves the week', step4.status === 200, `${schedule.length} blocks`);

  const backwards = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: {
      step: 4,
      scheduleBlocks: [{ label: 'Broken', kind: 'CLASS', dayOfWeek: 1, startMinute: 600, endMinute: 300 }],
    },
  });
  record('block ending before it starts rejected', backwards.status === 400, `status ${backwards.status}`);

  const step5 = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: { step: 5, helpAreas: ['PLANNING', 'LEARNING'] },
  });
  record('step 5 saves help areas', step5.status === 200);

  const completed = await call('/profiles/me/onboarding/complete', { method: 'POST', jar });
  record('onboarding completes', completed.status === 201 && Boolean(completed.body?.onboardedAt));

  const after = await call('/auth/me', { jar });
  const profile = after.body?.profile;
  record(
    'everything round-trips to /auth/me',
    profile?.userType === 'STUDENT' &&
      profile?.city === 'Kigali' &&
      profile?.interests?.length === 5 &&
      profile?.goalAreas?.length === 2 &&
      profile?.helpAreas?.length === 2 &&
      profile?.scheduleBlocks?.length === 5,
    `${profile?.interests?.length} interests, ${profile?.scheduleBlocks?.length} blocks`,
  );

  const rebuilt = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: { step: 2, interestSlugs: flat.slice(0, 3).map((i) => i.slug) },
  });
  const afterRelink = await call('/auth/me', { jar });
  record(
    'relinking interests replaces rather than duplicates',
    rebuilt.status === 200 && afterRelink.body?.profile?.interests?.length === 3,
    `${afterRelink.body?.profile?.interests?.length} interests`,
  );

  const edited = await call('/profiles/me', {
    method: 'PATCH',
    jar,
    body: { bio: 'Building Nexus from Kigali.', skills: ['java', 'typescript'], currency: 'USD' },
  });
  record('profile edit saves', edited.status === 200);

  const privacy = await call('/profiles/me/privacy', {
    method: 'PATCH',
    jar,
    body: { profileVisibility: 'FRIENDS', messagePolicy: 'FRIENDS' },
  });
  record('privacy settings save', privacy.status === 200);

  const publicView = await call(`/profiles/${username}`);
  record(
    'public profile readable without auth',
    publicView.status === 200 && publicView.body?.username === username,
    `status ${publicView.status}`,
  );
  record(
    'public profile hides private fields',
    publicView.body?.email === undefined && publicView.body?.helpAreas === undefined,
    'no email or help areas exposed',
  );

  await call('/profiles/me/privacy', {
    method: 'PATCH',
    jar,
    body: { profileVisibility: 'PRIVATE' },
  });

  const blocked = await call(`/profiles/${username}`);
  record('private profile blocked from strangers', blocked.status === 403, `status ${blocked.status}`);

  const owner = await call(`/profiles/${username}`, { jar });
  record('owner can still see their private profile', owner.status === 200 && owner.body?.isOwner === true);

  const missing = await call('/profiles/definitely-not-a-user');
  record('unknown username returns 404', missing.status === 404, `status ${missing.status}`);

  const anon = await call('/profiles/me/onboarding', {
    method: 'PATCH',
    body: { step: 1, userType: 'STUDENT' },
  });
  record('onboarding requires auth', anon.status === 401, `status ${anon.status}`);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
