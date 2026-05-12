#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/xiaowuxitong/app}"
BACKUP_DIR="${BACKUP_DIR:-/opt/xiaowuxitong/backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"

if [[ -f "$APP_ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_ROOT/.env.local"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required. Set it in $APP_ROOT/.env.local or the environment." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="$BACKUP_DIR/school_affairs-$timestamp.dump"

echo "Creating PostgreSQL backup: $backup_file"
pg_dump --format=custom --no-owner --no-acl --file="$backup_file" "$DATABASE_URL"
chmod 600 "$backup_file"

if [[ "$KEEP_BACKUPS" =~ ^[0-9]+$ ]] && (( KEEP_BACKUPS > 0 )); then
  mapfile -t old_backups < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'school_affairs-*.dump' -printf '%T@ %p\n' | sort -nr | awk '{print $2}' | tail -n +"$((KEEP_BACKUPS + 1))")

  for old_backup in "${old_backups[@]}"; do
    echo "Removing old backup: $old_backup"
    rm -f -- "$old_backup"
  done
fi

echo "$backup_file"
