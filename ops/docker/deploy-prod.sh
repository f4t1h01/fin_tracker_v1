#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

docker compose up -d --build --remove-orphans
docker image prune -f
docker volume rm fin_tracker_root_node_modules fin_tracker_pnpm_store fin_tracker_web_next 2>/dev/null || true
docker compose restart nginx
docker compose logs web nginx --since=10m
curl --fail --retry 20 --retry-delay 2 --retry-connrefused http://127.0.0.1:71/api/health
