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


function dayKey(offset = 0) {
  const date = new Date(Date.now() + offset * 86400000);
  return date.toISOString().slice(0, 10);
}

function calendarCount(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.events)) return payload.events.length;
  if (Array.isArray(payload?.days)) return payload.days.reduce((sum, day) => sum + (day.events?.length ?? 0), 0);
  return 0;
}

async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const learner = await makeUser('learn');
  const other = await makeUser('lurk');

  const created = await call('/learning/paths', {
    method: 'POST',
    jar: learner.jar,
    body: {
      title: `Discrete Mathematics ${stamp}`,
      subject: 'Mathematics',
      source: 'COURSE',
      modules: [
        { title: 'Logic and proofs', estimatedMinutes: 60 },
        { title: 'Set theory', estimatedMinutes: 45 },
        { title: 'Graph theory', estimatedMinutes: 90 },
      ],
    },
  });
  record('path created with modules', created.status === 201 && created.body?.moduleCount === 3, `${created.body?.moduleCount} modules`);
  record('new path starts at zero percent', created.body?.percent === 0);
  record('remaining minutes summed from modules', created.body?.minutesLeft === 195, `${created.body?.minutesLeft} min`);
  record('next module is the first one', created.body?.nextModule?.title === 'Logic and proofs');

  const pathId = created.body?.id;
  const moduleIds = (created.body?.modules ?? []).map((module) => module.id);

  const short = await call('/learning/paths', {
    method: 'POST',
    jar: learner.jar,
    body: { title: 'x' },
  });
  record('path title must be real', short.status === 400, `status ${short.status}`);

  const badGoal = await call('/learning/paths', {
    method: 'POST',
    jar: learner.jar,
    body: { title: 'Linked to nothing', goalId: 'goal-that-does-not-exist' },
  });
  record('cannot attach a path to a goal you do not own', badGoal.status === 404, `status ${badGoal.status}`);

  const listed = await call('/learning/paths', { jar: learner.jar });
  record('paths list returns the new path', (listed.body ?? []).some((path) => path.id === pathId));

  const foreign = await call(`/learning/paths/${pathId}`, { jar: other.jar });
  record('another learner cannot read your path', foreign.status === 404, `status ${foreign.status}`);

  const done = await call(`/learning/paths/${pathId}/modules/${moduleIds[0]}`, {
    method: 'PATCH',
    jar: learner.jar,
    body: { done: true },
  });
  record('completing a module moves the percentage', done.body?.percent === 33, `${done.body?.percent}%`);
  record('completed module drops out of minutes left', done.body?.minutesLeft === 135, `${done.body?.minutesLeft} min`);
  record('next module advances', done.body?.nextModule?.title === 'Set theory');

  const foreignDone = await call(`/learning/paths/${pathId}/modules/${moduleIds[1]}`, {
    method: 'PATCH',
    jar: other.jar,
    body: { done: true },
  });
  record('another learner cannot tick your modules', foreignDone.status === 404, `status ${foreignDone.status}`);

  const undone = await call(`/learning/paths/${pathId}/modules/${moduleIds[0]}`, {
    method: 'PATCH',
    jar: learner.jar,
    body: { done: false },
  });
  record('un-ticking a module is allowed', undone.body?.percent === 0);

  for (const id of moduleIds) {
    await call(`/learning/paths/${pathId}/modules/${id}`, {
      method: 'PATCH',
      jar: learner.jar,
      body: { done: true },
    });
  }

  const finished = await call(`/learning/paths/${pathId}`, { jar: learner.jar });
  record('finishing every module completes the path', finished.body?.status === 'COMPLETED', finished.body?.status);
  record('completed path records when', Boolean(finished.body?.completedAt));

  await call(`/learning/paths/${pathId}/modules/${moduleIds[2]}`, {
    method: 'PATCH',
    jar: learner.jar,
    body: { done: false },
  });
  const reopened = await call(`/learning/paths/${pathId}`, { jar: learner.jar });
  record('re-opening a module reactivates the path', reopened.body?.status === 'ACTIVE', reopened.body?.status);

  const added = await call(`/learning/paths/${pathId}/modules`, {
    method: 'POST',
    jar: learner.jar,
    body: { title: 'Combinatorics', estimatedMinutes: 50 },
  });
  record('modules can be added later', added.status === 201 && added.body?.sortOrder === 3, `sortOrder ${added.body?.sortOrder}`);

  const session = await call('/learning/sessions', {
    method: 'POST',
    jar: learner.jar,
    body: { pathId, minutes: 75, note: 'Worked through proof exercises' },
  });
  record('study session logged', session.status === 201 && session.body?.minutes === 75);

  const futureSession = await call('/learning/sessions', {
    method: 'POST',
    jar: learner.jar,
    body: { pathId, minutes: 30, startedAt: new Date(Date.now() + 86400000).toISOString() },
  });
  record('a session cannot start in the future', futureSession.status === 400, `status ${futureSession.status}`);

  const longSession = await call('/learning/sessions', {
    method: 'POST',
    jar: learner.jar,
    body: { pathId, minutes: 5000 },
  });
  record('a session cannot exceed a day', longSession.status === 400, `status ${longSession.status}`);

  const foreignSession = await call('/learning/sessions', {
    method: 'POST',
    jar: other.jar,
    body: { pathId, minutes: 30 },
  });
  record('cannot log study against a path you do not own', foreignSession.status === 404, `status ${foreignSession.status}`);

  const withMinutes = await call(`/learning/paths/${pathId}`, { jar: learner.jar });
  record('logged minutes roll up onto the path', withMinutes.body?.minutesLogged === 75, `${withMinutes.body?.minutesLogged} min`);
  record('path detail carries its sessions', withMinutes.body?.sessions?.length === 1);

  const anonLearning = await call('/learning/paths');
  record('learning requires auth', anonLearning.status === 401, `status ${anonLearning.status}`);

  const progress = await call('/progress', { jar: learner.jar });
  record('progress reads study minutes', progress.body?.totals?.studyMinutes === 75, `${progress.body?.totals?.studyMinutes} min`);
  record('progress counts the active path', progress.body?.totals?.pathsActive === 1);
  record('progress streak counts today', progress.body?.streak >= 1, `streak ${progress.body?.streak}`);
  record('progress returns a full day series', progress.body?.series?.length === progress.body?.windowDays);
  record('progress reports this week', progress.body?.week?.minutes === 75, `${progress.body?.week?.minutes} min`);

  const anonProgress = await call('/progress');
  record('progress requires auth', anonProgress.status === 401, `status ${anonProgress.status}`);

  const tomorrow = dayKey(1);

  const busy = await call('/calendar/events', {
    method: 'POST',
    jar: learner.jar,
    body: {
      title: 'Lectures',
      kind: 'PERSONAL',
      startAt: `${tomorrow}T06:00:00.000Z`,
      endAt: `${tomorrow}T10:00:00.000Z`,
    },
  });
  record('a fixed commitment can be placed on the day', busy.status === 201, `status ${busy.status}`);

  await call('/tasks', {
    method: 'POST',
    jar: learner.jar,
    body: { title: `Submit lab report ${stamp}`, priority: 'HIGH', dueAt: new Date(Date.now() + 86400000).toISOString() },
  });

  const plan = await call('/ai/plan/generate', {
    method: 'POST',
    jar: learner.jar,
    body: { planFor: tomorrow },
  });
  record('planner produces proposals', (plan.body?.proposals?.length ?? 0) > 0, `${plan.body?.proposals?.length} proposals`);
  record('planner says which engine planned it', plan.body?.engine === 'RULES' || plan.body?.engine === 'ASSISTED', plan.body?.engine);
  record('every proposal explains itself', (plan.body?.proposals ?? []).every((entry) => typeof entry.rationale === 'string' && entry.rationale.length > 10));
  record('proposals start as PROPOSED', (plan.body?.proposals ?? []).every((entry) => entry.status === 'PROPOSED'));
  record('proposals are for the requested day', plan.body?.planFor === tomorrow, plan.body?.planFor);

  const proposals = plan.body?.proposals ?? [];
  const overlapping = proposals.some((a, i) =>
    proposals.some((b, j) => i !== j && new Date(a.startAt) < new Date(b.endAt) && new Date(b.startAt) < new Date(a.endAt)),
  );
  record('proposals never overlap each other', !overlapping);

  const busyStart = new Date(`${tomorrow}T06:00:00.000Z`);
  const busyEnd = new Date(`${tomorrow}T10:00:00.000Z`);
  const clashes = proposals.some(
    (entry) => new Date(entry.startAt) < busyEnd && busyStart < new Date(entry.endAt),
  );
  record('proposals never collide with a fixed commitment', !clashes);
  record('the day you are already committed to is listed back', (plan.body?.commitments ?? []).some((entry) => entry.label === 'Lectures'));

  const badDay = await call('/ai/plan/generate', {
    method: 'POST',
    jar: learner.jar,
    body: { planFor: 'tomorrow please' },
  });
  record('planner rejects a malformed day', badDay.status === 400, `status ${badDay.status}`);

  const calendarBefore = await call(`/calendar?from=${tomorrow}T00:00:00.000Z&to=${tomorrow}T23:59:59.000Z`, { jar: learner.jar });
  const countBefore = calendarCount(calendarBefore.body);

  const regenerated = await call('/ai/plan/generate', {
    method: 'POST',
    jar: learner.jar,
    body: { planFor: tomorrow },
  });
  record('regenerating supersedes rather than duplicates', regenerated.body?.proposals?.length === proposals.length, `${regenerated.body?.proposals?.length} proposals`);

  const calendarAfter = await call(`/calendar?from=${tomorrow}T00:00:00.000Z&to=${tomorrow}T23:59:59.000Z`, { jar: learner.jar });
  record('planning alone never writes to the calendar', calendarCount(calendarAfter.body) === countBefore, `${countBefore} -> ${calendarCount(calendarAfter.body)}`);

  const first = regenerated.body?.proposals?.[0];

  const foreignAccept = await call(`/ai/plan/${first?.id}/accept`, { method: 'POST', jar: other.jar });
  record('another user cannot accept your plan', foreignAccept.status === 404, `status ${foreignAccept.status}`);

  const accepted = await call(`/ai/plan/${first?.id}/accept`, { method: 'POST', jar: learner.jar });
  record('accepting a proposal marks it accepted', accepted.body?.status === 'ACCEPTED', accepted.body?.status);
  record('accepting creates the calendar entry', Boolean(accepted.body?.calendarEventId));

  const twice = await call(`/ai/plan/${first?.id}/accept`, { method: 'POST', jar: learner.jar });
  record('a decided proposal cannot be decided again', twice.status === 400, `status ${twice.status}`);

  const second = regenerated.body?.proposals?.[1];

  if (second) {
    const declined = await call(`/ai/plan/${second.id}/decline`, { method: 'POST', jar: learner.jar });
    record('declining a proposal marks it declined', declined.body?.status === 'DECLINED', declined.body?.status);
    record('declining writes no calendar entry', !declined.body?.calendarEventId);
  } else {
    record('declining a proposal marks it declined', false, 'no second proposal generated');
    record('declining writes no calendar entry', false, 'no second proposal generated');
  }

  const afterAccept = await call(`/calendar?from=${tomorrow}T00:00:00.000Z&to=${tomorrow}T23:59:59.000Z`, { jar: learner.jar });
  record('an accepted plan does reach the calendar', calendarCount(afterAccept.body) === countBefore + 1, `${countBefore} -> ${calendarCount(afterAccept.body)}`);

  const planList = await call(`/ai/plan?planFor=${tomorrow}`, { jar: learner.jar });
  record('plan list hides declined proposals', (planList.body?.proposals ?? []).every((entry) => entry.status !== 'DECLINED'));
  record('plan list shows what you are already committed to', Array.isArray(planList.body?.commitments));

  const anonPlan = await call('/ai/plan');
  record('planning requires auth', anonPlan.status === 401, `status ${anonPlan.status}`);

  const removed = await call(`/learning/paths/${pathId}`, { method: 'DELETE', jar: learner.jar });
  record('a path can be removed', removed.body?.deleted === true);

  const goneList = await call('/learning/paths', { jar: learner.jar });
  record('a removed path leaves the list', !(goneList.body ?? []).some((path) => path.id === pathId));

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
