# Deploy discipline (PetDate)

> **Agents:** do **not** `rsync` to the VPS from feature branches. The controlled path is **GitHub Actions → Deploy**. Before any break-glass manual deploy, run `./scripts/predeploy-check.sh` and only proceed if it passes. `deploy-vps.sh` runs the same check automatically (escape hatch: `SKIP_PREDEPLOY=1`).

## Controlled path: CI/CD

Parallel Cloud Agent rsyncs used to overwrite incomplete trees and delete live features (wallet **transactions**, **roles** cleanup, **web-cta-once-v2**). CI/CD is now the **only supported** production deploy path.

| Workflow | Trigger | What it does |
|----------|---------|----------------|
| `.github/workflows/ci.yml` | PR + push | `npm ci` → build shared→api→bot→web → selftests → predeploy-check |
| `.github/workflows/deploy.yml` | push to `main`/`master`, or `workflow_dispatch` | same build, then SSH deploy of **full** tree (`DEPLOY_SCOPE=all`) |

Deploy uses GitHub Environment **`production`** (enable required reviewers for manual approval).

### Secrets Mohammad must set

Repo → **Settings → Secrets and variables → Actions** (never commit these):

| Secret | Required | Example / notes |
|--------|----------|-----------------|
| `VPS_HOST` | yes | `185.110.189.218` |
| `VPS_USER` | yes | `root` |
| `VPS_SSH_KEY` | yes | Full private key PEM for that user (deploy key or user key). **Do not** put the key in git. |
| `VPS_PATH` | no | Default `/opt/petdate` |

Also create Environment **production** (Settings → Environments) and optionally require reviewers.

### How to trigger deploy

1. Merge finished work into `main` (or `master`) — push runs Deploy after CI build (and Environment approval if configured).
2. Manual: Actions → **Deploy** → Run workflow → set **confirm** to `deploy` → scope **all** (recommended).
3. Agents still often cannot `git push` (no token) — workflow files live in the repo; a human pushes/merges, then Actions deploys.

### Preserve on every deploy

- **Single `DATABASE_PATH`** — `ecosystem.config.cjs` absolute SQLite SoT; rsync **excludes** `*.db*` (never wipe live DB).
- **No sitter roles** — `pet_sitter` / `community_seeker` only in `REMOVED_USER_ROLES`.
- **web-cta-once-v2** — CTA at most once per chat+user (api + bot markers checked in predeploy).
- **Transactions / wallet** — api route markers must remain (predeploy greps).

## The `--delete` guard

A full-scope deploy syncs the repo root with `rsync -az --delete`. Anything on the
VPS that is not in git and not excluded is deleted. On **2026-09-20 17:23 UTC** that
removed the `magazine`, `hero` and `pet-lover-reviews` routers, the `pd-seo`
prerender shell and 26 review photos, because `COMMON_EXCLUDES` covered `.env`,
`node_modules`, `packages/*/dist` and the DB but not `packages/api/src/` or
`packages/web/public/`.

`scripts/rsync-delete-guard.sh` now runs the same rsync with `--dry-run` before
anything is written, and **fails the deploy** if `--delete` would remove a remote
path that is not present in git. It runs as its own step in `deploy.yml` and again
from `deploy-vps.sh` for break-glass manual deploys.

When it fails, pick one:

1. Copy the live-only files off the VPS and **commit them** — best outcome, the
   deploy then ships them instead of deleting them.
2. If the path is runtime state the server owns (uploads, generated data), add it
   to `COMMON_EXCLUDES` in `scripts/deploy-excludes.sh`. Excluded paths are
   protected from `--delete`.
3. If the removal is intended, add the path to `scripts/deploy-delete-allowlist.txt`
   in the same commit.

Overrides — `ACK_RSYNC_DELETIONS=1` (report, then delete anyway) and
`SKIP_DELETE_GUARD=1` (do not check at all) — are for a human at a terminal who has
read the report. CI must never set them.

Excludes live in `scripts/deploy-excludes.sh`, sourced by both the guard and the
real sync, so a dry run can never test a different exclude set than the deploy.
Note that an exclude is path-exact: `packages/api/data/*.db*` protects the DB but
would **not** protect a new `packages/api/data/review-photos/`. The whole
`packages/api/data` tree is excluded for that reason.

## Root cause (ad-hoc rsync)

Several Cloud Agents each ran something like:

```bash
rsync -az --delete packages/web/dist/ root@VPS:/opt/petdate/packages/web/dist/
```

from **their own incomplete feature branch**. That replaced the live site with an older/partial bundle (and package-scoped `--delete` against the wrong destination could wipe siblings).

## What actually fixes it

1. **Feature branches must not deploy to VPS.** They only commit.
2. **Merge to `main`/`master`**, then let **Deploy** workflow ship a **full consistent** tree (shared → api → bot → web + pm2).
3. Run `scripts/predeploy-check.sh` before any break-glass `deploy-vps.sh`.
4. Package-scoped sync (`DEPLOY_SCOPE=web|api|bot|shared`) **never** uses parent-level `--delete` and requires `ALLOW_PARTIAL_DEPLOY=1`. Prefer `DEPLOY_SCOPE=all`.
5. Escape hatch only when you knowingly accept overwrite risk: `ALLOW_DEPLOY=1` or `SKIP_PREDEPLOY=1`.

```bash
./scripts/predeploy-check.sh
DEPLOY_SCOPE=all ./scripts/deploy-vps.sh root@185.110.189.218
# partial (discouraged):
# ALLOW_PARTIAL_DEPLOY=1 DEPLOY_SCOPE=web ./scripts/deploy-vps.sh root@185.110.189.218
```

## Canonical brand logos

| Role | Path |
|------|------|
| **لوگو مادر (source of truth)** | `packages/web/public/pepito/img/logo.png` (md5 `beda5e5ccdd11c32dd06a4f1bce2c6bf`) |
| Footer light | `packages/web/public/pepito/img/logo-light.png` |
| PWA / favicon / apple-touch / brand marks | `packages/web/scripts/generate-brand-assets.py` — **mark-only** (pink dog+cat, no «Pet Date» type) |
| OG / channel / email | same script — **full** mother wordmark |

**Rule:** Site header / SiteLogo / `logo.png` / `logo-light` keep full لوگو مادر with type. PWA Home Screen / favicon / apple-touch use the **mark-only** crop (no wordmark text) extracted from mother. Regenerate with:

```bash
python3 packages/web/scripts/generate-brand-assets.py
```

Do **not** invent a new PWA mark or neon icon.

## Live paths on VPS

- App root: `/opt/petdate` (`VPS_PATH`)
- Web: `/opt/petdate/packages/web/dist` (nginx root)
- API/Bot: `/opt/petdate/packages/{api,bot}/dist` + `pm2 restart petdate-api petdate-bot`
- DB: `/opt/petdate/packages/api/data/petdate.db` via `DATABASE_PATH` in `ecosystem.config.cjs`
