# AZRAIL 1.5.0-rc.28 — Stage 14 Professional Web Studio

- Replaced the Web Studio mission form with a professional six-tab workbench: Files, Preview, Changes, Tests, Logs and Versions.
- Added `src/lib/web-workbench.ts` and `/api/projects/:id/workbench` routes for bounded project workspace operations.
- Added create/update/rename/move/search/read workflows with optimistic `expectedSha256` fencing.
- Added exact-payload Unified Approval for file delete and snapshot restore.
- Added immutable `workspace_snapshots` through `migrations/021-web-studio-workbench.sql`.
- Implemented non-destructive snapshot restore and per-file revert by publishing a new immutable workspace revision.
- Added CSP-isolated, network-disabled static preview with desktop/tablet/mobile modes, runtime state and captured console/errors.
- Added verification and log views grounded in Unified Event Stream instead of fabricated status.
- Added `web:check`, release-preflight invariants and a dedicated static Quality Gate entry.
- Used Canva only as a read-only visual reference; no GitHub, Cloudflare or Canva mutation was performed.
