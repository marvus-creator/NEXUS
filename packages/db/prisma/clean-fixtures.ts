import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createPrismaClient } from '../src/index.js';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('clean-fixtures refuses to run against production.');
}

const prisma = createPrismaClient({ connectionString });

const STAMP = '[0-9]{10,}';
const now = new Date();

const keep = new Set(
  (process.env.DEMO_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);

async function main() {
  const apply = !process.argv.includes('--dry-run');

  const users = await prisma.user.findMany({
    where: { email: { endsWith: '@nexus.local' }, deletedAt: null },
    select: { id: true, email: true, profile: { select: { id: true, username: true } } },
  });

  const stamped = new RegExp(`\\.${STAMP}@nexus\\.local$`);
  const fixtures = users.filter(
    (user) => stamped.test(user.email) && !keep.has(user.email.toLowerCase()),
  );
  const profileIds = fixtures.flatMap((user) => (user.profile ? [user.profile.id] : []));

  const [fixturePosts, fixtureComments] = await Promise.all([
    prisma.post.findMany({ where: { profileId: { in: profileIds } }, select: { id: true } }),
    prisma.comment.findMany({ where: { profileId: { in: profileIds } }, select: { id: true } }),
  ]);

  const fixturePostIds = fixturePosts.map((post) => post.id);
  const fixtureCommentIds = fixtureComments.map((comment) => comment.id);

  const keptProfiles = await prisma.profile.findMany({
    where: { user: { email: { in: [...keep] } } },
    select: { id: true },
  });
  const keptIds = keptProfiles.map((profile) => profile.id);

  const [places, events, circles, businesses, listings] = await Promise.all([
    prisma.$queryRaw<{ id: string; name: string }[]>`
      select id, name from places
       where deleted_at is null and name ~ ${STAMP}
         and (created_by_id is null or created_by_id <> all(${keptIds}::text[]))`,
    prisma.$queryRaw<{ id: string; title: string }[]>`
      select id, title from events
       where deleted_at is null and title ~ ${STAMP}
         and host_id <> all(${keptIds}::text[])`,
    prisma.$queryRaw<{ id: string; name: string }[]>`
      select id, name from circles
       where deleted_at is null and name ~ ${STAMP}
         and id not in (
           select circle_id from circle_members
            where role = 'OWNER' and profile_id = any(${keptIds}::text[]))`,
    prisma.$queryRaw<{ id: string; name: string }[]>`
      select id, name from businesses
       where deleted_at is null and name ~ ${STAMP}
         and id not in (
           select business_id from business_members
            where role = 'OWNER' and profile_id = any(${keptIds}::text[]))`,
    prisma.$queryRaw<{ id: string; title: string }[]>`
      select id, title from listings
       where deleted_at is null and title ~ ${STAMP}
         and seller_id <> all(${keptIds}::text[])`,
  ]);

  const summary = {
    users: fixtures.length,
    places: places.length,
    events: events.length,
    circles: circles.length,
    businesses: businesses.length,
    listings: listings.length,
  };

  if (!apply) {
    console.log('dry run, nothing written');
    console.table(summary);
    return;
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: { in: fixtures.map((user) => user.id) } },
      data: { deletedAt: now },
    }),
    prisma.place.updateMany({
      where: { id: { in: places.map((place) => place.id) } },
      data: { deletedAt: now },
    }),
    prisma.event.updateMany({
      where: { id: { in: events.map((event) => event.id) } },
      data: { deletedAt: now },
    }),
    prisma.circle.updateMany({
      where: { id: { in: circles.map((circle) => circle.id) } },
      data: { deletedAt: now },
    }),
    prisma.place.updateMany({
      where: { createdById: { in: profileIds }, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.event.updateMany({
      where: { hostId: { in: profileIds }, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.circle.updateMany({
      where: {
        deletedAt: null,
        members: { some: { role: 'OWNER', profileId: { in: profileIds } } },
      },
      data: { deletedAt: now },
    }),
    prisma.post.updateMany({
      where: { profileId: { in: profileIds }, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.business.updateMany({
      where: { id: { in: businesses.map((business) => business.id) } },
      data: { deletedAt: now, status: 'CLOSED' },
    }),
    prisma.listing.updateMany({
      where: { id: { in: listings.map((listing) => listing.id) } },
      data: { deletedAt: now, status: 'ARCHIVED' },
    }),
    prisma.listing.updateMany({
      where: { sellerId: { in: profileIds }, deletedAt: null },
      data: { deletedAt: now, status: 'ARCHIVED' },
    }),
    prisma.business.updateMany({
      where: {
        deletedAt: null,
        members: { some: { role: 'OWNER', profileId: { in: profileIds } } },
      },
      data: { deletedAt: now, status: 'CLOSED' },
    }),
    prisma.report.deleteMany({
      where: {
        OR: [
          { reporterId: { in: profileIds } },
          { targetType: 'PROFILE', targetId: { in: profileIds } },
          { targetType: 'POST', targetId: { in: fixturePostIds } },
          { targetType: 'COMMENT', targetId: { in: fixtureCommentIds } },
        ],
      },
    }),
  ]);

  console.table(summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
