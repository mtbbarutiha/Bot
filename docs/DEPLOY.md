# Deploy discipline (PetDate)

> **This repository cannot deploy. Do not give it the ability again.**
>
> `mtbbarutiha/Bot` is a stale fork of `mtbbarutiha/petdate`, frozen at `6c81af4`
> (2026-09-07) and roughly 1,439 files behind. Its Deploy workflow targeted
> **the same `/opt/petdate` on the same VPS** as the real repo, so a successful
> run here overwrites live production with a months-old tree. That is exactly
> what happened on **2026-09-20**. `.github/workflows/deploy.yml` has been
> deleted; production ships only from `mtbbarutiha/petdate`.

## Where production actually deploys from

`mtbbarutiha/petdate` → `.github/workflows/deploy.yml` → `scripts/deploy-vps.sh`.
Nothing in this repository is part of that path. `scripts/deploy-vps.sh` still
exists here as dead code so the fork's history stays readable, but no workflow
invokes it and this repo should not hold VPS credentials.

## What is left here

| Workflow | Trigger | What it does |
|----------|---------|----------------|
| `.github/workflows/ci.yml` | PR + push | `npm ci` → build shared→api→bot→web → selftests → predeploy-check |

CI builds and tests only. It never opens an SSH connection and never reads a
`VPS_*` secret.

### Secrets that should be removed from this repo

Repo → **Settings → Secrets and variables → Actions**. These are live
credentials for the production VPS and have no remaining consumer here:

| Secret | Action |
|--------|--------|
| `VPS_SSH_KEY` | delete — grants root-equivalent access to the production host |
| `VPS_HOST` | delete |
| `VPS_USER` | delete |
| `VPS_PATH` | delete |

Deleting the workflow removes the trigger; deleting the secrets removes the
capability. Archiving this repository outright is stronger still.

### Preserve on every deploy (for reference — enforced in `petdate`)

- **Single `DATABASE_PATH`** — `ecosystem.config.cjs` absolute SQLite SoT; rsync **excludes** `*.db*` (never wipe live DB).
- **No sitter roles** — `pet_sitter` / `community_seeker` only in `REMOVED_USER_ROLES`.
- **web-cta-once-v2** — CTA at most once per chat+user (api + bot markers checked in predeploy).
- **Transactions / wallet** — api route markers must remain (predeploy greps).

## Root cause (ad-hoc rsync)

Several Cloud Agents each ran something like:

```bash
rsync -az --delete packages/web/dist/ root@VPS:/opt/petdate/packages/web/dist/
```

from **their own incomplete feature branch**. That replaced the live site with an older/partial bundle (and package-scoped `--delete` against the wrong destination could wipe siblings).

## What actually fixes it

Ship from `mtbbarutiha/petdate` and only from there. The rules below are that
repo's rules; they are kept here because the commands in this fork still look
runnable and are not.

1. **Feature branches must not deploy to VPS.** They only commit.
2. **Merge to `main`/`master`**, then let the **Deploy** workflow *in `petdate`* ship a **full consistent** tree (shared → api → bot → web + pm2).
3. Run `scripts/predeploy-check.sh` before any break-glass `deploy-vps.sh`.
4. Package-scoped sync (`DEPLOY_SCOPE=web|api|bot|shared`) **never** uses parent-level `--delete` and requires `ALLOW_PARTIAL_DEPLOY=1`. Prefer `DEPLOY_SCOPE=all`.
5. Escape hatch only when you knowingly accept overwrite risk: `ALLOW_DEPLOY=1` or `SKIP_PREDEPLOY=1`.

Do **not** run `scripts/deploy-vps.sh` from a checkout of this fork. It would
push a 2026-09-07 tree at `/opt/petdate` — the 2026-09-20 incident, by hand.

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
