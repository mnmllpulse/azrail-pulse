# AZRAIL PULSE 1.5.0-rc.15

RC15 completes the eight-point hardening pass requested after RC14. No GitHub write, Cloudflare mutation, migration apply, or deployment is performed by this package.

## 1. Mission delivery lease

Added `mission_delivery_leases`, a bounded D1 scheduler lease keyed by mission and delivery generation. A current generation can have only one live scheduler claim. Expired claims are reclaimable; stale claims cannot acknowledge a newer scheduler.

## 2. Concurrent dispatcher race hardening

`Orchestrator.startMission()` now obtains the D1 delivery lease before creating a Durable Object schedule. Ambiguous `schedule()` failures retain the lease until TTL expiry instead of immediately allowing a duplicate schedule. Expired delivery leases are reaped.

## 3. Immutable workspace publication contract

Added `workspace_publications`. Every new versioned workspace head is paired with immutable provenance containing parent prefix, SHA-256 manifest, file count, byte count, lease id, fencing token, and publication time. `workspacePrefix()` rejects versioned heads without provenance. Publication takes a byte snapshot before the first await and publishes provenance plus the head under the current fencing lease.

## 4. R2 legacy reference completeness

The read-only R2 GC preview now protects the immutable workspace publication registry and conservative legacy project namespaces (`workspace`, `versions`, `code`, `ui`, `snapshots`, `snapshots-v2`) for known projects. GC remains preview-only and fail-closed.

## 5. Retention invariants

Retention candidates are interleaved per project/account rather than allowing one owner to dominate a bounded result. Cross-project/cross-account R2 keys are rejected from deletion candidates and reported through `unsafeReferencesSkipped`.

## 6. Studio streaming and memory limits

Generic Studio artifact uploads no longer buffer the full 12 MiB request in Worker memory. They stream through a byte-counting `TransformStream` directly to R2, enforce declared and observed limits, and retain the existing R2↔D1 ambiguous-publication safety protocol.

## 7. Execution Engine decomposition preparation

Pure model-loop protocol code (`StepDecision`, `parseDecision`, `renderHistory`) moved into `src/core/execution-protocol.ts`. `execution-engine.ts` re-exports the public helpers, preserving callers while reducing the monolith without changing side-effect semantics.

## 8. Migration, regression and packaging contract

Added `migrations/015-delivery-lease-publication-contract.sql`, migration planner/preflight checks, RC15 regression tests, schema smoke/idempotency checks, final ZIP integrity checks, and a regenerated source manifest.

## Release status

RC15 is still a review candidate, not a production release. Full dependency-backed `npm ci`, `tsc`, Vitest, Wrangler dry-runs, and staging migration smoke remain mandatory on Node 24+ before any deployment.
