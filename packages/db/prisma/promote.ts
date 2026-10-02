import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createPrismaClient } from '../src/index.js';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const connectionString = process.env.DATABASE_URL;
const email = process.argv[2]?.trim().toLowerCase();
const role = (process.argv[3] ?? 'ADMIN').toUpperCase();

if (!connectionString) throw new Error('DATABASE_URL is not set.');
if (!email) throw new Error('Usage: pnpm --filter @nexus/db promote <email> [ADMIN|MODERATOR|USER]');
if (!['ADMIN', 'MODERATOR', 'USER'].includes(role)) throw new Error(`Unknown role ${role}`);

const prisma = createPrismaClient({ connectionString });

const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

if (!user) {
  console.error(`No account uses ${email}. Sign up first, then run this again.`);
  process.exitCode = 1;
} else {
  await prisma.user.update({
    where: { id: user.id },
    data: { role: role as 'ADMIN' | 'MODERATOR' | 'USER', emailVerifiedAt: new Date() },
  });
  console.log(`${email} is now ${role} with a confirmed email.`);
}

await prisma.$disconnect();
