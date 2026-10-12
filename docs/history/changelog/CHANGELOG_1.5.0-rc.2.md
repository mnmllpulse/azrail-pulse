# AZRAIL PULSE Unified 1.5.0-rc.2

Local-only release candidate. Do not publish or deploy until repeated verification is complete.

## Fixes after RC1 audit
- Corrected release documentation that still presented 1.4.0 as the current build.
- Regenerated the source manifest; RC1 manifest was stale and could not prove archive integrity.
- CI verification now checks both explicit staging and production Worker configs.
- GitHub production deployment job is intentionally disabled in this local RC.
- All direct deploy npm commands are intentionally disabled during ZIP verification.
- Added a mission-recovery safety gate: a mission waiting on an approval-required connector action cannot be resumed until that exact prepared connector call is recorded as `succeeded`.
- Added a regression assertion for the approval/recovery gate.

## Verification status
- Release preflight: executed locally.
- JSON / archive structure / manifest integrity: executed locally.
- Dependency installation: blocked in the current execution environment by npm registry timeout; this is recorded, not treated as a source-code pass or failure.
- TypeScript / Vitest / Wrangler dry-runs: pending a dependency-capable verification environment.

## Deployment policy
No GitHub merge, GitHub deployment, staging deployment, or production deployment is part of this RC.
