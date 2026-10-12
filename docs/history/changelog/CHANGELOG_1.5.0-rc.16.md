# AZRAIL 1.5.0-rc.16

## Stage 2 — Documentation Truth + Migration Ledger

- release candidate bumped from rc.15 to rc.16 because source changed;
- canonical current/runbook/archive documentation hierarchy added;
- stale root deployment instructions archived and replaced with safe RC16 operator docs;
- `schema_migrations` ledger added to canonical schema and migration 016;
- migration planner now computes SHA-256 per numbered migration;
- changed checksum for an already-applied migration is a hard blocker;
- `.work/migration-plan.json` added beside the reviewable SQL plan;
- apply is sequential and records filename/checksum/operator/duration/status;
- migration 002 can be safely legacy-baselined when `result_json` already exists;
- clean databases bootstrap from `schema.sql` and register current checksums;
- D1 export remains mandatory before apply; remote backup is copied to private environment R2;
- static `docs:check` and `migrations:check` gates added;
- no GitHub or Cloudflare mutation performed.

## Verification

- version/docs/migration static gates: PASS;
- release preflight: PASS (production OIDC warning remains release-blocking);
- local legacy migration planner fixture: PASS;
- read-only planning behavior: PASS;
- checksum tamper blocker: PASS;
- full Node 24 dependency/type/test/dry-run suite: pending.
