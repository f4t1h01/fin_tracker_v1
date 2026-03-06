# Couple Finance Tracker

Node.js monorepo for a Telegram-first finance tracker for couples.

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

Manual deploy commands:

```bash
cd ~/telegram_bots/fin_tracker
git pull origin main
docker compose up -d --build --remove-orphans
docker compose run --rm --no-deps api corepack pnpm --filter @repo/db exec prisma migrate deploy
docker compose ps
```

Reverse proxy target:

- `cupfin.shaxin.uz` -> `http://127.0.0.1:71`
