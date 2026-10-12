# AZRAIL PULSE 1.5.0-rc.19

Stage 5 — Quality Gate hardening.

## Added

- unified repository Quality Gate with machine-readable `.work/quality-gate.json`;
- `npm run quality:static` for dependency-free release checks;
- `npm run quality` for the complete Node 24 verification pipeline;
- explicit `VERIFIED`, `UNVERIFIED`, `BLOCKED`, `FAILED` quality states;
- source hygiene lint and format checks without network dependencies;
- static secret/interlock security gate;
- runtime mission `quality` evidence on TaskResult;
- terminal mission status `unverified` so missing verification is never shown as green completion.

## Changed

- `completed` is now reserved for a `done` result whose quality status is `verified`;
- code changes with failing executable verification become `FAILED`;
- code changes whose executable verification cannot run become `UNVERIFIED` rather than `Completed`;
- mission UI distinguishes verified completion from unverified completion;
- recovery rejects every terminal mission, including `unverified`;
- stale mission lock cleanup treats `unverified` as terminal.

## Release safety

No GitHub push, Cloudflare deployment, remote migration, KV/R2 mutation, or production configuration change is performed by this stage.
