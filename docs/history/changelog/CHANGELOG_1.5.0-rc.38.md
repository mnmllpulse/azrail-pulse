# AZRAIL 1.5.0-rc.38 — Stage 24 / Node24 Verification Harness

- Добавлен reproducible Node24 verification contract для Stage D / пункта 29 master-сценария.
- Reference runtime закреплён в `.nvmrc` и `.node-version` как Node `24.18.0`.
- Добавлены `node24:env`, `node24:check`, `node24:suite`, `node24:suite:install`.
- `node24:suite:install` выполняет `npm ci` и затем version/docs/migrations/config/lint/format/security/typecheck/canonical UI build/Vitest/Wrangler staging+production dry-run/release-preflight.
- Suite пишет machine-readable receipt `.work/node24-suite.json` и fail-closed различает VERIFIED / BLOCKED / FAILED.
- Production `release:package` теперь требует VERIFIED Node24 receipt для точной текущей версии и Node >=24 в receipt.
- Добавлен static architecture gate `node24-verification-contract` и runbook `docs/runbooks/NODE24_VERIFICATION_RU.md`.
- В текущей изолированной среде Node24 binary/dependency tree недоступны, поэтому фактический full Node24 suite не объявлен пройденным; RC38 остаётся release-blocked.
- GitHub, Cloudflare и Canva использовались только read-only; remote mutations не выполнялись.
