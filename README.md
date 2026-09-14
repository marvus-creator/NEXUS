# NEXUS

**Your world. Your people. Your places. Your life.**

A personalized digital-world platform: people, places, communities, events, learning,
goals and planning connected through one interface.

## Stack

| Layer | Choice |
| --- | --- |
| Web | Next.js 16 · React 19 · TypeScript · Tailwind v4 |
| API | NestJS 12 · TypeScript · ESM |
| Data | PostgreSQL 17 · Prisma |
| Cache / jobs | Redis 7 |
| Workspace | pnpm workspaces · Turborepo |

## Layout

```
apps/web        Next.js application
apps/api        NestJS API
packages/ui     Design system (tokens + primitives)
packages/db     Prisma schema, migrations, seed
packages/config Shared TypeScript configs
scripts/        shoot.mjs — headless Chrome visual QA
```

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm db:up      # postgres on 5433, redis on 6380
pnpm --filter @nexus/db migrate   # apply migrations
pnpm --filter @nexus/db seed      # interest catalogue
pnpm dev        # web on 3000, api on 4000
```

Verify the schema end to end:

```bash
pnpm --filter @nexus/db verify   # schema, constraints, cascades
node scripts/verify-auth.mjs     # full auth flow over HTTP (API must be running)
```

## Auth

Access tokens are short-lived JWTs in an httpOnly cookie. Refresh tokens are
opaque, stored only as a SHA-256 hash, and rotate on every use. Presenting an
already-rotated token is treated as a breach: every session for that user is
revoked immediately.

No SMTP provider is wired up yet, so verification and reset links are written to
the API log by the dev mail transport, and returned in the response body outside
production.

Health check: `http://localhost:4000/api/v1/health`

## Build phases

1. Foundation, design system, landing page, auth, app shell, onboarding, profile
2. Home/Pulse, tasks, goals, calendar, notifications
3. People, friends, following, social feed
4. Circles, posts, real-time messaging
5. Discover, events, nearby, maps
6. Learning, progress, AI planning
7. Businesses, marketplace, wallet
8. Admin, moderation, analytics, security hardening
9. Personalization, recommendations, virtual experiences
