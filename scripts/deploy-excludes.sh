#!/usr/bin/env bash
# Single source of truth for the rsync excludes used by every deploy path.
#
# Sourced by scripts/deploy-vps.sh and scripts/rsync-delete-guard.sh so the
# dry-run guard always tests the exact exclude set the real sync will use.
# Defines: COMMON_EXCLUDES (array of rsync --exclude args).
#
# An exclude here does two things: the path is never uploaded, and — because
# rsync protects excluded paths from --delete — the server-side copy survives
# a full-scope sync. Anything that legitimately exists only on the VPS must be
# listed, or `rsync --delete` removes it (see the 2026-09-20 incident).

COMMON_EXCLUDES=(
  --exclude node_modules
  --exclude .git
  --exclude .env
  --exclude '.env.*'
  --exclude 'packages/*/dist'

  # Runtime data owned by the server, never by git.
  # The whole packages/api/data tree is excluded: listing individual
  # subdirectories meant any new runtime path (uploads, generated reports,
  # exports) was deleted on the next full deploy until someone remembered to
  # add a matching line here.
  --exclude 'packages/api/data'
  --exclude 'packages/api/data/*.db*'
  --exclude 'packages/api/data/chat-uploads'
  --exclude 'packages/api/data/pet-photos'
  --exclude 'packages/api/data/user-avatars'
  --exclude 'packages/api/data/prescriptions'
  --exclude 'packages/bot/data'
  --exclude 'packages/bot/data/sessions.json'

  # User/operator-uploaded web content served straight from the public tree.
  # These directories are written on the VPS (admin panel uploads, editorial
  # photos) and are not tracked in git.
  --exclude 'packages/web/public/pepito/uploads/reviews'
  --exclude 'packages/web/public/uploads'
  --exclude 'packages/web/public/media/uploads'
  --exclude 'packages/web/public/.well-known'

  # Certbot / ACME and operational scratch.
  --exclude '.well-known'
  --exclude 'logs'
  --exclude '*.log'
)
