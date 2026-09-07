#!/usr/bin/env bash
# Refuse incomplete-tree VPS deploys (logo/feature overwrites).
# CI/CD does NOT fix the root cause — feature branches must not rsync dist.
# See docs/DEPLOY.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "predeploy-check FAIL: $*" >&2
  exit 1
}
ok() { echo "predeploy-check OK: $*"; }

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

# Only integration lines may deploy (override: ALLOW_DEPLOY=1).
case "$BRANCH" in
  cursor/stabilize-deploy-logos-6c89|cursor/predeploy-guard-6c89|cursor/mother-logo-everywhere-6c89|cursor/pwa-mark-no-type-6c89|production|main) ;;
  *)
    if [[ "${ALLOW_DEPLOY:-}" != "1" ]]; then
      fail "branch '$BRANCH' cannot deploy. Merge into cursor/stabilize-deploy-logos-6c89 first (or ALLOW_DEPLOY=1)."
    fi
    echo "predeploy-check WARN: ALLOW_DEPLOY=1 on non-integration branch $BRANCH"
    ;;
esac
ok "branch $BRANCH"

check_md5() {
  local file="$1" expect="$2" got
  [[ -f "$file" ]] || fail "missing $file"
  got="$(md5sum "$file" | awk '{print $1}')"
  [[ "$got" == "$expect" ]] || fail "$file md5=$got expected=$expect"
  ok "$file"
}

# لوگو مادر full wordmark for header; PWA = mark-only crop (no type) — see generate-brand-assets.py
check_md5 packages/web/public/pepito/img/logo.png beda5e5ccdd11c32dd06a4f1bce2c6bf
check_md5 packages/web/public/pwa-192.png 16a1f783d32a55f7a2c948b6951da303
check_md5 packages/web/public/favicon.png ab82dcfaeed55aad89b4ba8ec16726cb

if [[ -f packages/web/src/pages/ExplorePage.tsx ]]; then
  fail "ExplorePage.tsx must stay deleted"
fi
ok "ExplorePage absent"

grep -q 'هم بازی' packages/web/src/lib/siteNav.ts packages/web/src/components/Layout.tsx \
  || fail "owner nav «هم بازی» missing"
ok "هم بازی nav"

grep -qE 'login-start|createTelegramLoginPending' packages/api/src/routes/auth.ts \
  || fail "Telegram login-start missing in auth routes"
grep -q 'createTelegramLoginPending' packages/api/src/services/telegram-web-link.ts \
  || fail "createTelegramLoginPending missing"
ok "telegram pending login"

grep -q "newsletterEmail: 'news@petdate.ir'" packages/shared/src/brand.ts \
  || fail "SITE.newsletterEmail news@petdate.ir missing"
[[ -f packages/api/src/routes/newsletter.ts ]] || fail "newsletter route missing"
ok "newsletter news@"

grep -q 'یک گفتگو را انتخاب کن' packages/web/src/pages/ChatPage.tsx \
  || fail "desktop chat empty-state missing"
ok "desktop chat empty-state"

echo "predeploy-check passed — this tree may deploy."
