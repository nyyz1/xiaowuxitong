#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-ubuntu}"
APP_BASE="${APP_BASE:-/opt/xiaowuxitong}"
APP_ROOT="${APP_ROOT:-$APP_BASE/app}"
BACKUP_DIR="${BACKUP_DIR:-$APP_BASE/backups}"
LOG_DIR="${LOG_DIR:-$APP_BASE/logs}"
REPO_URL="${REPO_URL:-https://github.com/nyyz1/xiaowuxitong.git}"
BRANCH="${BRANCH:-main}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://124.222.136.121}"
NODE_MAJOR="${NODE_MAJOR:-22}"
POSTGRES_VERSION="${POSTGRES_VERSION:-17}"
DB_NAME="${DB_NAME:-school_affairs}"
DB_USER="${DB_USER:-school_admin}"
DB_PASSWORD="${DB_PASSWORD:-}"
BOOTSTRAP_ADMIN_USERNAME="${BOOTSTRAP_ADMIN_USERNAME:-admin}"
BOOTSTRAP_ADMIN_PASSWORD="${BOOTSTRAP_ADMIN_PASSWORD:-}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-}"
SERVICE_NAME="${SERVICE_NAME:-xiaowuxitong}"
APT_TIMEOUT_SECONDS="${APT_TIMEOUT_SECONDS:-300}"

if [[ -z "$DB_PASSWORD" ]]; then
  DB_PASSWORD="$(openssl rand -hex 24)"
fi

if [[ -z "$BOOTSTRAP_ADMIN_PASSWORD" ]]; then
  BOOTSTRAP_ADMIN_PASSWORD="$(openssl rand -hex 18)"
fi

if [[ -z "$NEXTAUTH_SECRET" ]]; then
  NEXTAUTH_SECRET="$(openssl rand -hex 48)"
fi

echo "== Installing system packages =="
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git openssl ufw nginx

echo "== Installing Node.js $NODE_MAJOR =="
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed -E 's/^v([0-9]+).*/\1/')" != "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

install_postgres_from_ubuntu_repo() {
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-client
}

echo "== Installing PostgreSQL =="
if ! command -v psql >/dev/null 2>&1; then
  sudo install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
  echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo "$VERSION_CODENAME")-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get update

  if ! timeout "$APT_TIMEOUT_SECONDS" sudo apt-get install -y "postgresql-$POSTGRES_VERSION" "postgresql-client-$POSTGRES_VERSION"; then
    echo "PostgreSQL $POSTGRES_VERSION install timed out or failed. Falling back to Ubuntu's default PostgreSQL packages." >&2
    sudo rm -f /etc/apt/sources.list.d/pgdg.list
    install_postgres_from_ubuntu_repo
  fi
fi

sudo systemctl enable --now postgresql

echo "== Preparing PostgreSQL role and database =="
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE "$DB_USER" LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE "$DB_USER" WITH LOGIN PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE "$DB_NAME" OWNER "$DB_USER"'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$DB_NAME')\gexec
ALTER DATABASE "$DB_NAME" OWNER TO "$DB_USER";
SQL

echo "== Preparing application directories =="
sudo mkdir -p "$APP_BASE" "$BACKUP_DIR" "$LOG_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$APP_BASE"
chmod 700 "$BACKUP_DIR"

if [[ ! -d "$APP_ROOT/.git" ]]; then
  echo "== Cloning repository =="
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_ROOT"
else
  echo "== Updating existing repository =="
  cd "$APP_ROOT"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

cd "$APP_ROOT"

echo "== Writing production environment =="
cat > .env.local <<ENV
NEXTAUTH_URL=$PUBLIC_BASE_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

BOOTSTRAP_ADMIN_USERNAME=$BOOTSTRAP_ADMIN_USERNAME
BOOTSTRAP_ADMIN_PASSWORD=$BOOTSTRAP_ADMIN_PASSWORD
NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME_HINT=$BOOTSTRAP_ADMIN_USERNAME

DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME?schema=public
DATA_BACKUP_DIR=$BACKUP_DIR
PG_DUMP_PATH=/usr/bin/pg_dump
SMOKE_USERNAME=$BOOTSTRAP_ADMIN_USERNAME
SMOKE_PASSWORD=$BOOTSTRAP_ADMIN_PASSWORD
ENV
chmod 600 .env.local

echo "== Installing project dependencies =="
npm ci

echo "== Preparing database schema and baseline configuration =="
npm run db:generate
npm run db:validate
npx prisma db push
npm run db:seed:approval-defaults
npm run db:seed:department-positions

echo "== Building application =="
npm run build

echo "== Installing systemd service =="
sudo tee "/etc/systemd/system/$SERVICE_NAME.service" >/dev/null <<SERVICE
[Unit]
Description=XiaoWu School Affairs System
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_ROOT
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/app.out.log
StandardError=append:$LOG_DIR/app.err.log

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

echo "== Installing Nginx reverse proxy =="
sudo tee /etc/nginx/sites-available/xiaowuxitong >/dev/null <<NGINX
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  client_max_body_size 25m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sfn /etc/nginx/sites-available/xiaowuxitong /etc/nginx/sites-enabled/xiaowuxitong
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl restart nginx

echo "== Configuring firewall =="
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "== Smoke testing local service =="
npm run smoke:pages -- --base-url=http://127.0.0.1:3000

cat <<SUMMARY

Bootstrap completed.

Public URL:
  $PUBLIC_BASE_URL/login

Bootstrap admin:
  username: $BOOTSTRAP_ADMIN_USERNAME
  password: $BOOTSTRAP_ADMIN_PASSWORD

Database:
  name: $DB_NAME
  user: $DB_USER
  password: $DB_PASSWORD

Important: store these generated passwords outside Git. They are shown once here and are also in $APP_ROOT/.env.local on the server.
SUMMARY
