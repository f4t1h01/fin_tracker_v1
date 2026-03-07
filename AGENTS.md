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
- Production domain is `cupfin.shaxin.uz`.

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
  - include docker restart and verification commands

## Reliability requirements

- Keep security, stability, and runtime efficiency in scope for every batch.
- Prefer cached or single-snapshot loading patterns over repeated parallel client fetches when the same page can be served with one efficient payload.
- Avoid heavy browser-side work when server-side aggregation or cached conversion can do the job more safely.
- When external data is needed, prefer bounded caching and graceful fallback behavior over chatty live requests.
