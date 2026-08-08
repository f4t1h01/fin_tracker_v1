# CLAUDE.md

This file is the single source of truth for agent rules in this repository.
`AGENTS.md` intentionally contains no rules of its own — it defers to this file.

## Project shape

- Monorepo (pnpm workspaces) with:
  - `apps/web` — Next.js 15 web app (App Router, React 19, Tailwind)
  - `apps/api` — NestJS 10 API on Fastify
  - `apps/bot` — grammY Telegram bot
  - `apps/android` — Kotlin + Jetpack Compose app (main mobile client)
  - `packages/db` — Prisma schema/client
  - `packages/config` — env parsing (zod)
  - `packages/types` — shared TypeScript types
- Manual deployment is the active mode.
- Server app entrypoint is `http://127.0.0.1:71` behind an external reverse proxy.
- Local/source deploy uses `docker-compose.yml`.
- Production Postgres is **not** containerized in `docker compose`; it runs directly on the server host.
- Production/server migrations must be run on the server host, not inside Docker.
- Server `DATABASE_URL` is stored in the server-side repo `.env` file and should be used by Prisma when running migrations on the host.
- Production runtime inside Docker uses host-reachable Postgres coordinates such as `host.docker.internal`.
- Host-run Prisma migrations must override `DATABASE_URL` to the host-local Postgres address such as `127.0.0.1:5432`, because `host.docker.internal` is for containers and will fail from the host shell.
- Production domain is `cupfin.shaxin.uz`.
- Telegram bot link: `https://t.me/coup_fin_trackerbot`.
- Direct Postgres access command: `psql -h 127.0.0.1 -p 5432 -U postgres -d fin_tracker`

## Commands

```bash
pnpm install
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev (local only)
pnpm dev              # api + web + bot in parallel
pnpm typecheck
pnpm test
pnpm build
```

- `pnpm lint` runs ESLint once over the whole monorepo from the root `eslint.config.mjs`. There are no per-workspace `lint` scripts on purpose: running ESLint from a subdirectory with `--config` reanchors the flat-config `ignores` patterns and silently changes what gets linted.
- The lint gate is errors-only. Remaining warnings (`no-explicit-any`, `react-hooks/exhaustive-deps`) are known and tracked, not failures.
- Real automated tests today: `apps/api` (`tsx --test`, 3 files) and `apps/android` (`src/test`, 5 files). Web, bot, db, config, types have stub `test` scripts.
- Android tests run from Android Studio or the Gradle test task in `apps/android`; CI runs `testDebugUnitTest` in a separate job.
- CI runs install → prisma generate → shared package builds → lint → typecheck → test → build, plus the Android job.
- On Windows, `pnpm --filter @app/web build` compiles and prerenders fine but fails at the end of `output: "standalone"` trace copying with `EPERM ... symlink`. That needs Developer Mode or an elevated shell; Linux (CI and Docker) is unaffected. Treat the Docker build as the real gate.

## GitHub and git workflow

- GitHub repo: `https://github.com/f4t1h01/fin_tracker_v1`
- GitHub slug: `f4t1h01/fin_tracker_v1`
- Git remote: `origin`
- Default branch: `main`
- Before giving push/pull instructions, re-check the current branch and tracking info so commands match the real branch state.
- When telling the user how to stage changes, always prefer `git add .` because the repo `.gitignore` is already configured for the user's workflow.
- When telling the user how to push from local, include the branch explicitly, usually `git push origin main` when the current branch is `main`.
- When telling the user how to pull on the Ubuntu server, include the matching branch explicitly, usually `git pull origin main` when deploys track `main`.
- User prefers deploy instructions in this exact compact shape:
  - `Deploy this fix:`
  - `git add .`
  - `git commit -m "..."`
  - `git push origin HEAD`
  - `Server:`
  - `git pull`
  - `docker compose up -d --build`
  - `docker compose restart nginx`
  - `docker compose logs web nginx --since=10m`
  - `curl http://127.0.0.1:71/api/health`

## Planning workflow

- Use `version#1.md` as the active execution tracker. Note: it is listed in `.gitignore`, so it exists only in the user's working copy.
- Keep `Done` and `Plan` sections near the top.
- Keep the actionable checklist in the `To-do` section at the bottom.
- After each completed batch, move completed items from plan context into `Done` and mark matching `To-do` items.

## Database guardrails

- Before implementing any new feature, inspect the existing Prisma schema and migrations first.
- Prefer extending existing tables/models instead of introducing duplicate feature tables.
- If a new feature risks duplicating existing behavior or overcomplicating the schema, stop and re-evaluate before coding.
- Ask the user for clarification only if schema direction materially changes product behavior.

## Important flags

- Whenever a batch includes a Prisma migration, production migration commands must be run on the server host, not inside Docker.
- The server runtime `.env` may keep `DATABASE_URL` pointed at `host.docker.internal` for containers, but host-run Prisma migration commands must override `DATABASE_URL` inline to the exact host DB path:
  `DATABASE_URL=postgresql://postgres:1536@127.0.0.1:5432/fin_tracker?schema=public`
- Use that exact override for `pnpm --filter @repo/db exec prisma migrate deploy` unless the user explicitly changes production Postgres credentials/host/port later.
  - Known audit item: this production credential is committed in this file and in `scripts/server/redeploy-server.sh`. The script already reads `MIGRATION_DATABASE_URL` from the environment, so it can be moved out of git without changing the deploy flow. Until the user rotates it, keep using the value above so deploy instructions stay correct.
- Production deploys should use `bash scripts/server/redeploy-server.sh`, which pulls the active branch, checks host-run Prisma migration status, runs pending migrations against `127.0.0.1:5432`, and then builds/starts Docker services while preserving Docker build cache.
- Do not prune Docker images or builder cache as part of routine deploys; cache preservation keeps package and Python requirement layers fast unless dependency files change.

## Working rhythm

- For each code batch:
  - implement locally
  - run checks
  - commit and push completed code changes directly unless the user explicitly asks not to
  - tell the user when to pull on the server
  - include explicit server pull/deploy commands based on the current branch and deployment setup
  - when user-facing local git commands are still needed, prefer `git add .` because the repo `.gitignore` is already configured for the user's workflow
  - when a Prisma schema change is part of the batch, explicitly tell the user to run the matching production migration step on the server host against the `.env` `DATABASE_URL` before or during rebuild
  - when the runtime `.env` uses `host.docker.internal` for container access, tell the user to override `DATABASE_URL` inline to `127.0.0.1` for host-run Prisma migration commands
  - include docker restart and verification commands
  - those messages must be added as code blocks so they are easy for the user to copy and paste

## Reliability requirements

- Keep security, stability, and runtime efficiency in scope for every batch.
- Prefer cached or single-snapshot loading patterns over repeated parallel client fetches when the same page can be served with one efficient payload.
- Avoid heavy browser-side work when server-side aggregation or cached conversion can do the job more safely.
- When external data is needed, prefer bounded caching and graceful fallback behavior over chatty live requests.

## Known architecture facts to respect

These are current, verified properties of the codebase. Do not "fix" them accidentally, and do not assume behavior that is not here.

- Auth: user sessions are 7-day JWTs (`API_JWT_SECRET`) held in browser `localStorage` and Android `EncryptedSharedPreferences`. Tokens carry a `tokenVersion` claim that `JwtAuthGuard` checks against `User.tokenVersion` on every request, so password changes and resets revoke every previously issued token. That costs one indexed primary-key lookup per authenticated request — do not "optimize" it away.
- Because a password change revokes the caller's own token, `POST /auth/password/change` returns a fresh `accessToken` alongside `{ ok: true }`. Clients must store it or they log themselves out.
- Email ownership is verified: `POST /auth/password/register` and `POST /auth/password/setup` both require a one-time code (`REGISTRATION` / `EMAIL_CLAIM` purposes) issued by `POST /auth/register/request-code` and `POST /auth/email/claim/request`. Never add a path that writes `User.email` without setting `emailVerifiedAt`.
- Google `linkByVerifiedEmail` only matches accounts whose `emailVerifiedAt` is set. Loosening that reopens an account-takeover path where an account claims someone else's address and absorbs their Google identity.
- Admin backoffice lives under `/0admin` (API controller prefix `0admin`, web routes `apps/web/app/0admin/*`) and uses an HttpOnly cookie session (12h TTL), separate from user JWTs. `AdminSessionGuard` re-checks `isActive` and `tokenVersion` in the DB on every request, so deactivating an admin or resetting their password ends live sessions immediately.
- `SecretBoxService` derives its AES-256-GCM key and HMAC keys from `API_JWT_SECRET`. Rotating `API_JWT_SECRET` therefore breaks decryption of stored SMTP/Google secrets as well as invalidating sessions — treat rotation as a migration, not a config tweak.
- Rate limiting is in-process and `Map`-based (`RateLimitService`, wrapped by `AdminRateLimitService`; plus `AuthEmailLookupLimitService`). Buckets are swept and capped, but state does not survive a restart and does not coordinate across replicas. Move to a shared store before scaling out.
- `RateLimitGuard` must run *after* `JwtAuthGuard` for any `keys: ["user"]` limit, so it is applied per route (`@UseGuards(JwtAuthGuard, RateLimitGuard)`), never at controller scope. A controller-scoped limiter runs first and cannot see `request.user`.
- Fastify runs with `trustProxy: true`, which is only safe because `ops/nginx.conf` resolves the real client via `set_real_ip_from` + `real_ip_recursive` and then *overwrites* `X-Forwarded-For` with that single address. If you change either side, change both, or every IP-keyed rate limit collapses into one shared bucket.
- nginx forwards the external proxy's `X-Forwarded-Proto` (via a `map`), not `$scheme`. `$scheme` is always `http` there, which previously meant the admin session cookie never got its `Secure` flag in production.
- `apps/api` shells out to Python (`apps/api/scripts/receipt_preprocess.py`) for receipt preprocessing, with a 30s kill timeout; the `api-runtime` Docker stage installs those pip requirements.
- Currency rates come from `https://cbu.uz/...` (8s timeout) into a process-memory cache refreshed at 10:00 and 19:00 Tashkent time, and are persisted to `CurrencyRateSnapshot`. A cold cache plus an upstream outage falls back to the last stored snapshot so transaction writes keep working.
- AI endpoints (voice draft, image draft, goods advisor) have a per-minute burst limit and a durable per-user daily quota counted from `AiUsageLog` (`AiQuotaService`). Quota values live in that service.
- The admin SQL console is read-only by three independent means: a write-keyword denylist, an identifier denylist covering superuser file/large-object/credential access, and `SET LOCAL transaction_read_only = on`. Prisma still connects as the DB owner, so do not weaken any of the three; the proper fix is a dedicated read-only DB role.
- Offline idempotency keys are scoped per creator: `@@unique([userId, clientMutationId])` on `Transaction` and `@@unique([createdById, clientMutationId])` on `GoodsItem`. They were globally unique, which let one client permanently break another's sync by reusing an id.
- The dashboard loads its whole date range into memory to filter, search and aggregate. That is bounded by `MAX_DASHBOARD_RANGE_DAYS` (430) and `MAX_DASHBOARD_ROWS` (20k) in `profile.service.ts`, not by SQL aggregation.
- Legacy web routes (`/dashboard*`, `/login`, `/admin`) are intentional `redirect()` shims to the canonical `/profile/me/*`, `/auth`, and `/0admin` paths.
- `apps/web/middleware.ts` sets a per-request CSP nonce, passed to `app/layout.tsx` through the `x-duet-csp-nonce` header (`lib/csp.ts`) to authorise the inline theme bootstrap script. Adding a third-party script means adding its origin to the policy in that middleware.
- Docker runtimes run as `USER node`, and compose gates `depends_on` on healthchecks rather than container start.
- Web env is read directly in `apps/web/lib/env.ts` with fallbacks; `parseWebEnv` from `@repo/config` is exported but unused, so a missing `NEXT_PUBLIC_*` build arg fails silently at runtime rather than at build time.
- There is no `.env.example` in the repo; the required keys are documented in `README.md` only.

## Code conventions

- TypeScript everywhere in `apps/api`, `apps/web`, `apps/bot`, `packages/*`; Kotlin in `apps/android`.
- API: NestJS module-per-feature under `apps/api/src/modules/<feature>/`, with `dto/` subfolders using `class-validator`. The global `ValidationPipe` runs with `transform`, `whitelist`, and `forbidNonWhitelisted` — every accepted field must be declared on a DTO.
- Several services expose `private get db(): any` to reach Prisma models added after the checked-in client typings. Prefer typed `this.prisma.client` access in new code instead of widening that pattern.
- Web: server components by default, `"use client"` only where interactivity is needed; feature logic lives in `apps/web/components/<feature>/` with `use-*-workspace.ts` hooks holding page state.
- Use constant-time comparison (`node:crypto` `timingSafeEqual`) for every secret/signature/token comparison, matching the existing auth code.
- Money is stored as Prisma `Decimal` strings (`amount`, `amountInUzs`, `exchangeRate`) — never round-trip amounts through JS floats when persisting.
- `BigInt` fields (`telegramId`, `lastTelegramChatId`) must be stringified before they cross an API boundary.
