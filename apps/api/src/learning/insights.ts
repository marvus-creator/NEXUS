export type Insight = { tone: 'up' | 'down' | 'steady' | 'tip'; text: string };

type Day = { date: string; tasks: number; sessions: number; modules: number; minutes: number };

type Week = { tasks: number; minutes: number; modules: number; sessions: number };

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function hours(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${whole}h` : `${whole}h ${rest}m`;
}

function compare(now: number, before: number, label: string, unit: (value: number) => string): Insight | null {
  if (now === 0 && before === 0) return null;
  if (before === 0) return { tone: 'up', text: `${unit(now)} of ${label} this week, up from nothing last week.` };
  const change = Math.round(((now - before) / before) * 100);
  if (Math.abs(change) < 10) return { tone: 'steady', text: `${label[0]!.toUpperCase()}${label.slice(1)} held steady at ${unit(now)} this week.` };
  if (change > 0) return { tone: 'up', text: `${unit(now)} of ${label} this week, ${change}% more than last week.` };
  return { tone: 'down', text: `${unit(now)} of ${label} this week, ${Math.abs(change)}% less than last week.` };
}

export function buildInsights(input: {
  series: Day[];
  week: Week;
  previousWeek: Week;
  streak: number;
  tasksOpen: number;
  goalsActive: number;
}): Insight[] {
  const insights: Insight[] = [];

  const study = compare(input.week.minutes, input.previousWeek.minutes, 'study', hours);
  if (study) insights.push(study);

  const tasks = compare(input.week.tasks, input.previousWeek.tasks, 'finished tasks', (value) => String(value));
  if (tasks) insights.push(tasks);

  const byWeekday = new Array(7).fill(0) as number[];
  for (const day of input.series) {
    const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay();
    byWeekday[weekday] = (byWeekday[weekday] ?? 0) + day.tasks + day.sessions + day.modules;
  }
  const best = byWeekday.indexOf(Math.max(...byWeekday));
  if ((byWeekday[best] ?? 0) >= 3) {
    insights.push({ tone: 'tip', text: `${WEEKDAYS[best]} is your strongest day. Put the hardest work there.` });
  }

  const lastActive = [...input.series].reverse().findIndex((day) => day.tasks + day.sessions + day.modules > 0);

  if (input.streak >= 3) {
    insights.push({ tone: 'up', text: `${input.streak} days in a row. One small session today keeps it going.` });
  } else if (lastActive > 2) {
    insights.push({ tone: 'tip', text: `Nothing logged for ${lastActive} days. A 25 minute session is enough to restart.` });
  } else if (lastActive === -1) {
    insights.push({ tone: 'tip', text: 'Log a study session or finish a task and your patterns start showing here.' });
  }

  if (input.tasksOpen > 8) {
    insights.push({ tone: 'tip', text: `${input.tasksOpen} tasks are open. Closing or dropping a few makes the rest feel lighter.` });
  }

  if (input.goalsActive === 0) {
    insights.push({ tone: 'tip', text: 'No active goal yet. One clear goal gives your week a direction.' });
  }

  return insights.slice(0, 4);
}
