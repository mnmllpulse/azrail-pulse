# AZRAIL 1.5.0-rc.63 deployment gate

> **Release candidate / local hardening only.** GitHub push, Cloudflare deployment and production migration remain locked until explicit human approval.

Canonical sources:

- `package.json` — release version;
- `wrangler.staging.json` — staging;
- `wrangler.production.json` — production;
- `config/environments.json` — canonical source of truth for both generated configs;
- `docs/runbooks/MIGRATIONS_RU.md` — migration ledger and planner;
- `docs/current/RELEASE_STATUS_RU.md` — release status.

Required verification environment: **Node.js >=24**. The full gate is `npm ci`, version/docs/migration checks, release preflight, read-only Cloudflare drift gate, type/tests/build checks, and both Worker dry-runs.

Migration planning is inspection-only by default. Remote apply requires both `--apply` and `AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND`, starts with a D1 export, and must be rehearsed on staging before production.

No command in this document authorizes an automatic production deployment.

## Database schema

`schema.sql` is the canonical current schema. On a clean D1 database `scripts/migrate.mjs` bootstraps it with `wrangler d1 execute AZRAIL_D1 --file schema.sql`; existing databases are upgraded through `migrations/*.sql` via the `db:migrate:*` plan/apply commands. Never run d1 execute against staging/production without the explicit approval flow below.

## RC39 staging migration preparation

Local/read-only only:

```sh
npm run staging:migration:check
npm run staging:migration:simulate
```

Remote staging apply stays locked until a Node24 VERIFIED receipt for the exact RC and explicit Cloudflare mutation approval are both present.


## Staging deploy preparation

Before any staging Worker write, run `npm run staging:deploy:check` and `npm run staging:deploy:plan`. The guarded `npm run deploy:staging:apply` requires exact-release Node24 verification, an APPLIED staging migration receipt, canonical UI build proof, explicit cloud mutation approval, exact release approval, and the reviewed previous staging deployment lease. No production write is implied.


## Staging smoke preparation / RC41

Safe local/read-only preparation:

```sh
npm run staging:smoke:check
npm run staging:smoke:simulate
npm run staging:smoke:plan
```

`staging:smoke:run` is intentionally blocked until the exact RC has a Node24 VERIFIED receipt, staging migration receipt, successful staging deploy receipt, a refreshed read-only post-deploy Cloudflare deployment identity, and a live credential supplied only through process environment. The smoke uses GET only and must see the exact RC in `/health.version`.

## RC42 security gate

Before any production approval, Stage D #33 requires an exact-release staging security receipt. Use `npm run security:verify:plan`; the real `security:verify:run` remains blocked until Node24, migration, deploy and staging-smoke receipts exist.


## RC43 production drift reconciliation

Production remains read-only/frozen. Use `npm run production:drift:check`, `npm run production:drift:simulate`, and `npm run production:drift:plan`. The current live schema requires migration 002 onward, but no production migration or Worker mutation is authorized by these commands. `production:drift:strict` is the future post-release ALIGNED gate.


## RC44 backup / restore proof

Stage D #35 adds mutation-free D1 Time Travel bookmark evidence plus a local production-compatible D1 SQL backup/restore drill and an R2 manifest/hash restore drill. Safe commands are `npm run backup:restore:check`, `npm run backup:restore:simulate`, and `npm run backup:restore:plan`. `backup:restore:strict` remains blocked until an explicitly authorized restore is proven in a disposable Cloudflare recovery environment. Live production restore is forbidden by the contract.


## RC46 — Production approval gate

Stage D #36 is fail-closed and local-only. `npm run production:approval:check` validates the contract; `npm run production:approval:plan` reports blockers. `production:approval:authorize` can emit a short-lived local approval receipt only after exact-release Node24/staging/security/restore evidence, verified production OIDC identity, an explicit preview policy, the reviewed production deployment lease, and the exact owner approval phrase. No GitHub, Cloudflare, Canva, or production mutation is performed by the approval command.

## GitHub main → Cloudflare staging

The repository includes `.github/workflows/staging-auto-deploy.yml`. After this source is actually published and the GitHub `staging` Environment contains `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `OIDC_CLIENT_SECRET`, a push to `main` runs the complete Node24 Verify job and only then executes the guarded `deploy:ci` path against **staging**. Production remains disabled and requires the separate Stage D #38 release path.

## OIDC admin groups

Web (OIDC) users are `editor` by default. An OIDC user becomes `admin` (can decide approvals, manage accounts/backups) only when the verified ID token carries a configured admin group:

| Var | Default | Meaning |
| --- | --- | --- |
| `OIDC_ADMIN_GROUPS` | `pulse-admins` | Comma-separated group names that grant admin. Set to an empty string to disable admin for OIDC entirely. |
| `OIDC_GROUPS_CLAIM` | `groups` | ID-token claim holding the groups. If that claim is absent, `roles` is checked. |

Fail closed: a missing, empty or non-array claim (or non-string entries) gives `editor`. The role is recomputed on every login (removing a user from the group takes effect at their next login; existing sessions last up to 12 h). Emptying `OIDC_ADMIN_GROUPS` downgrades all live OIDC sessions immediately. A manual `viewer` downgrade is kept. API-key accounts are unaffected; non-OIDC accounts never get admin through a web session.

The IdP must put the groups into the **ID token** (Cloudflare Access: enable the `groups` claim for the OIDC SaaS application). Both values live in `config/environments.json` → `vars` and are generated into `wrangler.*.json` by `npm run config:generate`.
