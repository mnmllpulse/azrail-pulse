# AZRAIL PULSE 1.5.0-rc.41 — Stage 27 / Staging Smoke Preparation

## Scope

Stage D #32 is prepared without deploying RC41 and without executing a real authenticated smoke against Cloudflare. GitHub, Cloudflare and Canva were used read-only only.

## Added

- `verification/staging-smoke-contract.json` — staging-only, GET-only smoke policy.
- `verification/staging-smoke-readonly-snapshot.json` — read-only pre-deploy baseline from Cloudflare.
- `scripts/check-staging-smoke-preparation.mjs` — validates target, workers.dev availability, deployment identity evidence, exact-release smoke markers and no-model policy.
- `scripts/staging-smoke-plan.mjs` — fail-closed plan that requires Node24, migration, deploy, post-deploy identity and live credential.
- `scripts/staging-smoke-run.mjs` — verified staging-only runner producing `.work/staging-smoke-verified.json` after prerequisites.
- `scripts/staging-smoke-simulate.mjs` — local positive and negative exact-release simulation.
- `docs/runbooks/STAGING_SMOKE_RU.md` — operator runbook.

## Hardened runtime smoke

`scripts/smoke.mjs` now:

- uses GET only;
- bounds each response body to 1 MB;
- never stores auth credential in receipt;
- checks public shell, auth boundary and direct-agent 404;
- validates authenticated identity;
- requires `/health.version` to equal the exact RC;
- requires D1/KV/R2 read round-trips and AI binding visibility;
- checks agent registry, routing policy, Studio capabilities, Pulse Lab, Ledger and Connections;
- rejects connector responses containing secret-like keys;
- writes `.work/runtime-smoke.json` with `VERIFIED` or `FAILED`.

## Deploy-to-smoke fencing

`staging-deploy-apply.mjs` now writes `.work/staging-deploy-applied.json` only after the future guarded deploy command returns success. The receipt records the reviewed previous deployment/version and explicitly requires a separate read-only post-deploy identity refresh. Smoke cannot accept the pre-deploy deployment as proof of RC41.

## Read-only Cloudflare evidence

At preparation time:

- Worker: `azrail-pulse-staging`;
- workers.dev: enabled;
- preview URLs: disabled;
- active deployment: `914363dc-2157-48a4-a28f-ac12fae38ef1`;
- active Worker version: `159daae0-edaf-4b7a-be85-3760974a5aa9` (version number 3);
- compatibility date: `2026-09-29`;
- handlers: `fetch`, `scheduled`.

This is explicitly a **pre-deploy baseline**, not evidence that RC41 is live.

## Verification

Local smoke simulation:

- positive exact-release case: `VERIFIED`;
- negative wrong-release case: `FAILED` on `health` as required.

Static quality gate:

- PASSED: 31
- FAILED: 0
- BLOCKED: 0
- result: `VERIFIED`

Full quality gate:

- PASSED: 31
- FAILED: 0
- BLOCKED: 5
- result: `BLOCKED`

Blocked full gates remain TypeScript full check, canonical UI build, Vitest, Wrangler dry-run under the required Node24 environment, plus authenticated runtime smoke.

Current runtime is Node `22.16.0`; the repository contract remains Node >=24.

## Mutation status

No GitHub commit/push/branch/PR/merge, no Cloudflare deployment or D1/KV/R2 mutation, and no Canva edit were performed.
