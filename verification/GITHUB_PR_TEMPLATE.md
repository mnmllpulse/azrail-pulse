# AZRAIL PULSE 1.5.0-rc.51 — Release PR

## Release identity

- Release: `1.5.0-rc.51`
- Base branch: `main`
- Approved base SHA: `<FROM_PRODUCTION_APPROVAL_RECEIPT>`
- SOURCE_MANIFEST SHA-256: `<FROM_PRODUCTION_APPROVAL_RECEIPT>`
- Production approval ID: `<FROM_PRODUCTION_APPROVAL_RECEIPT>`
- Approval expires: `<FROM_PRODUCTION_APPROVAL_RECEIPT>`

## Mandatory evidence

- [ ] Exact approved `SOURCE_MANIFEST.json` is present and `npm run source:manifest:check` passes.
- [ ] `npm run quality:static` passes on the PR head.
- [ ] `npm run node24:suite` passes on Node 24 from `.nvmrc`.
- [ ] GitHub Actions `Verify` run on the exact PR head concludes `success`.
- [ ] `.github/workflows/check.yml` and `.github/workflows/deploy.yml` are present in the PR tree.
- [ ] Production deploy workflow remains disabled in this RC.
- [ ] PR base SHA still matches the unexpired production approval lease.
- [ ] No production deployment is performed by this PR.

## Release boundaries

Stage D #37 publishes and verifies the GitHub PR only. Stage D #38 is the separate production release action. Merge or production release is forbidden when CI is missing/failed, the approval expired, the base moved, the source manifest changed, or workflow files were omitted.
