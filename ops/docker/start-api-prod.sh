#!/bin/sh
set -eu

pnpm install --frozen-lockfile
pnpm --filter @repo/db prisma:generate
pnpm --filter @repo/types build
pnpm --filter @repo/config build
pnpm --filter @repo/db build
pnpm --filter @app/api build

exec pnpm --filter @app/api start
