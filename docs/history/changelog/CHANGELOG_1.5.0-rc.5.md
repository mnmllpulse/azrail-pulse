# AZRAIL PULSE Unified 1.5.0-rc.5

Release-candidate hardening pass focused on delivery atomicity, uncertain external outcomes, monetary reconciliation and OIDC/SSRF boundaries.

## Fixed / hardened

- **Mission outbox poison-message quarantine.** Persisted outbox payloads are now checked against the mission/project row and bounded before Orchestrator dispatch. A corrupt or cross-project payload is failed/quarantined instead of being retried forever or delivered to the wrong project.
- **Hierarchical model-call reservation provenance.** Every strict metering reservation is persisted in `model_call_budget_scopes`, so uncertain/unpriced calls can be reconciled across all budget scopes instead of guessing from the single legacy `model_calls.scope` field.
- **Explicit model-call reconciliation.** Added fail-closed operator reconciliation for `uncertain` / `unpriced` calls with evidence, exact-once budget adjustment and double-reconciliation protection.
- **Connector outcome reconciliation.** Added an explicit reconciliation path for uncertain external writes: `succeeded`, `failed`, or `not_executed`, with an audit row and idempotent resource-ledger settlement. Unknown remote outcomes are never auto-retried.
- **Shared trusted HTTPS endpoint boundary.** MCP/OAuth and OIDC endpoint validation now share one HTTPS-only SSRF boundary that rejects localhost, numeric/IP-like hosts, credentials, fragments, non-443 custom ports and reserved local suffixes.
- **OIDC session cap.** Successful OIDC login keeps at most the ten newest server-side sessions per account.
- **Migration 010.** Adds `model_call_budget_scopes` and `connector_reconciliations`, plus indexes and migration/preflight coverage.
- **Release preflight correctness.** Moved the preflight failure handler before migration assertions so a broken schema reports a deterministic PRECHECK failure instead of a temporal-dead-zone exception.
- **Admin billing visibility.** `/api/admin/billing` exposes unresolved model calls and supports explicit reconciliation with evidence.

## Verification performed locally

- release preflight: PASS
- package/package-lock version consistency: PASS
- TypeScript syntax transpile: 172/172, 0 syntax errors
- relative import resolution: 558 specifiers, 0 missing
- JSON/JSONC parse: 42/42
- YAML parse: 2/2
- Node `.mjs` syntax: 7/7
- shell syntax: PASS
- schema parse + migration 010 idempotent reapply: PASS
- filtered production secret scan: 132 files, 0 real findings
- targeted runtime harnesses: PASS for poisoned outbox, hierarchical billing reconciliation, connector `not_executed` reconciliation and trusted endpoint rejection/acceptance

## Not claimed as reproduced

The isolated environment did not complete dependency installation, so RC5 does **not** claim fresh passes for `npm ci`, semantic project typecheck, the complete Vitest suite, or Wrangler staging/production dry-runs. Those remain mandatory before production.

## Release safety

No GitHub publication/commit and no Cloudflare deployment/configuration mutation were performed for RC5. Production deployment remains intentionally blocked until production OIDC issuer/client provenance and full dependency-enabled CI are verified.
