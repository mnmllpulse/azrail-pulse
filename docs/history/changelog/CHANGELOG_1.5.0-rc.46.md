# AZRAIL 1.5.0-rc.46

## Stage 32 — GitHub PR Preparation

- Added `verification/github-pr-contract.json`, read-only GitHub/Cloudflare/Canva snapshot, PR evidence template, and `docs/runbooks/GITHUB_PR_RU.md`.
- Added `github:pr:check`, `github:pr:plan`, and local-only `github:pr:ticket`.
- PR publication is fail-closed behind a valid unexpired `APPROVED_FOR_GITHUB_PR` receipt, exact `SOURCE_MANIFEST` SHA-256, exact reviewed `main` SHA, and an explicit separate GitHub mutation unlock.
- Added exact source-manifest verification via `source:manifest:check`; CI and Node24 suite now require it.
- Hardened `.github/workflows/check.yml`: checkout credentials are not persisted, Node comes from `.nvmrc`, repository permissions are read-only, and CI runs source-manifest integrity, static quality, and the canonical Node24 suite.
- Production deploy workflow remains disabled before Stage D #38.
- Captured current GitHub reality: `main` is still `a8adecf...`, `.github` is absent on `main`, old PR #12 is not reusable as RC46 release proof, and its historical Verify run failed.
- Added workflow-publication safety: future publication must block rather than silently omit `.github/workflows` if credentials cannot write workflow files.
- Added GitHub PR preparation and source-manifest integrity to the static Quality Gate; GitHub PR preparation is also in the Node24 suite and release preflight.
- No GitHub branch/commit/push/PR/merge, Cloudflare mutation, production write, or Canva edit was performed.
