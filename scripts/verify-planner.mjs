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
const email = `planner.${stamp}@nexus.local`;
const username = `planner_${stamp}`.slice(0, 24);

const DAY_MS = 86400000;
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

async function main() {
  const jar = new Jar();

  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: 'Planner Check', username },
  });

  const welcome = await call('/notifications', { jar });
  record(
    'registration creates a welcome notification',
    welcome.body?.unread >= 1 && welcome.body?.notifications?.[0]?.category === 'SYSTEM',
    `${welcome.body?.unread} unread`,
  );

  await call('/profiles/me/onboarding', {
    method: 'PATCH',
    jar,
    body: {
      step: 4,
      scheduleBlocks: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        label: 'Classes',
        kind: 'CLASS',
        dayOfWeek,
        startMinute: 450,
        endMinute: 1040,
      })),
    },
  });

  const goal = await call('/goals', {
    method: 'POST',
    jar,
    body: {
      title: 'Become a better developer',
      area: 'LEARNING',
      horizon: 'LONG',
      milestones: ['Learn Java', 'Build 3 projects', 'Practice algorithms'],
    },
  });
  record(
    'goal created with milestones',
    goal.status === 201 && goal.body?.milestones?.length === 3 && goal.body?.progress === 0,
    `progress ${goal.body?.progress}%`,
  );

  const goalId = goal.body?.id;
  const milestones = goal.body?.milestones ?? [];

  const firstDone = await call(`/goals/milestones/${milestones[0]?.id}/toggle`, {
    method: 'PATCH',
    jar,
    body: { done: true },
  });
  record(
    'milestone completion moves goal progress',
    firstDone.body?.progress === 33,
    `progress ${firstDone.body?.progress}%`,
  );

  const task = await call('/tasks', {
    method: 'POST',
    jar,
    body: {
      title: 'Finish Java assignment',
      priority: 'HIGH',
      goalId,
      dueAt: iso(2 * DAY_MS),
      category: 'School',
    },
  });
  record('task created and linked to a goal', task.status === 201 && task.body?.goalId === goalId);

  const badGoal = await call('/tasks', {
    method: 'POST',
    jar,
    body: { title: 'Orphan', goalId: 'not-a-real-goal' },
  });
  record('task rejects an unknown goal', badGoal.status === 400, `status ${badGoal.status}`);

  await call('/tasks', {
    method: 'POST',
    jar,
    body: { title: 'Overdue thing', dueAt: iso(-2 * DAY_MS) },
  });

  const counts = await call('/tasks/counts', { jar });
  record(
    'task counts split open and overdue',
    counts.body?.open === 2 && counts.body?.overdue === 1,
    `open ${counts.body?.open}, overdue ${counts.body?.overdue}`,
  );

  const overdue = await call('/tasks?scope=overdue', { jar });
  record('overdue scope filters correctly', overdue.body?.length === 1, `${overdue.body?.length} returned`);

  const recurring = await call('/tasks', {
    method: 'POST',
    jar,
    body: { title: 'Daily revision', recurrence: 'DAILY', dueAt: iso(DAY_MS) },
  });

  const toggled = await call(`/tasks/${recurring.body?.id}/toggle`, {
    method: 'PATCH',
    jar,
    body: { done: true },
  });
  record(
    'completing a recurring task creates the next one',
    toggled.body?.task?.status === 'DONE' && Boolean(toggled.body?.repeated?.id),
    toggled.body?.repeated ? 'next occurrence created' : 'no repeat created',
  );

  const repeatedDue = toggled.body?.repeated?.dueAt;
  const originalDue = recurring.body?.dueAt;
  record(
    'the repeat is scheduled a day later',
    Boolean(repeatedDue) &&
      Math.round((new Date(repeatedDue).getTime() - new Date(originalDue).getTime()) / DAY_MS) === 1,
  );

  const event = await call('/calendar/events', {
    method: 'POST',
    jar,
    body: {
      title: 'Study session',
      kind: 'STUDY',
      startAt: iso(DAY_MS),
      endAt: iso(DAY_MS + 3600000),
    },
  });
  record('calendar event created', event.status === 201 && Boolean(event.body?.event?.id));

  const backwards = await call('/calendar/events', {
    method: 'POST',
    jar,
    body: { title: 'Broken', startAt: iso(DAY_MS + 3600000), endAt: iso(DAY_MS) },
  });
  record('event ending before it starts rejected', backwards.status === 400, `status ${backwards.status}`);

  const clashing = await call('/calendar/events', {
    method: 'POST',
    jar,
    body: {
      title: 'Overlapping',
      startAt: iso(DAY_MS + 1800000),
      endAt: iso(DAY_MS + 5400000),
    },
  });
  record(
    'overlapping event is flagged, not silently accepted',
    clashing.status === 201 && Boolean(clashing.body?.clashesWith?.id),
    clashing.body?.clashesWith ? `clashes with "${clashing.body.clashesWith.title}"` : 'no clash reported',
  );

  const range = await call(`/calendar?from=${iso(0)}&to=${iso(7 * DAY_MS)}`, { jar });
  const withFixed = (range.body?.days ?? []).filter((day) => day.fixed.length > 0);
  record(
    'calendar range expands weekly fixed blocks',
    range.status === 200 && withFixed.length === 7,
    `${withFixed.length} of 7 days carry the block`,
  );

  const anyGaps = (range.body?.days ?? []).some((day) => day.gaps.length > 0);
  record('calendar computes gaps around fixed blocks', anyGaps);

  const dayWithEvent = (range.body?.days ?? []).find((day) => day.events.length > 0);
  record('events land on the right local day', Boolean(dayWithEvent), dayWithEvent?.dateKey ?? 'none');

  const free = await call(`/calendar/free?date=${iso(DAY_MS)}&minutes=60`, { jar });
  record(
    'free slot search respects a minimum duration',
    free.status === 200 && free.body?.gaps?.every((gap) => gap.minutes >= 60),
    `${free.body?.gaps?.length ?? 0} slots`,
  );

  const badRange = await call(`/calendar?from=${iso(0)}&to=${iso(-DAY_MS)}`, { jar });
  record('backwards range rejected', badRange.status === 400, `status ${badRange.status}`);

  const rest = milestones.slice(1);
  for (const milestone of rest) {
    await call(`/goals/milestones/${milestone.id}/toggle`, {
      method: 'PATCH',
      jar,
      body: { done: true },
    });
  }

  const goalsAfter = await call('/goals', { jar });
  const achieved = goalsAfter.body?.find((item) => item.id === goalId);
  record(
    'completing every milestone achieves the goal',
    achieved?.status === 'ACHIEVED' && achieved?.progress === 100,
    `${achieved?.status} at ${achieved?.progress}%`,
  );

  const afterAchievement = await call('/notifications', { jar });
  record(
    'achieving a goal notifies the user',
    afterAchievement.body?.notifications?.some((item) => item.category === 'GOALS'),
  );

  const reopened = await call(`/goals/milestones/${milestones[0]?.id}/toggle`, {
    method: 'PATCH',
    jar,
    body: { done: false },
  });
  const goalsReopened = await call('/goals', { jar });
  const reopenedGoal = goalsReopened.body?.find((item) => item.id === goalId);
  record(
    'unticking a milestone reopens the goal',
    reopenedGoal?.status === 'ACTIVE' && reopened.body?.progress === 67,
    `${reopenedGoal?.status} at ${reopened.body?.progress}%`,
  );

  await call('/notifications/preferences', {
    method: 'PATCH',
    jar,
    body: { goalsInApp: false },
  });

  const before = await call('/notifications', { jar });
  for (const milestone of [milestones[0]]) {
    await call(`/goals/milestones/${milestone.id}/toggle`, {
      method: 'PATCH',
      jar,
      body: { done: true },
    });
  }
  const after = await call('/notifications', { jar });
  record(
    'muted category stops creating notifications',
    after.body?.total === before.body?.total,
    `${before.body?.total} then ${after.body?.total}`,
  );

  const readAll = await call('/notifications/read-all', { method: 'PATCH', jar });
  const counted = await call('/notifications/count', { jar });
  record(
    'marking all read clears the unread count',
    readAll.status === 200 && counted.body?.unread === 0,
    `${counted.body?.unread} unread`,
  );

  const otherJar = new Jar();
  await call('/auth/register', {
    method: 'POST',
    jar: otherJar,
    body: {
      email: `other.${stamp}@nexus.local`,
      password: 'correct-horse-battery',
      displayName: 'Other Person',
      username: `other_${stamp}`.slice(0, 24),
    },
  });

  const theirTasks = await call('/tasks', { jar: otherJar });
  record('another account sees none of these tasks', theirTasks.body?.length === 0);

  const stealTask = await call(`/tasks/${task.body?.id}`, {
    method: 'PATCH',
    jar: otherJar,
    body: { title: 'Hijacked' },
  });
  record('another account cannot edit this task', stealTask.status === 404, `status ${stealTask.status}`);

  const stealGoal = await call(`/goals/${goalId}`, { method: 'DELETE', jar: otherJar });
  record('another account cannot delete this goal', stealGoal.status === 404, `status ${stealGoal.status}`);

  const anon = await call('/tasks');
  record('planner requires auth', anon.status === 401, `status ${anon.status}`);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
