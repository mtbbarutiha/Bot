#!/usr/bin/env bash
# Pre-deploy guard: refuse a destructive `rsync --delete`.
#
# Runs the exact rsync the deploy is about to run, but with --dry-run, and
# fails when rsync reports it would delete a remote path that is not present
# in this git checkout. Those paths only exist on the server, so deleting them
# destroys data that no commit can restore.
#
# Why this exists: on 2026-09-20 17:23 UTC a full-scope deploy ran
# `rsync -az --delete` against /opt/petdate and removed the magazine, hero and
# pet-lover-reviews routers, the pd-seo prerender shell and 26 review photos —
# every live-only file under packages/api/src/ and packages/web/public/.
#
# Usage:
#   scripts/rsync-delete-guard.sh <src-dir> <user@host:/dest-dir>
#   scripts/rsync-delete-guard.sh <src-dir> </local/dest-dir>
#
# Env:
#   DELETE_ALLOWLIST=scripts/deploy-delete-allowlist.txt
#   ACK_RSYNC_DELETIONS=1  break-glass: report and continue instead of failing.
#                          CI never sets this; a human must run the deploy by
#                          hand and take responsibility for the deletions.
set -euo pipefail

SRC="${1:-}"
DEST="${2:-}"
if [[ -z "$SRC" || -z "$DEST" ]]; then
  echo "Usage: $0 <src-dir> <[user@host:]dest-dir>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/deploy-excludes.sh
source "$ROOT/scripts/deploy-excludes.sh"

ALLOWLIST="${DELETE_ALLOWLIST:-$ROOT/scripts/deploy-delete-allowlist.txt}"

allowlisted() {
  local path="$1" pattern
  [[ -f "$ALLOWLIST" ]] || return 1
  while IFS= read -r pattern; do
    pattern="${pattern%%#*}"
    pattern="$(printf '%s' "$pattern" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ -n "$pattern" ]] || continue
    # shellcheck disable=SC2053  # glob match is the point
    if [[ "$path" == $pattern ]]; then
      return 0
    fi
  done < "$ALLOWLIST"
  return 1
}

in_git() {
  local path="${1%/}"
  [[ -n "$(git -C "$ROOT" ls-files -- "$path" 2>/dev/null | head -1)" ]]
}

echo "==> rsync --delete guard (dry run): ${SRC} → ${DEST}"
DRYRUN_OUT="$(mktemp)"
trap 'rm -f "$DRYRUN_OUT"' EXIT

rsync -az --delete --dry-run --out-format='%o|%n' \
  "${COMMON_EXCLUDES[@]}" "$SRC" "$DEST" > "$DRYRUN_OUT"

# With --out-format='%o|%n' rsync reports a pending deletion as `del.|some/path`
# (directories carry a trailing slash). The pipe keeps paths with spaces intact.
mapfile -t DELETIONS < <(sed -n 's/^del\.|//p' "$DRYRUN_OUT" | sed '/^$/d')

if [[ "${#DELETIONS[@]}" -eq 0 ]]; then
  echo "guard OK: --delete would remove nothing on the remote."
  exit 0
fi

UNTRACKED=()
TRACKED=()
ALLOWED=()
for path in "${DELETIONS[@]}"; do
  if allowlisted "$path"; then
    ALLOWED+=("$path")
  elif in_git "$path"; then
    TRACKED+=("$path")
  else
    UNTRACKED+=("$path")
  fi
done

report() {
  echo "rsync --delete would remove ${#DELETIONS[@]} remote path(s)."
  echo "  allow-listed:      ${#ALLOWED[@]}"
  echo "  present in git:    ${#TRACKED[@]}"
  echo "  NOT present in git: ${#UNTRACKED[@]}"
  if [[ "${#UNTRACKED[@]}" -gt 0 ]]; then
    echo ""
    echo "Paths that exist only on the server and would be destroyed:"
    printf '  %s\n' "${UNTRACKED[@]}"
  fi
  if [[ "${#TRACKED[@]}" -gt 0 ]]; then
    echo ""
    echo "Paths tracked in git that rsync still wants to delete (exclude/case mismatch?):"
    printf '  %s\n' "${TRACKED[@]}"
  fi
}

report

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "### rsync --delete guard"
    echo ""
    echo '```'
    report
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [[ "${#UNTRACKED[@]}" -eq 0 && "${#TRACKED[@]}" -eq 0 ]]; then
  echo "guard OK: every deletion is allow-listed."
  exit 0
fi

if [[ "${ACK_RSYNC_DELETIONS:-}" == "1" ]]; then
  echo "guard WARN: ACK_RSYNC_DELETIONS=1 — continuing despite the deletions above."
  exit 0
fi

cat >&2 <<'MSG'

guard FAIL: this deploy would delete server-only content.

Nothing has been synced. Resolve it one of these ways, in order of preference:

  1. Commit the live-only files to git so the deploy ships them instead of
     deleting them. Copy them off the VPS first.
  2. If the path is runtime state the server owns (uploads, generated data),
     add it to COMMON_EXCLUDES in scripts/deploy-excludes.sh. Excluded paths
     are protected from --delete.
  3. If the deletion is genuinely intended, add the path to
     scripts/deploy-delete-allowlist.txt in the same commit that removes it.

Break-glass for a human at a terminal: ACK_RSYNC_DELETIONS=1. CI must not set it.
MSG
exit 1
