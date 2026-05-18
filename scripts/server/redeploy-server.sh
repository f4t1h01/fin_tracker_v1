#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL:-postgresql://postgres:1536@127.0.0.1:5432/fin_tracker?schema=public}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

run_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  else
    corepack pnpm "$@"
  fi
}

ensure_host_dependencies() {
  if [ ! -d node_modules ] || [ pnpm-lock.yaml -nt node_modules/.modules.yaml ]; then
    echo "Installing host Node dependencies from pnpm cache when possible"
    run_pnpm install --frozen-lockfile --prefer-offline
  else
    echo "Host Node dependencies are already current"
  fi
}

check_pending_migrations() {
  status_file="$(mktemp)"

  set +e
  DATABASE_URL="$MIGRATION_DATABASE_URL" run_pnpm --filter @repo/db exec prisma migrate status >"$status_file" 2>&1
  status_code=$?
  set -e

  cat "$status_file"

  if grep -qi "Database schema is up to date" "$status_file"; then
    rm -f "$status_file"
    return 1
  fi

  if grep -Eqi "not yet been applied|pending migration" "$status_file"; then
    rm -f "$status_file"
    return 0
  fi

  if [ "$status_code" -ne 0 ]; then
    rm -f "$status_file"
    echo "Prisma migration status check failed" >&2
    exit "$status_code"
  fi

  rm -f "$status_file"
  echo "Prisma status did not clearly report pending migrations; running migrate deploy as an idempotent safety check"
  return 0
}

echo "Pulling latest ${DEPLOY_BRANCH}"
git pull --ff-only origin "$DEPLOY_BRANCH"

ensure_host_dependencies

echo "Checking Prisma migrations"
if check_pending_migrations; then
  echo "Running pending Prisma migrations on host Postgres"
  DATABASE_URL="$MIGRATION_DATABASE_URL" run_pnpm --filter @repo/db exec prisma migrate deploy
else
  echo "No pending Prisma migrations"
fi

echo "Building Docker images with cache preserved"
docker compose build

echo "Starting production services"
docker compose up -d --remove-orphans

echo "Recent web/nginx logs"
docker compose logs web nginx --since=10m

echo "Checking health endpoint"
curl --fail --retry 20 --retry-delay 2 --retry-connrefused http://127.0.0.1:71/api/health
