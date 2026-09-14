const UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid duration: ${value}. Use forms like 15m, 24h, 30d.`);
  }

  const amount = Number(match[1]);
  const unit = UNITS[match[2]!]!;

  return amount * unit;
}
