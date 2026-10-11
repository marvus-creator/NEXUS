# Putting NEXUS online (free)

Four free services, about 30 minutes. You create the accounts and paste values; everything else is already set up in the repo.

| Piece    | Service | What it hosts                                   |
| -------- | ------- | ----------------------------------------------- |
| Database | Neon    | Postgres (people, posts, photos, everything)    |
| Cache    | Upstash | Redis (sessions, rate limits, live chat)        |
| API      | Render  | `apps/api` (NestJS), from `render.yaml`         |
| Website  | Vercel  | `apps/web` (Next.js), the address people visit  |

People only ever see the Vercel address. Vercel quietly forwards `/api/v1`, `/uploads` and `/socket.io` to Render, so the browser sees one site and sign-in cookies just work.

## 1. Neon (database)

1. Sign up at neon.tech with GitHub, create a project called `nexus` (region: Frankfurt).
2. Copy the connection string. It looks like `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
3. Keep it for step 3 as `DATABASE_URL`.

## 2. Upstash (Redis)

1. Sign up at upstash.com, create a Redis database (region: Frankfurt, free).
2. Copy the `rediss://default:...@...upstash.io:6379` URL.
3. Keep it as `REDIS_URL`.

## 3. Render (API)

1. Sign up at render.com with GitHub.
2. New → Blueprint → pick the `NEXUS` repo. Render reads `render.yaml` and creates `nexus-api`.
3. It asks for the values marked `sync: false`:
   - `DATABASE_URL`: from Neon
   - `REDIS_URL`: from Upstash
   - `WEB_ORIGIN`: your Vercel address from step 4, for example `https://nexus-rw.vercel.app` (put a placeholder now and fix it after step 4)
   - `API_PUBLIC_URL`: the same Vercel address (photos are served through it)
   - `RESEND_API_KEY`: your Resend key (optional)
4. Deploy. The first start runs the migrations and seeds interests automatically. Check `https://nexus-api.onrender.com/api/v1/health` says ok.

The free plan sleeps after 15 minutes without visitors, so the first request after a break takes about 50 seconds. Open the site a minute before you present.

## 4. Vercel (website)

1. Sign up at vercel.com with GitHub, Add New → Project → `NEXUS`.
2. Root directory: `apps/web`. Framework: Next.js (detected).
3. Environment variables:
   - `API_INTERNAL_URL` = `https://nexus-api.onrender.com`
   - `NEXT_PUBLIC_API_URL` = your Vercel address, for example `https://nexus-rw.vercel.app`
   - `NEXT_PUBLIC_SITE_URL` = the same Vercel address
4. Deploy. If the address differs from what you typed in Render, update `WEB_ORIGIN` and `API_PUBLIC_URL` on Render and redeploy it, then update the two `NEXT_PUBLIC_*` values here and redeploy.

## 5. Make yourself admin and load the demo world

From this laptop, in the repo:

```sh
# 1. Sign up on the live site with your real email first, then:
DATABASE_URL="<neon url>" pnpm --filter @nexus/db promote you@example.com ADMIN

# 2. Fill the live site with the demo people, places, events and chats:
API_BASE="https://<your-vercel-address>/api/v1" \
DEMO_HOST_EMAIL="you@example.com" DEMO_HOST_PASSWORD="<your password>" \
node scripts/seed-demo.mjs
```

The one-click demo logins on the sign-in page are **off unless you set `NEXT_PUBLIC_DEMO_LOGINS=on`** on Vercel. They only ever sign in to the ordinary `@demo.nexus.rw` demo people, never an admin. If you turn them on for a presentation, remember that anyone can use those demo accounts, so turn it off again afterwards.

## Good to know

- Photos are stored inside Postgres (`STORAGE_DRIVER=database`), because free servers wipe their disk on every restart.
- Live chat uses long-polling through Vercel. It is real-time, just not over WebSockets.
- Emails only reach your own address until you verify a domain in Resend.
- AI planning stays rule-based until the Anthropic account has credit; nothing breaks without it.
- Redis is optional. Without `REDIS_URL`, rate limits, "sign out everywhere" and chat fan-out live in the API's memory, which is correct for a single API instance. Add Redis before you run more than one.
- The API sends reminders an hour before events and shortly before booked task blocks, checking once a minute (`NEXUS_REMINDER_MS`, set `0` to turn it off). On the free Render plan the server sleeps, so reminders only go out while it is awake.
- Notifications created before the translation update are stored in English. To translate them, run `node scripts/backfill-notification-keys.mjs` with `DATABASE_URL` pointing at the database: it only reports what it would change. Add `--write` to apply it. It fills empty fields only and never deletes anything.
