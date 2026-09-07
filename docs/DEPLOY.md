# Deploy discipline (PetDate Cloud Agents)

## Why features and logos keep “reverting”

Multiple Cloud Agents work on **separate git branches** and each one often runs:

```bash
rsync -az --delete packages/web/dist/ root@VPS:/opt/petdate/packages/web/dist/
```

That **replaces the entire live web bundle** with whatever that agent built from **its** branch. An older branch does not contain later fixes (logo package, Telegram login, explore removal, newsletter, …), so the site looks like it “went back”.

Same risk for `packages/api/dist` and `packages/bot/dist` when an agent restarts pm2 from an incomplete tree.

## Canonical brand logos

| Role | Path |
|------|------|
| **Source of truth** | `packages/web/public/pepito/img/logo.png` |
| Footer light | `packages/web/public/pepito/img/logo-light.png` |
| PWA / favicon / apple-touch / brand marks | regenerate with `packages/web/scripts/generate-brand-assets.py` from the pepito logo |

Do **not** invent a new mark for PWA icons. Always derive from pepito.

## Rule for agents

1. **One integration line** for production: merge (or cherry-pick) onto the current stabilize/integration branch before deploy.
2. **Never** deploy an old feature branch’s `web/dist` after newer work has already gone live unless that branch includes those commits.
3. Prefer deploying **current workspace** after pulling all needed fixes, not a random historical branch.
4. After icon changes: rebuild web, hard-refresh / clear PWA cache (service worker caches old icons).

## Live paths on VPS

- Web: `/opt/petdate/packages/web/dist` (nginx root)
- API/Bot: `/opt/petdate/packages/{api,bot}/dist` + `pm2 restart petdate-api petdate-bot`
