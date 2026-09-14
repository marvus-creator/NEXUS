import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createPrismaClient } from '../src/index.js';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const prisma = createPrismaClient({ connectionString });

const EMAIL = 'schema-check@nexus.local';

const checks: { name: string; ok: boolean; detail: string }[] = [];

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

async function main() {
  await prisma.user.deleteMany({ where: { email: EMAIL } });

  const interests = await prisma.interest.findMany({ take: 3, orderBy: { sortOrder: 'asc' } });
  record('interest catalogue seeded', interests.length === 3, `${interests.length} of 3 read back`);

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: 'not-a-real-hash-schema-check-only',
      status: 'ACTIVE',
      profile: {
        create: {
          username: 'schema_check',
          displayName: 'Schema Check',
          userType: 'STUDENT',
          city: 'Kigali',
          goalAreas: ['SCHOOL', 'LEARNING'],
          helpAreas: ['PLANNING', 'LEARNING'],
          skills: ['java', 'typescript'],
          privacy: { create: { profileVisibility: 'FRIENDS' } },
          scheduleBlocks: {
            create: [
              { label: 'Classes', kind: 'CLASS', dayOfWeek: 1, startMinute: 450, endMinute: 1040 },
              { label: 'Gym', kind: 'TRAINING', dayOfWeek: 1, startMinute: 1080, endMinute: 1140 },
            ],
          },
          interests: {
            create: interests.map((interest) => ({ interestId: interest.id })),
          },
        },
      },
    },
    include: {
      profile: {
        include: { privacy: true, scheduleBlocks: true, interests: { include: { interest: true } } },
      },
    },
  });

  const profile = user.profile!;

  record('user + profile created in one transaction', Boolean(profile), `profile id ${profile.id}`);
  record(
    'enum arrays persist',
    profile.goalAreas.length === 2 && profile.helpAreas.length === 2,
    `goalAreas=[${profile.goalAreas.join(', ')}]`,
  );
  record('string arrays persist', profile.skills.length === 2, `skills=[${profile.skills.join(', ')}]`);
  record('privacy defaults applied', profile.privacy?.messagePolicy === 'EVERYONE', `messagePolicy=${profile.privacy?.messagePolicy}`);
  record('schedule blocks linked', profile.scheduleBlocks.length === 2, `${profile.scheduleBlocks.length} blocks`);
  record('many-to-many interests linked', profile.interests.length === 3, `${profile.interests.length} interests`);

  const localeDefaults =
    profile.countryCode === 'RW' && profile.timezone === 'Africa/Kigali' && profile.currency === 'RWF';
  record('i18n defaults applied', localeDefaults, `${profile.countryCode} · ${profile.timezone} · ${profile.currency}`);

  let duplicateRejected = false;
  try {
    await prisma.user.create({
      data: { email: EMAIL, passwordHash: 'x' },
    });
  } catch {
    duplicateRejected = true;
  }
  record('duplicate email rejected', duplicateRejected, 'unique constraint held');

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: `verify-${Date.now()}`,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  await prisma.auditLog.create({
    data: { actorUserId: user.id, action: 'schema.verify', entityType: 'User', entityId: user.id },
  });

  await prisma.user.delete({ where: { id: user.id } });

  const orphanProfiles = await prisma.profile.count({ where: { userId: user.id } });
  const orphanSessions = await prisma.session.count({ where: { userId: user.id } });
  const orphanBlocks = await prisma.scheduleBlock.count({ where: { profileId: profile.id } });
  record(
    'cascade delete removes profile, sessions, schedule',
    orphanProfiles === 0 && orphanSessions === 0 && orphanBlocks === 0,
    `${orphanProfiles} profiles, ${orphanSessions} sessions, ${orphanBlocks} blocks left`,
  );

  const retainedAudit = await prisma.auditLog.findFirst({
    where: { action: 'schema.verify', entityId: user.id },
  });
  record(
    'audit log survives user deletion',
    Boolean(retainedAudit) && retainedAudit?.actorUserId === null,
    retainedAudit ? `actorUserId nulled, action kept` : 'audit row missing',
  );

  await prisma.auditLog.deleteMany({ where: { action: 'schema.verify' } });

  const failed = checks.filter((check) => !check.ok);

  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}  (${check.detail})`);
  }

  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
