#!/usr/bin/env bash
# Deploy PetDate to a Ubuntu VPS (API + bot + web + nginx).
# Usage:
#   ./scripts/deploy-vps.sh user@SERVER_IP
# Optional env:
#   REMOTE_DIR=/opt/petdate
#   BRANCH=<git branch name to document in the log — does NOT auto-checkout>
#
# IMPORTANT: this syncs the CURRENT workspace tree. Deploying an incomplete
# feature branch overwrites live web/api/bot and looks like a “revert”.
# See docs/DEPLOY.md — only deploy from an integration branch that has all
# needed fixes (logos, auth, chats, …).

set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 user@SERVER_IP"
  exit 1
fi

REMOTE_DIR="${REMOTE_DIR:-/opt/petdate}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CURRENT_BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
BRANCH="${BRANCH:-$CURRENT_BRANCH}"

echo "==> Deploying workspace branch: ${CURRENT_BRANCH} (label=${BRANCH})"
echo "==> Read docs/DEPLOY.md — incomplete branches overwrite live logos/features."
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  echo "WARNING: deploying from ${CURRENT_BRANCH} — confirm this tree has the latest fixes."
fi

echo "==> Syncing project to ${TARGET}:${REMOTE_DIR}"
ssh "$TARGET" "sudo mkdir -p '$REMOTE_DIR' && sudo chown -R \$(whoami):\$(whoami) '$REMOTE_DIR'"
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .env \
  --exclude '.env.*' \
  --exclude 'packages/*/dist' \
  --exclude 'packages/api/data/*.db*' \
  --exclude 'packages/api/data/chat-uploads' \
  --exclude 'packages/api/data/pet-photos' \
  --exclude 'packages/api/data/user-avatars' \
  "$ROOT/" "$TARGET:$REMOTE_DIR/"

ssh "$TARGET" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y nginx
fi
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm i -g pm2
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from example — edit secrets before production use."
fi

# Infra (Postgres / Redis / MinIO) — required when DATABASE_URL / REDIS_URL point at localhost
if command -v docker >/dev/null 2>&1; then
  sudo systemctl enable --now docker >/dev/null 2>&1 || true
  docker compose up -d postgres redis minio
  sudo tee /etc/systemd/system/petdate-infra.service >/dev/null <<'UNIT'
[Unit]
Description=PetDate infra (postgres redis minio)
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/petdate
ExecStart=/usr/bin/docker compose up -d postgres redis minio
ExecStop=/usr/bin/docker compose stop postgres redis minio
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT
  # Keep WorkingDirectory aligned with REMOTE_DIR
  sudo sed -i "s|WorkingDirectory=/opt/petdate|WorkingDirectory=$REMOTE_DIR|g" /etc/systemd/system/petdate-infra.service
  sudo systemctl daemon-reload
  sudo systemctl enable --now petdate-infra.service
else
  echo "WARNING: docker not installed — Postgres/Redis probes in admin will fail if DATABASE_URL/REDIS_URL are set."
fi

# Elasticsearch — admin monitoring + future search.
# Tries compose profile "search"; falls back to native tarball when registries are blocked.
if [[ -x ./scripts/ensure-elasticsearch.sh ]]; then
  sudo ./scripts/ensure-elasticsearch.sh || echo "WARNING: Elasticsearch setup failed — admin will show «پیکربندی نشده» or down."
else
  echo "WARNING: scripts/ensure-elasticsearch.sh missing"
fi

npm install
# PWA/brand assets may have been chattr +i locked; unlock so Vite can empty dist/
if command -v chattr >/dev/null 2>&1 && [[ -d packages/web/dist ]]; then
  find packages/web/dist -type f -exec lsattr {} + 2>/dev/null | awk '/i/ {print \$NF}' | while read -r f; do
    sudo chattr -i "\$f" 2>/dev/null || true
  done
fi
npm run build:all

mkdir -p packages/api/data

# SQLite daily backup (idempotent cron)
if [[ -x ./scripts/backup-sqlite.sh ]]; then
  sudo mkdir -p /var/backups/petdate
  sudo chmod 700 /var/backups/petdate
  (sudo crontab -l 2>/dev/null | grep -v backup-sqlite || true; echo "15 2 * * * $REMOTE_DIR/scripts/backup-sqlite.sh >> /var/log/petdate-backup.log 2>&1") | sudo crontab - || true
fi

# PM2 process file
cp -f ecosystem.config.cjs ecosystem.config.cjs.bak 2>/dev/null || true
cat > ecosystem.config.cjs <<'PM2'
module.exports = {
  apps: [
    {
      name: 'petdate-api',
      cwd: '$REMOTE_DIR',
      script: 'packages/api/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '10s',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production', PORT: 3001, NODE_OPTIONS: '--dns-result-order=ipv4first' },
    },
    {
      name: 'petdate-bot',
      cwd: '$REMOTE_DIR',
      script: 'packages/bot/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '10s',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production', NODE_OPTIONS: '--dns-result-order=ipv4first' },
    },
  ],
};
PM2

# Expand REMOTE_DIR in generated ecosystem (heredoc quoted kept literals)
sed -i "s|'\$REMOTE_DIR'|'$REMOTE_DIR'|g; s|\$REMOTE_DIR|$REMOTE_DIR|g" ecosystem.config.cjs || true

pm2 startOrReload ecosystem.config.cjs
pm2 save
sudo env PATH=\$PATH:\$(dirname \$(which node)) pm2 startup systemd -u \$(whoami) --hp \$HOME >/tmp/pm2-startup.txt || true

# Prefer checked-in hardened nginx if present
if [[ -f infra/nginx/petdate.conf ]]; then
  sudo cp infra/nginx/petdate.conf /etc/nginx/sites-available/petdate
  sudo ln -sfn /etc/nginx/sites-available/petdate /etc/nginx/sites-enabled/petdate
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
else
# Nginx: serve web + proxy API
sudo tee /etc/nginx/sites-available/petdate >/dev/null <<'NGINX'
server {
  listen 80 default_server;
  server_name _;
  client_max_body_size 20m;

  root $REMOTE_DIR/packages/web/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /rx {
    proxy_pass http://127.0.0.1:3001/rx;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
  }

  location /assets/brand/ {
    proxy_pass http://127.0.0.1:3001/assets/brand/;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
NGINX

# Expand REMOTE_DIR in nginx file
sudo sed -i "s|\\\$REMOTE_DIR|$REMOTE_DIR|g; s|$REMOTE_DIR|$REMOTE_DIR|g" /etc/nginx/sites-available/petdate || true
sudo ln -sfn /etc/nginx/sites-available/petdate /etc/nginx/sites-enabled/petdate
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
fi

echo ""
echo "Deploy done."
echo "Web:   http://SERVER_IP/"
echo "Admin: http://SERVER_IP/admin/login  (password: petdate unless ADMIN_PASSWORD changed)"
echo "API:   http://SERVER_IP/api/health"
echo "Edit $REMOTE_DIR/.env then: pm2 restart all"
EOF
