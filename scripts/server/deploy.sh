#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/xiaowuxitong/app}"
SERVICE_NAME="${SERVICE_NAME:-xiaowuxitong}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
BRANCH="${BRANCH:-main}"
BACKUP_DIR="${BACKUP_DIR:-/opt/xiaowuxitong/backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"
ALLOW_ACCEPT_DATA_LOSS="${ALLOW_ACCEPT_DATA_LOSS:-0}"

if [[ ! -d "$APP_ROOT/.git" ]]; then
  echo "Project git repository not found at $APP_ROOT" >&2
  exit 1
fi

cd "$APP_ROOT"

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

echo "== Pre-update database backup =="
APP_ROOT="$APP_ROOT" BACKUP_DIR="$BACKUP_DIR" KEEP_BACKUPS="$KEEP_BACKUPS" bash "$APP_ROOT/scripts/server/backup-postgres.sh"

echo "== Updating source =="
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "== Installing dependencies =="
npm ci

echo "== Generating Prisma client =="
npm run db:generate

echo "== Validating Prisma schema =="
npm run db:validate

echo "== Syncing PostgreSQL schema =="
if [[ "$ALLOW_ACCEPT_DATA_LOSS" == "1" ]]; then
  npx prisma db push --accept-data-loss
else
  npx prisma db push
fi

echo "== Ensuring baseline configuration data =="
npm run db:seed:approval-defaults
npm run db:seed:department-positions

echo "== Building application =="
npm run build

echo "== Restarting service =="
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl --no-pager --full status "$SERVICE_NAME"

echo "== Smoke testing authenticated pages =="
npm run smoke:pages -- --base-url="$BASE_URL"

echo "Deployment completed successfully."
