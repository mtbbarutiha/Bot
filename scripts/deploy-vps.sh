#!/usr/bin/env bash
# Deploy PetDate to a Ubuntu VPS (API + bot + web + nginx).
# Usage:
#   ./scripts/deploy-vps.sh user@SERVER_IP
# Optional env:
#   REMOTE_DIR=/opt/petdate
#   BRANCH=cursor/chat-media-end-wipe-6c89

set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 user@SERVER_IP"
  exit 1
fi

REMOTE_DIR="${REMOTE_DIR:-/opt/petdate}"
BRANCH="${BRANCH:-cursor/chat-media-end-wipe-6c89}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Syncing project to ${TARGET}:${REMOTE_DIR}"
ssh "$TARGET" "sudo mkdir -p '$REMOTE_DIR' && sudo chown -R \$(whoami):\$(whoami) '$REMOTE_DIR'"
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude 'packages/*/dist' \
  --exclude 'packages/api/data/*.db*' \
  --exclude 'packages/api/data/chat-uploads' \
  --exclude 'packages/api/data/pet-photos' \
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

npm install
npm run build:all

mkdir -p packages/api/data

# PM2 process file
cat > ecosystem.config.cjs <<'PM2'
module.exports = {
  apps: [
    {
      name: 'petdate-api',
      cwd: '$REMOTE_DIR',
      script: 'packages/api/dist/index.js',
      env: { NODE_ENV: 'production', PORT: 3001 },
      max_memory_restart: '512M',
    },
    {
      name: 'petdate-bot',
      cwd: '$REMOTE_DIR',
      script: 'packages/bot/dist/index.js',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
    },
  ],
};
PM2

pm2 startOrReload ecosystem.config.cjs
pm2 save
sudo env PATH=\$PATH:\$(dirname \$(which node)) pm2 startup systemd -u \$(whoami) --hp \$HOME >/tmp/pm2-startup.txt || true

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

echo ""
echo "Deploy done."
echo "Web:   http://SERVER_IP/"
echo "Admin: http://SERVER_IP/admin/login  (password: petdate unless ADMIN_PASSWORD changed)"
echo "API:   http://SERVER_IP/api/health"
echo "Edit $REMOTE_DIR/.env then: pm2 restart all"
EOF
