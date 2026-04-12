#!/bin/sh
set -eu

echo "WARNING: ops/docker/start-web-prod.sh is a legacy fallback startup path." >&2
echo "WARNING: Routine production deploys must use ./ops/docker/deploy-prod.sh with prebuilt images." >&2

pnpm install --frozen-lockfile
pnpm --filter @repo/db prisma:generate
pnpm --filter @repo/types build
pnpm --filter @repo/config build
pnpm --filter @repo/db build
pnpm --filter @app/web build

exec pnpm --filter @app/web start
