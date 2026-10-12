# AZRAIL PULSE Unified 1.5.0-rc.17

## Stage 3 — Cloudflare Config Drift Detector

- Added mutation-free `scripts/cloud-drift.mjs`.
- Added checked read-only Cloudflare snapshot format with explicit `mutation_free` marker.
- Compares staging/production Worker identity, compatibility date/flags, bindings, crons, vars and resource identities.
- Adds policy gates for OIDC, strict origins, metering enforce, unified ledger and wildcard CORS.
- Adds snapshot freshness guard and machine-readable JSON report.
- Staging and production can be evaluated independently.
- Detector never mutates Cloudflare and does not contain deployment logic.
- Current production drift remains intentionally unresolved until an approved production change window.
