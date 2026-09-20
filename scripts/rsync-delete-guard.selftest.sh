#!/usr/bin/env bash
# Selftest for scripts/rsync-delete-guard.sh — local dirs only, no VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GUARD="$ROOT/scripts/rsync-delete-guard.sh"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail() { echo "rsync-delete-guard.selftest FAIL: $*" >&2; exit 1; }
ok() { echo "rsync-delete-guard.selftest OK: $*"; }

# A source tree shaped like the repo root, plus a destination shaped like
# /opt/petdate with extra files that only exist "on the server".
new_case() {
  rm -rf "$WORK/src" "$WORK/dst"
  mkdir -p "$WORK/src/packages/api/src/routes" "$WORK/dst/packages/api/src/routes"
  echo 'export const users = 1;' > "$WORK/src/packages/api/src/routes/users.ts"
  cp "$WORK/src/packages/api/src/routes/users.ts" "$WORK/dst/packages/api/src/routes/users.ts"
}

run_guard() {
  "$GUARD" "$WORK/src/" "$WORK/dst/" > "$WORK/out.txt" 2>&1
}

# 1. Identical trees: nothing to delete, guard passes.
new_case
if ! run_guard; then
  cat "$WORK/out.txt"
  fail "guard rejected an in-sync tree"
fi
ok "in-sync tree passes"

# 2. The 2026-09-20 incident in miniature: a router that exists only on the
#    server. The guard must fail and name the path.
new_case
echo 'export const magazine = 1;' > "$WORK/dst/packages/api/src/routes/magazine.ts"
if run_guard; then
  cat "$WORK/out.txt"
  fail "guard allowed deletion of a server-only source file"
fi
grep -q 'packages/api/src/routes/magazine.ts' "$WORK/out.txt" \
  || fail "guard did not name the path it would delete"
grep -q 'guard FAIL' "$WORK/out.txt" || fail "guard did not report a failure"
ok "server-only source file blocks the deploy"

# 3. Same file, break-glass acknowledgement: reports but proceeds.
if ! ACK_RSYNC_DELETIONS=1 "$GUARD" "$WORK/src/" "$WORK/dst/" > "$WORK/out.txt" 2>&1; then
  cat "$WORK/out.txt"
  fail "ACK_RSYNC_DELETIONS=1 did not allow the deploy through"
fi
grep -q 'ACK_RSYNC_DELETIONS=1' "$WORK/out.txt" || fail "break-glass path did not warn"
ok "break-glass override works and warns"

# 4. Server-owned upload directory: protected by COMMON_EXCLUDES, so rsync
#    never proposes deleting it and the guard stays quiet.
new_case
mkdir -p "$WORK/src/packages/web/public/pepito/uploads" \
         "$WORK/dst/packages/web/public/pepito/uploads/reviews"
echo asset > "$WORK/src/packages/web/public/pepito/uploads/01.jpg"
cp "$WORK/src/packages/web/public/pepito/uploads/01.jpg" \
   "$WORK/dst/packages/web/public/pepito/uploads/01.jpg"
echo photo > "$WORK/dst/packages/web/public/pepito/uploads/reviews/fantasy-01.jpg"
mkdir -p "$WORK/dst/packages/api/data"
echo db > "$WORK/dst/packages/api/data/petdate.db"
echo db > "$WORK/dst/packages/api/data/review-photos.bin"
if ! run_guard; then
  cat "$WORK/out.txt"
  fail "excluded upload/runtime paths were treated as deletions"
fi
ok "excluded upload and data paths are protected"

# 5. Allow-listed junk may be deleted without failing.
new_case
echo junk > "$WORK/dst/.DS_Store"
echo junk > "$WORK/dst/packages/api/.DS_Store"
if ! run_guard; then
  cat "$WORK/out.txt"
  fail "allow-listed path failed the guard"
fi
ok "allow-listed paths do not fail the guard"

echo "rsync-delete-guard.selftest: all passed"
