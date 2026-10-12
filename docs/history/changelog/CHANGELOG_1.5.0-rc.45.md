# AZRAIL 1.5.0-rc.45

## Stage 31 — Production Approval Gate

- Added `verification/production-approval-contract.json` and read-only approval baseline snapshot.
- Added `production:approval:check`, `production:approval:plan`, and fail-closed `production:approval:authorize`.
- Approval is local evidence only; no GitHub/Cloudflare/Canva mutation is performed.
- Approval requires exact-release Node24, staging migration/deploy/smoke/security, disposable-cloud restore proof, canonical UI build, explicit production OIDC identity, reviewed production deployment lease, preview policy, and exact owner phrase.
- Approval receipt binds SHA-256 of upstream evidence, `SOURCE_MANIFEST.json`, package lock, reviewed GitHub main SHA, staging deployment, and production deployment lease.
- Approval expires after 24 hours and is invalidated by source/base/deployment drift.
- Release package creation now requires a valid `APPROVED_FOR_GITHUB_PR` receipt and matching approved source manifest.
- Added production approval architecture gate to static quality, Node24 suite, and release preflight.
- No GitHub branch/PR/push, Cloudflare mutation, production write, or Canva edit was performed.
