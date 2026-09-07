# Deploy discipline (PetDate)

> **Agents:** before any manual `rsync` of `dist`, run `./scripts/predeploy-check.sh` and only proceed if it passes. `deploy-vps.sh` runs the same check automatically (escape hatch: `SKIP_PREDEPLOY=1`).

## Root cause (not CI/CD)

**CI/CD does not fix this.** Pipelines still ship whatever tree you point at. The bug is **process**:

Several Cloud Agents each run something like:

```bash
rsync -az --delete packages/web/dist/ root@VPS:/opt/petdate/packages/web/dist/
```

from **their own incomplete feature branch**. That wipes the live site and replaces it with an older bundle (old PWA logo, missing Telegram login, explore page back, …).

So the site “reverts” after every random agent update.

## What actually fixes it

1. **Feature branches must not deploy to VPS.** They only commit.
2. **One integration branch** may deploy (today: `cursor/stabilize-deploy-logos-6c89`).
3. Merge / cherry-pick finished work onto that line, then deploy **once**.
4. Run `scripts/predeploy-check.sh` before any rsync/`deploy-vps.sh` — it refuses incomplete trees and wrong logo hashes.
5. Escape hatch only when you knowingly accept overwrite risk: `ALLOW_DEPLOY=1` or `SKIP_PREDEPLOY=1`.

```bash
./scripts/predeploy-check.sh
./scripts/deploy-vps.sh root@185.110.189.218
# or after local build:
./scripts/predeploy-check.sh && rsync -az --delete packages/web/dist/ root@VPS:/opt/petdate/packages/web/dist/
```

## Canonical brand logos

| Role | Path |
|------|------|
| **لوگو مادر (source of truth)** | `packages/web/public/pepito/img/logo.png` (md5 `beda5e5ccdd11c32dd06a4f1bce2c6bf`) |
| Footer light | `packages/web/public/pepito/img/logo-light.png` |
| PWA / favicon / apple-touch / brand / email | `packages/web/scripts/generate-brand-assets.py` from لوگو مادر |

**Rule:** Everywhere uses لوگو مادر. PWA Home Screen icons are the **full wordmark** fitted on a soft square canvas (not a mark-only crop). Favicon 16–32px is the pink dog+cat mark crop (wordmark illegible at that size) — still extracted from mother. Regenerate with:

```bash
python3 packages/web/scripts/generate-brand-assets.py
```

Do **not** invent a new PWA mark or neon icon.

## Live paths on VPS

- Web: `/opt/petdate/packages/web/dist` (nginx root)
- API/Bot: `/opt/petdate/packages/{api,bot}/dist` + `pm2 restart petdate-api petdate-bot`
