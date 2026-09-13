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
packages/config Shared TypeScript configs
```

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm db:up      # postgres on 5433, redis on 6380
pnpm dev        # web on 3000, api on 4000
```

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
