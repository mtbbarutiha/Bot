#!/usr/bin/env bash
# Ensure Elasticsearch is running for PetDate admin monitoring / future search.
# Prefers docker compose profile "search"; falls back to a native tarball + systemd
# unit when Elastic/Docker registries are unreachable (common on some VPS networks).
#
# Usage (on the VPS, from repo root):
#   ./scripts/ensure-elasticsearch.sh
# Optional env:
#   ES_VERSION=8.15.0
#   ES_HEAP=512m
#   ELASTICSEARCH_URL=http://localhost:9200
#   SKIP_DOCKER=1

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ES_VERSION="${ES_VERSION:-8.15.0}"
ES_HEAP="${ES_HEAP:-512m}"
ES_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"
ES_ROOT="${ES_ROOT:-/opt/elasticsearch}"
ES_DATA="${ES_DATA:-/var/lib/elasticsearch}"
ES_LOGS="${ES_LOGS:-/var/log/elasticsearch}"
UNIT_NAME=petdate-elasticsearch.service

set_env_url() {
  local env_file="$ROOT/.env"
  if [[ ! -f "$env_file" ]]; then
    echo "No .env at $env_file — skip ELASTICSEARCH_URL write"
    return 0
  fi
  if grep -qE '^ELASTICSEARCH_URL=' "$env_file"; then
    sed -i "s|^ELASTICSEARCH_URL=.*|ELASTICSEARCH_URL=${ES_URL}|" "$env_file"
  else
    # Drop disabled comments so monitoring does not stay «پیکربندی نشده»
    sed -i '/ELASTICSEARCH_URL/d' "$env_file"
    printf '\nELASTICSEARCH_URL=%s\n' "$ES_URL" >> "$env_file"
  fi
  echo "Set ELASTICSEARCH_URL=${ES_URL} in .env"
}

wait_health() {
  local i
  for i in $(seq 1 48); do
    if curl -fsS "${ES_URL}/_cluster/health" >/dev/null 2>&1; then
      curl -fsS "${ES_URL}/_cluster/health" || true
      echo
      return 0
    fi
    sleep 5
  done
  return 1
}

try_docker() {
  if [[ "${SKIP_DOCKER:-0}" == "1" ]]; then
    return 1
  fi
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  if [[ ! -f "$ROOT/docker-compose.yml" ]]; then
    return 1
  fi
  echo "==> Trying docker compose --profile search"
  if ! docker compose --profile search up -d elasticsearch; then
    echo "Docker Elasticsearch pull/start failed — will try native install"
    return 1
  fi
  if wait_health; then
    echo "Elasticsearch healthy via Docker"
    return 0
  fi
  echo "Docker Elasticsearch started but health check failed"
  return 1
}

install_native() {
  local tgz="/tmp/elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz"
  local url="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz"

  if [[ ! -x "$ES_ROOT/bin/elasticsearch" ]]; then
    echo "==> Downloading Elasticsearch ${ES_VERSION} tarball"
    curl -fL --retry 5 --retry-delay 3 -o "${tgz}.partial" "$url"
    mv "${tgz}.partial" "$tgz"
    rm -rf "$ES_ROOT"
    tar -xzf "$tgz" -C /opt
    mv "/opt/elasticsearch-${ES_VERSION}" "$ES_ROOT"
    rm -f "$tgz"
  fi

  if ! id elasticsearch >/dev/null 2>&1; then
    useradd --system --home "$ES_ROOT" --shell /usr/sbin/nologin elasticsearch
  fi
  mkdir -p "$ES_DATA" "$ES_LOGS"
  chown -R elasticsearch:elasticsearch "$ES_ROOT" "$ES_DATA" "$ES_LOGS"

  cat > "$ES_ROOT/config/elasticsearch.yml" <<CFG
cluster.name: petdate
node.name: petdate-node-1
path.data: ${ES_DATA}
path.logs: ${ES_LOGS}
network.host: 127.0.0.1
http.port: 9200
discovery.type: single-node
xpack.security.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
bootstrap.memory_lock: false
CFG

  mkdir -p "$ES_ROOT/config/jvm.options.d"
  cat > "$ES_ROOT/config/jvm.options.d/heap.options" <<JVM
-Xms${ES_HEAP}
-Xmx${ES_HEAP}
JVM
  chown -R elasticsearch:elasticsearch "$ES_ROOT/config"

  cat > "/etc/systemd/system/${UNIT_NAME}" <<UNIT
[Unit]
Description=PetDate Elasticsearch (single-node)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=elasticsearch
Group=elasticsearch
Environment=ES_HOME=${ES_ROOT}
Environment=ES_PATH_CONF=${ES_ROOT}/config
WorkingDirectory=${ES_ROOT}
ExecStart=${ES_ROOT}/bin/elasticsearch
Restart=on-failure
RestartSec=10
LimitNOFILE=65535
LimitNPROC=4096
TimeoutStartSec=180
TimeoutStopSec=60
KillMode=process
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  systemctl enable "$UNIT_NAME"
  systemctl restart "$UNIT_NAME"
  echo "==> Waiting for native Elasticsearch health"
  if wait_health; then
    echo "Elasticsearch healthy via systemd (${UNIT_NAME})"
    return 0
  fi
  systemctl status "$UNIT_NAME" --no-pager -l || true
  journalctl -u "$UNIT_NAME" -n 80 --no-pager || true
  return 1
}

if curl -fsS "${ES_URL}/_cluster/health" >/dev/null 2>&1; then
  echo "Elasticsearch already healthy at ${ES_URL}"
  set_env_url
  exit 0
fi

if try_docker; then
  set_env_url
  exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Native Elasticsearch install requires root (sudo)."
  exit 1
fi

install_native
set_env_url
