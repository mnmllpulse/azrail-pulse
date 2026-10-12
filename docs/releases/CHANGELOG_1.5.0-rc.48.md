# AZRAIL PULSE 1.5.0-rc.48 — Clean GitHub Repository Package

RC48 is a repository-hygiene and integrity hardening release candidate. It does **not** deploy GitHub, Cloudflare or Canva changes.

## Repository structure

- Root release-history clutter was removed from the top level.
- Historical RC changelogs moved to `docs/history/changelog/`.
- Historical verification receipts moved to `verification/history/rc/`.
- Product architecture/specification/branding moved to `docs/product/`.
- Old audits, pre-hardening deployment notes and exported verification material moved under `docs/history/`.
- Legacy source/reference snapshots moved under `references/legacy/`.
- Obsolete `push-to-github.sh` was removed. GitHub publication is now represented only by the approval-gated PR workflow.
- Added `docs/current/REPO_LAYOUT_RU.md` and a repository-wide hygiene gate.

## Repository audit

`npm run repo:hygiene` now inventories every repository file outside transient directories and checks root layout, junk files, UTF-8, JSON parsing, active JavaScript syntax, shell/Python syntax, TypeScript parser diagnostics, active documentation links and executable implementation stubs. Exact duplicate groups are reported separately rather than silently deleted.

## Event integrity

Added migration `030-event-integrity-chain.sql` and the `event_integrity` sidecar. New unified events are chained with SHA-256 per deterministic scope. A unique `(scope, prev_hash)` constraint rejects forks; concurrent writers retry from the new durable head. `verifyEventIntegrityScope()` recomputes and validates the chain.

## Security hardening

- CSP stylesheet policy is narrowed to `style-src 'self'`; required inline style attributes are isolated under `style-src-attr 'unsafe-inline'`.
- Security preparation now treats event-chain integrity as a required check rather than an accepted gap.
- GitHub Verify workflow runs a registry dependency audit under the pinned Node 24 runtime.

## Migration truth

Current migration range is now `002` through `030`.

- staging legacy baseline: migration 002 is baselined, then 003–030 are additive;
- production legacy schema: 002–030 are applied;
- backup/restore recovery simulation: restore first, then 002–030;
- additive re-application simulations cover 003–030.

## Truth boundary

The local host available while building RC48 is Node 22.16.0. The canonical release runtime remains Node 24.18.0, so the dependency-backed Node24 suite, canonical Wrangler builds and Vitest are not claimed as complete here. Those remain fail-closed prerequisites for staging/release.

No GitHub branch/commit/PR, Cloudflare migration/deploy/write, or Canva edit was performed while preparing RC48.
