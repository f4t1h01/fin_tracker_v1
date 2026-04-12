#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

echo "== Docker system df =="
docker system df -v

echo "== Docker containers =="
docker ps -a --size

echo "== Docker volumes =="
docker volume ls

echo "== Docker networks =="
docker network ls

echo "== Host storage =="
sudo -n du -sh /var/lib/docker /var/lib/containerd 2>/dev/null || true

echo "== Pruning build cache =="
docker builder prune -af

echo "== Pruning unused images =="
docker image prune -af

echo "== Removing obsolete fin_tracker volumes =="
docker volume rm fin_tracker_root_node_modules fin_tracker_pnpm_store fin_tracker_web_next 2>/dev/null || true

echo "== Docker system df after cleanup =="
docker system df
