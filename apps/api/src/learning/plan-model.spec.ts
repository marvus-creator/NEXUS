import { describe, expect, it } from 'vitest';
import { validatePlan } from './plan-model.js';

const gaps = [
  { startMinute: 480, endMinute: 600 },
  { startMinute: 840, endMinute: 960 },
];
const candidates = [
  { key: 'task:a', title: 'Essay', minutes: 60, reason: 'due tomorrow' },
  { key: 'task:b', title: 'Reading', minutes: 45, reason: 'due in 3 days' },
  { key: 'path:c', title: 'Java', minutes: 45, reason: 'Last studied 4 days ago' },
];

describe('validatePlan', () => {
  it('keeps blocks that fit inside a free window', () => {
    const plan = validatePlan(
      [
        { key: 'task:a', startMinute: 480, minutes: 60, rationale: 'Due tomorrow, so first.' },
        { key: 'path:c', startMinute: 840, minutes: 45, rationale: 'Four days since Java.' },
      ],
      gaps,
      candidates,
    );
    expect(plan.map((b) => [b.key, b.startMinute, b.endMinute])).toEqual([
      ['task:a', 480, 540],
      ['path:c', 840, 885],
    ]);
  });

  it('drops invented keys, duplicates and blocks outside the windows', () => {
    const plan = validatePlan(
      [
        { key: 'task:zzz', startMinute: 480, minutes: 60, rationale: 'made up' },
        { key: 'task:a', startMinute: 570, minutes: 60, rationale: 'spills past 10:00' },
        { key: 'task:b', startMinute: 480, minutes: 45, rationale: 'fits' },
        { key: 'task:b', startMinute: 840, minutes: 45, rationale: 'duplicate' },
      ],
      gaps,
      candidates,
    );
    expect(plan.map((b) => b.key)).toEqual(['task:b']);
  });

  it('enforces length limits and the buffer between blocks', () => {
    const plan = validatePlan(
      [
        { key: 'task:a', startMinute: 480, minutes: 15, rationale: 'too short' },
        { key: 'task:b', startMinute: 480, minutes: 45, rationale: 'ok' },
        { key: 'path:c', startMinute: 530, minutes: 45, rationale: 'only 5 min after' },
      ],
      gaps,
      candidates,
    );
    expect(plan.map((b) => b.key)).toEqual(['task:b']);
  });
});
