# AGENTS

## Current setup

- Monorepo with:
  - `apps/web` - Next.js web app
  - `apps/api` - NestJS API
  - `apps/bot` - grammY Telegram bot
  - `packages/db` - Prisma schema/client
  - `packages/config` - env parsing
- Manual deployment is the active mode.
- Server app entrypoint is `http://127.0.0.1:71` behind external reverse proxy.
- Local/source deploy uses `docker-compose.yml`.
- Production Postgres is not containerized in `docker compose`; it runs directly on the server host and is reached separately via `DATABASE_URL` / local `psql`.
- Production domain is `cupfin.shaxin.uz`.
- Telegram bot link: `https://t.me/coup_fin_trackerbot`.
- Direct Postgres access command: `psql -h 127.0.0.1 -p 5432 -U postgres -d fin_tracker`

## GitHub and git workflow

- GitHub repo: `https://github.com/f4t1h01/fin_tracker_v1`
- GitHub slug: `f4t1h01/fin_tracker_v1`
- Git remote: `origin`
- Default branch: `main`
- Current local branch at last check: `main`
- Before giving push/pull instructions, re-check current branch and tracking info so commands match the real branch state.
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

- Use `version#1.md` as the active execution tracker.
- Keep `Done` and `Plan` sections near the top.
- Keep the actionable checklist in the `To-do` section at the bottom.
- After each completed batch, move completed items from plan context into `Done` and mark matching `To-do` items.

## Database guardrails

- Before implementing any new feature, inspect existing Prisma schema and migrations first.
- Prefer extending existing tables/models instead of introducing duplicate feature tables.
- If a new feature risks duplicating existing behavior or overcomplicating schema, stop and re-evaluate before coding.
- Ask the user for clarification only if schema direction materially changes the product behavior.

## Working rhythm

- For each code batch:
  - implement locally
  - run checks
  - tell user when to push
  - tell user when to pull on server
  - include explicit git commands with branch name based on the current repo state
  - prefer `git add .` in user-facing command examples
  - when a Prisma schema change is part of the batch, explicitly tell the user to run the matching production migration step against the host Postgres on the server before or during rebuild
  - include docker restart and verification commands
  - those messages must be added as a code blocks so it is easy for the user to copy and paste it.

## Reliability requirements

- Keep security, stability, and runtime efficiency in scope for every batch.
- Prefer cached or single-snapshot loading patterns over repeated parallel client fetches when the same page can be served with one efficient payload.
- Avoid heavy browser-side work when server-side aggregation or cached conversion can do the job more safely.
- When external data is needed, prefer bounded caching and graceful fallback behavior over chatty live requests.
