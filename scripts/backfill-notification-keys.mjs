import { createRequire } from 'node:module';

const { Client } = createRequire(new URL('../packages/db/package.json', import.meta.url))('pg');

const RULES = [
  [/^Welcome to Nexus$/, 'welcome', () => ({})],
  [/^Your Nexus is ready$/, 'ready', () => ({})],
  [/^(.+) started following you$/, 'follow', (m) => ({ name: m[1] })],
  [/^(.+) sent you a friend request$/, 'friendRequest', (m) => ({ name: m[1] })],
  [/^(.+) accepted your friend request$/, 'friendAccepted', (m) => ({ name: m[1] })],
  [/^(.+) sent you a message$/, 'message', (m) => ({ name: m[1] })],
  [/^(.+) reacted to your post$/, 'reacted', (m) => ({ name: m[1] })],
  [/^(.+) commented on your post$/, 'commented', (m) => ({ name: m[1] })],
  [/^(.+) asked to join (.+)$/, 'circleRequest', (m) => ({ name: m[1], circle: m[2] })],
  [/^You are in (.+)$/, 'circleJoined', (m) => ({ circle: m[1] })],
  [/^(.+) invited you to (.+)$/, 'eventInvite', (m) => ({ name: m[1], event: m[2] })],
  [/^(.+) is going to (.+)$/, 'eventGoing', (m) => ({ name: m[1], event: m[2] })],
  [/^(.+) was cancelled$/, 'eventCancelled', (m) => ({ event: m[1] })],
  [/^Goal achieved: (.+)$/, 'goalAchieved', (m) => ({ goal: m[1] })],
  [/^(.+) wants (\d+) × (.+)$/, 'orderRequest', (m) => ({ name: m[1], n: Number(m[2]), item: m[3] })],
  [/^(.+) accepted your order for (.+)$/, 'orderAccepted', (m) => ({ name: m[1], item: m[2] })],
  [/^(.+) declined your order for (.+)$/, 'orderDeclined', (m) => ({ name: m[1], item: m[2] })],
  [/^Order (\S+) was refunded$/, 'orderRefunded', (m) => ({ code: m[1] })],
  [/^(.+) paid ([A-Z]{2,3}\s[\d,.]+) for (.+)$/, 'orderPaid', (m) => ({ name: m[1], amount: m[2], item: m[3] })],
  [/^(.+) sent you ([A-Z]{2,3}\s[\d,.]+)$/, 'moneyReceived', (m) => ({ name: m[1], amount: m[2] })],
  [/^Something you posted was removed$/, 'contentRemoved', () => ({})],
  [/^A warning about your activity$/, 'warning', () => ({})],
  [/^Your account is suspended for (\d+) days?$/, 'suspended', (m) => ({ n: Number(m[1]) })],
  [/^(.+) moved$/, 'eventMoved', (m) => ({ event: m[1] })],
];

const write = process.argv.includes('--write');
const client = new Client({
  connectionString: process.env.DATABASE_URL ?? `postgresql://nexus:nexus@127.0.0.1:${process.env.NEXUS_DB_PORT ?? 5433}/nexus`,
});

await client.connect();

try {
  const { rows } = await client.query('select id, title from notifications where key is null');
  const counts = {};
  let matched = 0;

  for (const row of rows) {
    const rule = RULES.find(([pattern]) => pattern.test(row.title));
    if (!rule) continue;

    const [pattern, key, build] = rule;
    matched += 1;
    counts[key] = (counts[key] ?? 0) + 1;

    if (write) {
      await client.query('update notifications set key = $1, vars = $2 where id = $3 and key is null', [
        key,
        JSON.stringify(build(row.title.match(pattern))),
        row.id,
      ]);
    }
  }

  console.log(JSON.stringify(counts, null, 1));
  console.log(`${matched} of ${rows.length} unkeyed notifications ${write ? 'updated' : 'would be updated (run with --write)'}`);
} finally {
  await client.end();
}
