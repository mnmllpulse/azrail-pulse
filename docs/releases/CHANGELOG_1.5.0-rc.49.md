# AZRAIL PULSE 1.5.0-rc.49

## Repository-wide audit and GitHub → Cloudflare staging automation

- Added `npm run repo:exhaustive`: scans every repository file and every decodable text line, including history and legacy snapshots.
- Added full-tree JSON/JSONC, YAML-structure, TOML, XML/SVG, JS, Python, shell, TS/TSX parser, Markdown-link, binary-container, import-resolution and placeholder checks.
- Fixed remaining historical broken links and stripped ANSI control characters from archived dry-run logs.
- Prevented repository checkers from creating Python cache artifacts.
- Added `.github/workflows/staging-auto-deploy.yml`: push-to-main verifies exact source under Node 24, then deploys **staging only** to Cloudflare through the guarded `deploy:ci` path.
- Hardened `deploy-ci`: exact environment targeting, canonical config validation, OIDC issuer/client validation, mandatory OIDC client secret for OIDC deployments, and target-name/OIDC consistency checks.
- Added `staging:auto-deploy:check` and integrated both new gates into static Quality Gate, Node24 suite and release preflight.
- Production auto-deploy remains intentionally disabled and production release remains Stage D #38 gated.
- No GitHub, Cloudflare, Canva, or Ads Manager mutation was performed while preparing this RC.
