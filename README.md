# Duet

Node.js monorepo for Duet, a web-based shared finance application for couples with Telegram companion integration.

## Stack

- `apps/web`: Next.js + TypeScript + shadcn-style UI
- `apps/api`: NestJS + Prisma + PostgreSQL
- `apps/bot`: grammY Telegram bot
- `packages/db`: Prisma schema/client
- `packages/config`: shared env validation
- `packages/types`: shared TypeScript types

## Prerequisites

- Node 22+
- pnpm 9+
- Docker + Docker Compose
- PostgreSQL running on your host machine

## Environment setup

1. Open `.env` in the project root.

2. Fill required env keys in `.env`:

API:

- `DATABASE_URL`
- `API_PORT` (default `4000`)
- `API_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `BOT_SHARED_SECRET`
- `CORS_ORIGIN` (for example `https://app.example.com`)

Web:

- `NEXT_PUBLIC_API_URL` (for example `https://api.example.com`)
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME` (bot username without `@`)

Bot:

- `API_BASE_URL` (for example `https://api.example.com`)
- `WEB_APP_URL` (for example `https://app.example.com/profile/me`)

3. Keep `DATABASE_URL` pointed to host PostgreSQL.

For Docker local run (no postgres container), default works:

`postgresql://postgres:postgres@host.docker.internal:5432/couple_finance?schema=public`

## Install and run locally (without Docker)

```bash
pnpm install
pnpm db:generate
pnpm dev
```

## Run in Docker (without postgres container)

```bash
docker compose up --build
```

Services:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

## Database migration

Run migration after setting `DATABASE_URL`:

```bash
pnpm db:migrate
```

## Telegram commands

- `/start` (shows Open app button)

## Authentication flow

- Telegram-first onboarding: open bot, send `/start`, tap `Open app`
- First profile visit can set `email + password` for browser login
- Website login/page entry: `/profile/me` (Telegram widget or email/password)

## MVP deployment preflight

- Run DB migrations before first start: `pnpm db:migrate`
- Ensure BotFather domain is set to your web domain (for Telegram widget login)
- Make sure `CORS_ORIGIN` matches your web domain exactly
- If building web image in CI, provide `NEXT_PUBLIC_*` values at build time

## CI + Manual deployment

- CI workflow runs install, Prisma generate, typecheck, and build on PR/push.
- Deployment is manual on the server (no automatic SSH deploy workflow).
- Routine production deploys use prebuilt runtime images via `./ops/docker/deploy-prod.sh`.
- Do not use `docker-compose.server.yml` for routine production deploys. It is a legacy fallback that bind-mounts the repo and rebuilds workspaces at container startup.
- Do not combine `docker-compose.yml` with `docker-compose.server.yml` for normal server startup.

Manual deploy commands:

```bash
cd ~/telegram_bots/fin_tracker
git pull origin main
# Only run the migration command when the pulled batch includes a Prisma migration.
DATABASE_URL=postgresql://postgres:1536@127.0.0.1:5432/fin_tracker?schema=public corepack pnpm --filter @repo/db exec prisma migrate deploy
./ops/docker/deploy-prod.sh
```

Routine production recovery and verification:

```bash
cd ~/telegram_bots/fin_tracker
git pull origin main
# Run only when the pulled batch includes a Prisma migration.
DATABASE_URL=postgresql://postgres:1536@127.0.0.1:5432/fin_tracker?schema=public corepack pnpm --filter @repo/db exec prisma migrate deploy
./ops/docker/deploy-prod.sh
docker compose logs web nginx --since=10m
curl http://127.0.0.1:71/api/health
```

Reverse proxy target:

- `cupfin.shaxin.uz` -> `http://127.0.0.1:71`

Host cleanup when Docker storage grows again:

```bash
./ops/docker/cleanup-host.sh
```
