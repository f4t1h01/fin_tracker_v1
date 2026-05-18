# Duet Finance Tracker

Duet is a mobile-first shared finance and household goods tracker for couples. The project includes a native Android app, a NestJS API, a PostgreSQL database, a Next.js web app, and a Telegram companion bot. The Android app is the main mobile application for the Mobile App Development final project.

## Project Purpose

Many couples and small households track spending in separate notes, spreadsheets, or banking apps. Duet provides one shared workspace where users can record transactions, review balances, check exchange rates, manage household goods, and use AI-assisted voice or receipt entry to reduce manual typing.

Target users:

- Couples who want shared visibility over income and expenses.
- Households that want a simple inventory and stock tracker.
- Users who need quick mobile entry, offline create support, and currency-aware summaries.

## Core Features

- Email/password authentication and profile management.
- Personal and shared couple finance workspace.
- Transaction create, edit, delete, filtering, and recent activity.
- Dashboard summaries, trends, category breakdowns, and range filters.
- Currency rates and quick conversion support.
- AI voice-note transaction drafting.
- AI receipt/image transaction drafting with quality and QR-status review.
- Household goods overview, stock, setup, item history, and advisor chat.
- Offline transaction and goods-item create queue with WorkManager sync.
- Local cache using Room and DataStore.
- Light/dark theme support.
- Telegram bot entry point for opening the companion web app.

## Mobile App Architecture

The Android app uses an MVVM-style structure:

```mermaid
flowchart TD
    UI["Jetpack Compose Screens"] --> VM["DuetViewModel"]
    VM --> Repo["DuetRepository"]
    Repo --> API["Retrofit + OkHttp API client"]
    Repo --> Local["Room + DataStore local storage"]
    API --> Server["NestJS API"]
    Server --> DB["PostgreSQL through Prisma"]
    Server --> AI["OpenAI voice and image extraction"]
```

Main Android components:

- `MainActivity`: Android entry point.
- `DuetApp`: Compose app shell and bottom navigation.
- `DuetViewModel`: UI state, loading, mutations, AI draft flows, and voice recording coordination.
- `DuetRepository`: API calls, cache writes, and offline queue handling.
- `DuetApi`: Retrofit API contract.
- `DuetLocalDatabase`: Room database for cached JSON and outbox mutations.
- `OutboxSyncWorker`: WorkManager background sync for queued offline creates.

## Android Navigation Flow

```mermaid
flowchart LR
    Splash["Splash"] --> Auth["Login/Register"]
    Auth --> Profile["Profile"]
    Profile --> Dashboard["Dashboard"]
    Dashboard --> Add["Add Transaction"]
    Add --> Voice["Voice AI Draft"]
    Add --> Image["Receipt Image AI Draft"]
    Profile --> Rates["Rates"]
    Profile --> Goods["Goods Overview"]
    Goods --> Stock["Goods Stock"]
    Goods --> Setup["Goods Setup"]
    Goods --> Advisor["Goods Advisor"]
    Profile --> Settings["Settings"]
```

## Stack

- `apps/android`: Kotlin + Jetpack Compose Android app
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
- Android Studio with Android SDK for running the native Android app

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

This starts the web, API, and bot workspaces in development mode.

## Run the Android app

1. Open `apps/android` in Android Studio.
2. Let Android Studio sync Gradle and install any required SDK components.
3. Make sure the API base URL in the Android configuration points to the running backend.
4. Run the `app` configuration on an emulator or physical Android device.

Recommended demo flow:

1. Register or log in.
2. Open Profile and confirm user/workspace data loads.
3. Add a transaction manually.
4. Add a transaction using voice draft.
5. Add a transaction using receipt/image draft.
6. Open Dashboard and review balances/recent activity.
7. Open Rates and test currency conversion.
8. Open Goods, add a goods item, then review Stock and Advisor.
9. Test offline create by disabling network, creating a supported item, then reconnecting.

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

Telegram bot link:

- `https://t.me/coup_fin_trackerbot`

## Authentication flow

- Telegram-first onboarding: open bot, send `/start`, tap `Open app`
- First profile visit can set `email + password` for browser login
- Website login/page entry: `/profile/me` (Telegram widget or email/password)

## AI models and flow

The API currently uses these OpenAI models for draft extraction features:

- `gpt-4o-transcribe`: voice-note transcription
- `gpt-4o-mini`: voice transcript to transaction draft extraction
- `gpt-4.1-mini`: receipt/image to transaction draft extraction

### Voice draft flow

1. User uploads a voice note.
2. The API sends the audio file to `gpt-4o-transcribe` via `/v1/audio/transcriptions`.
3. The transcription request includes a finance-oriented prompt so the model expects amounts, currencies, and categories.
4. The API sends the transcript, visible category context, and a strict JSON schema to `gpt-4o-mini` via `/v1/responses`.
5. The API matches the returned category name against internal category ids.
6. The API returns a draft with normalized fields, `missingFields`, and warnings.
7. The API logs transcription and extraction as separate AI usage records with model, endpoint, token usage, and cost snapshot.

### Image draft flow

1. User uploads a receipt or finance image.
2. The API preprocesses the image locally before calling OpenAI.
3. The API sends prompt text plus one or two images to `gpt-4.1-mini` via `/v1/responses`.
4. The request requires strict JSON output against the receipt/image draft schema.
5. The API merges model-reported quality issues with local preprocessing quality checks.
6. The API matches the returned category name to an internal category id and builds the final note/product summary.
7. The API logs the image extraction request as AI usage under the receipt-draft feature.

### Prompt behavior

The app uses behavioral prompts like these:

- `gpt-4o-transcribe`
  - Treat the audio as a finance transaction voice note.
  - Listen for amounts, currencies, and categories.
  - Return transcription JSON from the transcription endpoint.

- `gpt-4o-mini`
  - Extract exactly one finance transaction draft from a transcript.
  - Return only JSON that matches the provided schema.
  - Do not invent missing data.
  - Put unclear or missing fields into `missingFields` and leave the values `null`.
  - Warn when the recording appears to contain multiple transactions.
  - Only use category names from the visible category context when confident.

- `gpt-4.1-mini`
  - Extract exactly one finance transaction draft from a receipt or finance image.
  - Return only JSON that matches the provided schema.
  - Treat receipts as expense by default unless income or deposit is clearly shown.
  - Prefer final payable totals such as `TOTAL`, `GRAND TOTAL`, or `AMOUNT DUE`.
  - Mark incomplete totals, non-finance documents, and multiple unrelated records with warnings and quality issues.
  - Only use category names from the visible category context when confident.

### AI pricing

- AI usage logs capture model id, endpoint, token breakdown, and a cost snapshot.
- Pricing is managed through `AiModelPricing` records and the admin pricing flow, not as the primary runtime `.env` source of truth.
- Image understanding is already tracked in AI usage logs under the receipt-draft extraction flow.
- Voice drafting logs transcription and extraction as separate AI operations.
- Cached-input pricing exists officially for some text models, but the current app does not store a separate cached-input price field, so it is intentionally out of scope for operators right now.

Official OpenAI pricing for the models currently used by this app:

- `gpt-4o-transcribe`
  - audio input: `$2.50 / 1M tokens`
  - text output: `$10.00 / 1M tokens`
- `gpt-4o-mini`
  - text input: `$0.15 / 1M tokens`
  - text output: `$0.60 / 1M tokens`
- `gpt-4.1-mini`
  - text input: `$0.40 / 1M tokens`
  - text output: `$1.60 / 1M tokens`

Official pricing reference:

- [OpenAI API Pricing](https://openai.com/api/pricing/)

## Database Usage

The project uses PostgreSQL through Prisma. Important data areas include:

- Users, profiles, and preferences.
- Couple workspaces, memberships, and invites.
- Transactions, categories, currencies, and dashboard data.
- Goods places, categories, units of measurement, items, and event history.
- AI usage logs, model pricing snapshots, AI threads, and AI messages.

The Prisma schema and migrations are stored in `packages/db/prisma`.

## Testing

Root scripts:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Android tests are under `apps/android/app/src/test`. They cover focused data and utility behavior such as currency normalization, query building, DTO parsing, and voice audio helpers.

Run Android unit tests from Android Studio or from `apps/android` with the Gradle test task.

## Assignment 2 Submission Notes

The folder `assignemnt 2 submission form` contains the technical report draft for the Mobile App Development final project:

- `report.md`: 5-8 page technical report content with architecture and navigation diagrams.

Presentation slides are intentionally not included here because they will be prepared separately.

## MVP deployment preflight

- Run DB migrations before first start: `pnpm db:migrate`
- Ensure BotFather domain is set to your web domain (for Telegram widget login)
- Make sure `CORS_ORIGIN` matches your web domain exactly
- If building web image in CI, provide `NEXT_PUBLIC_*` values at build time

## CI + Manual deployment

- CI workflow runs install, Prisma generate, typecheck, and build on PR/push.
- Deployment is manual on the server (no automatic SSH deploy workflow).
- Routine production deploys use cached runtime image builds via `bash scripts/server/redeploy-server.sh`.
- The deploy script pulls the active branch, checks Prisma migration status on the server host, runs pending migrations when needed, then builds and starts containers without pruning Docker cache.

Manual deploy commands:

```bash
cd ~/telegram_bots/fin_tracker
bash scripts/server/redeploy-server.sh
```

Routine production recovery and verification:

```bash
cd ~/telegram_bots/fin_tracker
bash scripts/server/redeploy-server.sh
docker compose logs web nginx --since=10m
curl http://127.0.0.1:71/api/health
```

`redeploy-server.sh` runs pending Prisma migrations on the server host before rebuilding containers. By default it overrides Prisma's migration connection to `127.0.0.1:5432` so host-run migrations do not use the container-only `host.docker.internal` address from the runtime `.env`.

Reverse proxy target:

- `cupfin.shaxin.uz` -> `http://127.0.0.1:71`

Docker cleanup is intentionally not part of the deploy path, so Docker layer cache can keep downloaded package and Python requirement work between builds.
