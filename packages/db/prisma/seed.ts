import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createPrismaClient } from '../src/index.js';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
}

const prisma = createPrismaClient({ connectionString });

type InterestSeed = {
  slug: string;
  label: string;
  category: string;
  tint?: string;
};

const interests: InterestSeed[] = [
  { slug: 'technology', label: 'Technology', category: 'Tech', tint: 'var(--module-home)' },
  { slug: 'software-engineering', label: 'Software engineering', category: 'Tech' },
  { slug: 'design', label: 'Design', category: 'Tech' },
  { slug: 'data-ai', label: 'Data & AI', category: 'Tech', tint: 'var(--module-ai)' },
  { slug: 'startups', label: 'Startups', category: 'Business' },
  { slug: 'business', label: 'Business', category: 'Business' },
  { slug: 'finance', label: 'Finance', category: 'Business' },
  { slug: 'marketing', label: 'Marketing', category: 'Business' },
  { slug: 'football', label: 'Football', category: 'Sport' },
  { slug: 'basketball', label: 'Basketball', category: 'Sport' },
  { slug: 'running', label: 'Running', category: 'Sport' },
  { slug: 'fitness', label: 'Fitness', category: 'Sport' },
  { slug: 'cycling', label: 'Cycling', category: 'Sport' },
  { slug: 'music', label: 'Music', category: 'Culture' },
  { slug: 'movies', label: 'Movies', category: 'Culture' },
  { slug: 'art', label: 'Art', category: 'Culture' },
  { slug: 'photography', label: 'Photography', category: 'Culture' },
  { slug: 'fashion', label: 'Fashion', category: 'Culture' },
  { slug: 'gaming', label: 'Gaming', category: 'Culture' },
  { slug: 'reading', label: 'Reading', category: 'Culture' },
  { slug: 'food', label: 'Food', category: 'Lifestyle' },
  { slug: 'travel', label: 'Travel', category: 'Lifestyle', tint: 'var(--module-discover)' },
  { slug: 'nightlife', label: 'Nightlife', category: 'Lifestyle' },
  { slug: 'nature', label: 'Nature & hiking', category: 'Lifestyle', tint: 'var(--module-nearby)' },
  { slug: 'volunteering', label: 'Volunteering', category: 'Community' },
  { slug: 'education', label: 'Education', category: 'Community', tint: 'var(--module-learn)' },
  { slug: 'languages', label: 'Languages', category: 'Community' },
  { slug: 'entrepreneurship', label: 'Entrepreneurship', category: 'Business' },
  { slug: 'agriculture', label: 'Agriculture', category: 'Community' },
  { slug: 'health', label: 'Health & wellbeing', category: 'Lifestyle' },
];

async function main() {
  const before = await prisma.interest.count();

  for (const [index, interest] of interests.entries()) {
    await prisma.interest.upsert({
      where: { slug: interest.slug },
      create: { ...interest, sortOrder: index },
      update: { label: interest.label, category: interest.category, sortOrder: index },
    });
  }

  const after = await prisma.interest.count();

  console.log(`interests: ${after - before} created, ${before} updated, ${after} total`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
