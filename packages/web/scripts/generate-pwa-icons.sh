#!/usr/bin/env bash
# Regenerate PWA / apple-touch / favicon PNGs from brand/pwa-icon.svg
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/brand/pwa-icon.svg"
OUT="$ROOT/public"

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert required (apt: librsvg2-bin)" >&2
  exit 1
fi

rsvg-convert -w 512 -h 512 "$SRC" -o "$OUT/pwa-512.png"
rsvg-convert -w 192 -h 192 "$SRC" -o "$OUT/pwa-192.png"
rsvg-convert -w 180 -h 180 "$SRC" -o "$OUT/apple-touch-icon.png"
rsvg-convert -w 32 -h 32 "$SRC" -o "$OUT/favicon.png"

echo "Generated:"
ls -la "$OUT/pwa-512.png" "$OUT/pwa-192.png" "$OUT/apple-touch-icon.png" "$OUT/favicon.png"
