# Git-connected azrail-pulse deployment

The root `wrangler.jsonc` is generated from the `pulse` environment in
`config/environments.json`. It deploys the free backend and `site/` assets to
`azrail-pulse`, with dedicated D1, KV and R2 resources. Existing staging and
The paid production config resources are not shared or modified.

Cloudflare Workers Builds settings:

- Build command: `npm run build`
- Deploy command: `node node_modules/wrangler/bin/wrangler.js deploy --config wrangler.jsonc`
- Root directory: `/`

Use the lockfile-installed Wrangler. Do not let auto-configuration publish the
repository root as static assets or install different dependencies during deployment.

For an initial empty database, inspect `node scripts/migrate.mjs --remote --config
wrangler.jsonc`, then apply with `--apply` and the documented cloud mutation
interlock after owner approval. Never bootstrap the old production database.

Authorization uses the existing token mode. Set `AZRAIL_TOKEN` as an encrypted
Worker secret in Cloudflare, never in Git or chat. Until configured, protected
API operations intentionally remain unavailable. A successful deployment is not
proof that AI providers, external connectors or all studios are configured.
