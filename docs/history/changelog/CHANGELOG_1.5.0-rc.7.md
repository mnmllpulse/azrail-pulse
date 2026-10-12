# AZRAIL PULSE Unified 1.5.0-rc.7

RC7 is a local review candidate. No GitHub publication/commit and no Cloudflare deployment or configuration mutation were performed in this pass.

## Fixed

- Workspace publication no longer deletes a newly published R2 tree when the D1 head flip committed but its response was lost. The failure path now re-reads `workspace_heads` and only removes staged objects when D1 proves the new prefix is not live.
- Added a shared R2 consistency helper that preserves data when publication state cannot be proven. Ambiguous D1 outcomes now prefer a recoverable orphan over deleting possibly referenced data.
- Partial backups and pre-mission snapshots are cleaned up when copying fails before publication. If the final D1 publication call is ambiguous, cleanup is gated by a reference check.
- Code Agent and UI Agent version artifacts no longer silently accumulate unreachable R2 objects after D1 versioning failures. Their object keys also include UUIDs to prevent same-millisecond collisions.
- Model timeout handling was moved inside the metering boundary. A provider call that exceeds its deadline is persisted as `uncertain` instead of remaining indefinitely `running`.
- A model timeout no longer triggers an automatic retry or fallback to another model because `env.AI.run` cannot be cancelled by the outer `Promise.race`; the original provider request may still complete and charge.
- Backup restore now bounds the manifest body, validates every file record, and rejects duplicate paths/keys before reading payload objects.
- Version restore now budgets by R2 byte metadata instead of JavaScript string length, rejects metadata drift during the read, and does not materialize a single object larger than the restore memory ceiling.

## Validation added

- `tests/rc7-hardening.test.ts` covers workspace publication response-loss semantics, partial backup/snapshot cleanup, no-retry model timeout behavior, and metered timeout transition to `uncertain`.
- Release preflight now checks that timeout/fallback and R2 publication hardening remain present.

## Release status

RC7 is **not production-ready yet**. Fresh `npm ci`, semantic project typecheck, the full Vitest suite, Wrangler staging/production dry-runs, and disposable staging migration/smoke remain mandatory before publication or deployment.
