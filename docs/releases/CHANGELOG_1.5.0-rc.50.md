# AZRAIL PULSE 1.5.0-rc.50

## Deep audit / architecture hardening

- Replaced DeployAgent whole-archive `unzipSync` with bounded ZIP central-directory inspection via `zip-reader`, compressed/uncompressed caps, unsafe-entry rejection, and canonical `wrangler.staging.json` / `wrangler.production.json` checks.
- Added shared `src/services/github-client.ts`: finite timeout, redirect rejection, bounded error-body reads; Git/QA/Deploy agents now reuse it.
- Added bounded external JSON transport and concurrency limiting for npm freshness and OSV vulnerability lookups.
- Fixed Video Studio preview ImageBitmap lifecycle leak; previews now release GPU/image resources on restart and unmount.
- Added shared UI DOM/panel-state components and visible retry states for Image/Music/Video/Data history failures instead of swallowing load errors.
- Hardened Web Workbench snapshot-label HTML escaping.
- Added `repo:deep` architectural regression gate and integrated it into static quality verification.
- Final GitHub source package excludes historical/reference evidence from runtime repository while preserving current docs, tests, verification contracts, CI workflows and deployment configs.

## Verification boundary

Static/source verification is reproducible locally. Dependency-backed Node24 typecheck/build/Vitest/Wrangler dry-run and authenticated runtime smoke remain fail-closed gates and must run in GitHub CI under Node 24.18.0 before staging deployment.
