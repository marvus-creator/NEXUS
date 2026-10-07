import type { Translate } from './types';

function reasonPart(reason: string, t: Translate) {
  let match = reason.match(/^(\d+) days? overdue$/);
  if (match) return t('plan.why.overdue', { n: match[1]! });
  if (reason === 'due today') return t('plan.why.today');
  if (reason === 'due tomorrow') return t('plan.why.tomorrow');
  match = reason.match(/^due in (\d+) days$/);
  if (match) return t('plan.why.inDays', { n: match[1]! });
  if (reason === 'No due date, still open') return t('plan.why.noDue');
  if (reason === 'Not started yet') return t('plan.why.notStarted');
  if (reason === 'Studied today already') return t('plan.why.studiedToday');
  match = reason.match(/^Last studied (\d+) days? ago$/);
  if (match) return t('plan.why.lastStudied', { n: match[1]! });
  return null;
}

export function translateRationale(rationale: string, t: Translate) {
  const match = rationale.match(/^(.+)\. You are free (.+), so this fits without moving anything\.$/);
  if (!match) return rationale;
  const reason = reasonPart(match[1]!, t);
  if (!reason) return rationale;
  return t('plan.why.sentence', { reason, window: match[2]! });
}

const ENGINE_NOTES: Record<string, 'plan.engine.assisted' | 'plan.engine.fallback' | 'plan.engine.rules'> = {
  'Claude chose the order and timing from your calendar, tasks and learning paths. Nothing is added until you accept it.':
    'plan.engine.assisted',
  'Planned by rule this time because the AI planner was unavailable. Try again in a moment.': 'plan.engine.fallback',
  'Planned from your calendar, tasks and learning paths by rule. No language model is configured.': 'plan.engine.rules',
};

export function translateEngineNote(note: string, t: Translate) {
  const key = ENGINE_NOTES[note];
  return key ? t(key) : note;
}
