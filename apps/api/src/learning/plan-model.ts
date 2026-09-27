import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

const logger = new Logger('PlanModel');

const MIN_BLOCK = 30;
const MAX_BLOCK = 90;
const BUFFER = 10;

const PlanSchema = z.object({
  blocks: z.array(
    z.object({
      key: z.string(),
      startMinute: z.number(),
      minutes: z.number(),
      rationale: z.string(),
    }),
  ),
});

export type PlanCandidate = {
  key: string;
  title: string;
  minutes: number;
  reason: string;
};

export type PlanGap = { startMinute: number; endMinute: number };

export type PlannedBlock = {
  key: string;
  startMinute: number;
  endMinute: number;
  rationale: string;
};

const SYSTEM = `You plan one day of someone's free time inside NEXUS, a personal life platform.

You receive the free windows in their day (minutes after local midnight) and a ranked list of things they could do: open tasks and learning-path modules, each with a suggested length and why it matters now.

Choose what goes where. Put the most pressing work in the best windows, keep hard work out of tiny gaps, and leave room to breathe instead of filling every minute. Only use keys from the list, each at most once. Every block must sit entirely inside one free window, last between ${MIN_BLOCK} and ${MAX_BLOCK} minutes, and leave at least ${BUFFER} minutes before the next block.

For each block write one short, warm sentence to the person ("you") saying why it belongs there. Mention the concrete reason, such as a due date or how long since they last studied. No emoji.`;

function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function validatePlan(
  raw: z.infer<typeof PlanSchema>['blocks'],
  gaps: PlanGap[],
  candidates: PlanCandidate[],
): PlannedBlock[] {
  const known = new Set(candidates.map((c) => c.key));
  const seen = new Set<string>();
  const accepted: PlannedBlock[] = [];

  const sorted = [...raw].sort((a, b) => a.startMinute - b.startMinute);

  for (const block of sorted) {
    const start = Math.round(block.startMinute / 5) * 5;
    const minutes = Math.round(block.minutes / 5) * 5;
    const end = start + minutes;

    if (!known.has(block.key) || seen.has(block.key)) continue;
    if (minutes < MIN_BLOCK || minutes > MAX_BLOCK) continue;
    if (!gaps.some((gap) => start >= gap.startMinute && end <= gap.endMinute))
      continue;

    const previous = accepted[accepted.length - 1];
    if (previous && start < previous.endMinute + BUFFER) continue;

    const rationale = block.rationale.trim().slice(0, 280);
    if (!rationale) continue;

    seen.add(block.key);
    accepted.push({
      key: block.key,
      startMinute: start,
      endMinute: end,
      rationale,
    });
  }

  return accepted;
}

export async function planWithModel(input: {
  dateKey: string;
  isToday: boolean;
  gaps: PlanGap[];
  candidates: PlanCandidate[];
}): Promise<PlannedBlock[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (input.gaps.length === 0 || input.candidates.length === 0) return null;

  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const payload = {
    date: input.dateKey,
    planningForToday: input.isToday,
    freeWindows: input.gaps.map((gap) => ({
      startMinute: gap.startMinute,
      endMinute: gap.endMinute,
      label: `${clock(gap.startMinute)}–${clock(gap.endMinute)}`,
    })),
    options: input.candidates.slice(0, 25).map((c) => ({
      key: c.key,
      title: c.title,
      suggestedMinutes: c.minutes,
      whyNow: c.reason,
    })),
  };

  try {
    const response = await client.beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(PlanSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      logger.warn(
        `model returned no plan (stop_reason ${response.stop_reason})`,
      );
      return null;
    }

    const blocks = validatePlan(
      response.parsed_output.blocks,
      input.gaps,
      input.candidates,
    );

    if (blocks.length === 0) {
      logger.warn('model plan had no valid blocks, falling back to rules');
      return null;
    }

    return blocks;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      logger.error('ANTHROPIC_API_KEY was rejected, falling back to rules');
    } else if (error instanceof Anthropic.RateLimitError) {
      logger.warn('rate limited by the model API, falling back to rules');
    } else if (error instanceof Anthropic.APIError) {
      logger.error(`model API error ${error.status}: ${error.message}`);
    } else {
      logger.error(`model call failed: ${(error as Error).message}`);
    }
    return null;
  }
}
