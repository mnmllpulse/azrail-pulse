# AZRAIL PULSE 1.5.0-rc.42 — Stage 28 / Security Verification Preparation

## Scope

Stage D #33 is prepared locally/read-only. No GitHub push, Cloudflare deploy/migration/write, production mutation, or Canva edit was performed.

## Security hardening

- Removed permissive `CORS_ORIGIN || "*"` fallback. CORS now accepts only an exact clean HTTPS legacy origin, otherwise uses the first canonical `PUBLIC_ORIGINS` value, and falls back to `null` rather than wildcard.
- Added machine-readable `verification/security-permission-matrix.json`.
- Added deterministic SPDX 2.3 SBOM generation from `package-lock.json`.
- Added dependency-lock integrity verification that rejects insecure HTTP and git/ssh release dependencies.
- Preserved OIDC PKCE/state/nonce, server-side session revocation semantics, atomic quota enforcement, resource ownership, and Unified Approval boundaries as explicit security checks.

## Stage D #33 harness

Added:

- `verification/security-verification-contract.json`;
- `scripts/check-security-verification-preparation.mjs`;
- `scripts/security-verification-simulate.mjs`;
- `scripts/security-verification-plan.mjs`;
- `scripts/security-verification-run.mjs`;
- `docs/runbooks/SECURITY_VERIFICATION_RU.md`.

The future runtime verifier is staging-only, GET/OPTIONS-only, does not invoke models, and requires exact-release Node24/migration/deploy/smoke receipts before it can run.

## Truthful blockers

Two security items intentionally remain open:

1. the Unified Event Stream is durable but not yet cryptographically chained/signed;
2. a current dependency CVE audit has not been proven in the Node24 release environment.

Therefore Stage D #33 is **PREPARED / BLOCKED FOR REAL SECURITY VERIFICATION**, not production-verified.

## Verification results

- security preparation: 19 passed / 4 warnings / 0 failed;
- strict-CORS negative test: expected failure detected, then restored PASS;
- dependency lock: PASS, 365 locked entries, 0 warnings;
- SPDX SBOM: 365 npm packages;
- static quality gate: 34 passed / 0 failed / 0 blocked — VERIFIED;
- full quality gate: 34 passed / 0 failed / 5 blocked — BLOCKED;
- UI TypeScript: PASS;
- Node24 suite: BLOCKED under Node 22.16.0;
- real security runner: blocked before network by missing staging migration receipt;
- release package: blocked by non-VERIFIED Node24 receipt.
