#!/bin/sh
set -eu

docker compose up -d --build
docker compose restart nginx
docker compose logs web nginx --since=10m
curl --fail --retry 20 --retry-delay 2 --retry-connrefused http://127.0.0.1:71/api/health
