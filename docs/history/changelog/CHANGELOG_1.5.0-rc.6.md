# AZRAIL PULSE Unified 1.5.0-rc.6

RC6 is a local review candidate. No GitHub publication/commit and no Cloudflare deployment or configuration mutation were performed in this pass.

## Fixed

- Upload ownership is now fail-consistent across R2 and D1. If the object was stored but the `resource_owners` write fails, the unpublished R2 object is deleted best-effort and the upload request fails instead of returning an unusable orphan.
- A supplied malformed `projectId` on `/api/upload` is rejected with 400 instead of silently falling back to the account inbox project.
- Large text attachments no longer materialize the full R2 object in Worker memory. Files above the 256 KiB prompt budget use an R2 ranged read and preserve the original object size in diagnostics.
- `publishWorkspace()` now removes every staged R2 object when a file write or the D1 `workspace_heads` flip fails. A failed publish can no longer accumulate unreachable workspace-version trees.
- `withProjectLock()` no longer turns a successful protected operation into a retryable client failure merely because lock deletion failed afterward. The success is preserved and the cleanup failure is logged.
- The mission reaper now removes locks owned by missions it just transitioned to terminal state, and also reclaims non-mission orphan locks older than one hour while preserving active mission leases.
- OIDC discovery and token exchange now reject redirects and cap JSON responses at 256 KiB. This prevents a 307/308 redirect from carrying an authorization code or client secret to an unvalidated target and prevents oversized discovery/token payloads from being materialized without a bound.
- Studio capabilities now report the actual auth mode instead of hard-coding `oidc`.
- Non-operator Studio users no longer receive platform-wide request-budget aggregates from `/api/studio/ledger`; they see only model cost history belonging to their projects.

## Validation added

- `tests/rc6-hardening.test.ts` covers unpublished workspace cleanup, lock-release semantics, stale-lock recovery, bounded R2 attachment reads, upload ownership cleanup/malformed project IDs, and OIDC redirect denial.
- Local targeted runtime harness: **7/7 PASS** against the modified RC6 code.

## Release status

RC6 is **not production-ready yet**. The isolated environment still does not provide the project dependency tree, so fresh passes for `npm ci`, semantic project typecheck, the complete Vitest suite, and Wrangler staging/production dry-runs are still mandatory before publication or deployment.
