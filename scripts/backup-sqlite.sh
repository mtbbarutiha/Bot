#!/usr/bin/env bash
# Daily SQLite backup for PetDate (safe online copy via sqlite3 .backup when available).
# Cron example (root):
#   15 2 * * * /opt/petdate/scripts/backup-sqlite.sh >> /var/log/petdate-backup.log 2>&1
set -euo pipefail

ROOT="${PETDATE_ROOT:-/opt/petdate}"
DB="${DATABASE_PATH:-$ROOT/packages/api/data/petdate.db}"
BACKUP_DIR="${PETDATE_BACKUP_DIR:-/var/backups/petdate}"
KEEP_DAYS="${PETDATE_BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$BACKUP_DIR/petdate-$STAMP.db"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

if [[ ! -f "$DB" ]]; then
  echo "backup-sqlite: DB missing: $DB" >&2
  exit 1
fi

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$DEST'"
else
  # Fallback: copy main db + wal/shm if present (brief inconsistency risk under write load)
  cp -a "$DB" "$DEST"
  [[ -f "${DB}-wal" ]] && cp -a "${DB}-wal" "${DEST}-wal" || true
  [[ -f "${DB}-shm" ]] && cp -a "${DB}-shm" "${DEST}-shm" || true
fi

chmod 600 "$DEST" "${DEST}-wal" "${DEST}-shm" 2>/dev/null || true

# Prune old backups
find "$BACKUP_DIR" -type f -name 'petdate-*.db*' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true

SIZE="$(du -h "$DEST" | awk '{print $1}')"
echo "backup-sqlite: ok $DEST ($SIZE)"
