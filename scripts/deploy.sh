#!/bin/sh
# One-command deployment: pull latest, rebuild changed images, restart, prune.
#
# Usage: ./scripts/deploy.sh

set -eu

cd "$(dirname "$0")/.."

if [ -d .git ]; then
  echo "Pulling latest changes..."
  git pull --ff-only
else
  echo "Not a git repository — skipping git pull."
fi

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.production.example to .env and fill it in first." >&2
  exit 1
fi

echo "Building images..."
docker compose build

echo "Starting services..."
docker compose up -d

echo "Waiting for backend to become healthy..."
for i in $(seq 1 30); do
  status="$(docker compose ps --format json backend 2>/dev/null | grep -o '"Health":"[a-z]*"' | cut -d'"' -f4 || true)"
  if [ "$status" = "healthy" ]; then
    echo "Backend is healthy."
    break
  fi
  sleep 2
done

echo "Removing dangling images..."
docker image prune -f

echo "Deployment complete."
docker compose ps
