#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL:-postgresql://postgres:1536@127.0.0.1:5432/fin_tracker?schema=public}"

echo "Running host Prisma migrations"
if command -v pnpm >/dev/null 2>&1; then
  DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm --filter @repo/db exec prisma migrate deploy
else
  DATABASE_URL="$MIGRATION_DATABASE_URL" corepack pnpm --filter @repo/db exec prisma migrate deploy
fi

docker compose up -d --build --remove-orphans
docker image prune -af
docker builder prune -af
docker volume rm fin_tracker_root_node_modules fin_tracker_pnpm_store fin_tracker_web_next 2>/dev/null || true
docker compose restart nginx
docker compose logs web nginx --since=10m
curl --fail --retry 20 --retry-delay 2 --retry-connrefused http://127.0.0.1:71/api/health
