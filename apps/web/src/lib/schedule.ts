export type ScheduleBlock = {
  id: string;
  label: string;
  kind: 'CLASS' | 'WORK' | 'TRAINING' | 'COMMITMENT' | 'OTHER';
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type FreeWindow = {
  startMinute: number;
  endMinute: number;
  minutes: number;
};

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const MIN_USEFUL_GAP = 30;

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function dayIndexIn(timezone: string, date = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(
    date,
  );

  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

export function minutesNowIn(timezone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(date);

  const [hours, minutes] = parts.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function blocksForDay(blocks: ScheduleBlock[], dayOfWeek: number) {
  return blocks
    .filter((block) => block.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startMinute - b.startMinute);
}

export function freeWindows(dayBlocks: ScheduleBlock[]): FreeWindow[] {
  const windows: FreeWindow[] = [];
  let cursor = DAY_START;

  for (const block of dayBlocks) {
    if (block.startMinute - cursor >= MIN_USEFUL_GAP) {
      windows.push({
        startMinute: cursor,
        endMinute: block.startMinute,
        minutes: block.startMinute - cursor,
      });
    }

    cursor = Math.max(cursor, block.endMinute);
  }

  if (DAY_END - cursor >= MIN_USEFUL_GAP) {
    windows.push({ startMinute: cursor, endMinute: DAY_END, minutes: DAY_END - cursor });
  }

  return windows;
}

export function nextUpcoming(dayBlocks: ScheduleBlock[], nowMinute: number) {
  return dayBlocks.find((block) => block.startMinute > nowMinute) ?? null;
}

export function currentBlock(dayBlocks: ScheduleBlock[], nowMinute: number) {
  return (
    dayBlocks.find((block) => block.startMinute <= nowMinute && block.endMinute > nowMinute) ?? null
  );
}

export const KIND_TINT: Record<ScheduleBlock['kind'], string> = {
  CLASS: 'var(--module-learn)',
  WORK: 'var(--accent)',
  TRAINING: 'var(--module-nearby)',
  COMMITMENT: 'var(--module-events)',
  OTHER: 'var(--ink-subtle)',
};
