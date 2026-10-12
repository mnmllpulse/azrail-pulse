# AZRAIL × MNMLL PULSE OS — Unified 1.5.0-rc.63

AZRAIL PULSE is a Cloudflare-first multi-agent platform with project workspaces, studios, approval controls, durable event/recovery state, OIDC access, staging/production separation, and fail-closed release tooling.

This repository is the **full audited source archive**: active runtime plus non-runtime history/legacy material kept for traceability. Runtime/deploy packaging still excludes historical/reference material. Historical audits and old release evidence are no longer scattered across the root; current code, current operator documentation, verification contracts, and archived material are separated explicitly.

## Repository map

| Path | Purpose |
|---|---|
| `src/` | Worker runtime, agents, execution engine, storage, auth and APIs |
| `ui/` | Current Unified UI source and lazy studio modules |
| `public/` | Static/legacy-compatible public surfaces still used by the Worker |
| `site/` | Generated Cloudflare asset bundle used by the current build flow |
| `migrations/` | Ordered D1 migrations (`002` → current) |
| `config/` | Canonical environment model; generated Wrangler configs derive from it |
| `scripts/` | Quality, security, migration, staging, release and packaging tooling |
| `tests/` | Regression and architecture tests |
| `verification/` | Current release/security contracts and current RC evidence |
| `docs/current/` | Current operational truth |
| `docs/runbooks/` | Operator/release procedures |
| `docs/product/` | Product architecture/specification/branding source documents |
| `docs/releases/` | Current release changelog |

See [`docs/product/README.md`](docs/product/README.md) and [`docs/current/REPO_LAYOUT_RU.md`](docs/current/REPO_LAYOUT_RU.md).

## Current product surface

The current Unified UI exposes separate pages for Web, Image, Music, Video, Audio, Ableton, Data, Ledger and Pulse studios, plus Metatron Agent Operations Center and Settings / Connections. The globe has been removed. Projects, attachments, approval receipts, event replay, observability correlation, project ownership, connector health, workspace snapshots, budgets and release evidence are wired into the Worker architecture.

The event stream now has a SHA-256 tamper-evident integrity sidecar (`event_integrity`) for newly written events. Forks are rejected by a unique predecessor constraint and writers retry against the new durable head.

## Local verification

**Canonical release runtime: Node.js 24.18.0.**

```sh
npm ci
npm run repo:exhaustive
npm run repo:hygiene
npm run quality:static
npm run node24:suite
npm run build:check
```

`npm run quality:static` is intentionally dependency-light and verifies architecture/contracts without changing GitHub or Cloudflare. `node24:suite` is the canonical dependency-backed verification and must run under Node 24 with `npm ci` completed.

The package includes `.nvmrc` and `.node-version` pinned to Node `24.18.0`.

## Release safety

Future `main` pushes are wired to **automatic Cloudflare staging deployment only after the complete Verify job succeeds**. Production writes are not automatic.

- `.github/workflows/staging-auto-deploy.yml` verifies under Node 24, then deploys only the `staging` environment;
- generic `deploy`, direct schema writes and direct production deploy scripts are disabled;
- staging migration/deploy, GitHub PR publication and production release each have separate fail-closed gates;
- production deployment requires verified Node24 evidence, staging evidence, security evidence, backup/restore evidence, production approval, a reviewed/merged GitHub PR and fresh Cloudflare/GitHub leases;
- migration/release tooling requires backup-before-mutation;
- production Time Travel restore is never automatic.

Operator entry points:

```sh
npm run release:preflight
npm run staging:migration:check
npm run staging:deploy:check
npm run staging:smoke:check
npm run security:verify:check
npm run production:drift:check
npm run backup:restore:check
npm run production:approval:check
npm run github:pr:check
npm run production:release:check
```

Read the runbooks before any remote mutation: [`DEPLOY_RU.md`](DEPLOY_RU.md) and [`docs/runbooks/`](docs/runbooks/).

## Environment truth

`config/environments.json` is the canonical source for staging/production configuration. `wrangler.staging.json` and `wrangler.production.json` are generated and verified from it.

Production OIDC identifiers are intentionally **not invented** in source. A production release remains blocked until the real production OIDC client/issuer and preview-access policy are explicitly verified.

## Historical material

Historical changelogs, previous RC receipts, old audits and legacy source snapshots remain in this Full Archive source package for traceability, but are excluded from the runtime/release bundle by `release-manifest.json`. Current operational truth lives only in `docs/current/`, `docs/runbooks/`, `docs/product/`, `docs/releases/` and `verification/`.

## Current status

See [`docs/current/RELEASE_STATUS_RU.md`](docs/current/RELEASE_STATUS_RU.md) and [`docs/current/REPOSITORY_AUDIT_RU.md`](docs/current/REPOSITORY_AUDIT_RU.md).

This RC is a **future-repository source package**, not a production release. GitHub/Cloudflare/Canva were only read during preparation; no remote mutation was performed. Once this source is actually published to GitHub and the `staging` GitHub Environment secrets are configured, a successful `main` CI run can deploy staging automatically.
