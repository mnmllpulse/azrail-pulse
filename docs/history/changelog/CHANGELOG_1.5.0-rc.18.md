# AZRAIL PULSE 1.5.0-rc.18

## Stage 4 — Canonical Configuration + Clean Release Package

- added `config/environments.json` as the single Cloudflare environment source of truth;
- `wrangler.staging.json` and `wrangler.production.json` are now deterministic generated artifacts;
- removed active duplicate configs (`wrangler.json`, paid/free deploy templates, old free TOML example);
- archived legacy config copies under `docs/archive/config-pre-RC18/`;
- provisioning/deploy scripts now require explicit `AZRAIL_TARGET_ENV=staging|production`;
- remote migrations no longer default to a generic Wrangler config;
- added `release-manifest.json`, clean release builder, SHA-256 release receipt and verifier;
- current operator docs updated to the canonical configuration model;
- no GitHub or Cloudflare mutations performed.
