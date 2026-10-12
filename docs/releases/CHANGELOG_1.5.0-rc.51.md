# AZRAIL PULSE 1.5.0-rc.51

## Full Archive Edition

- Restored the complete audited repository tree, including `docs/history/`, `verification/history/`, and `references/legacy/`.
- Preserved all historical and legacy artifacts instead of dropping them from the downloadable package.
- Applied the RC50 hardening/refactoring set to the active runtime tree: bounded ZIP inspection, shared hardened GitHub transport, bounded external JSON fetches, concurrency caps, UI error/retry states, shared DOM helpers, HTML escaping, and video `ImageBitmap` disposal.
- Kept history/legacy material non-runtime while validating it for UTF-8, syntax/container integrity, JSON/JSONC/TOML/XML parsing, TypeScript parser health, Markdown links, case collisions, merge markers, and executable-stub markers.
- Current GitHub/Cloudflare production mutation remains fail-closed; the archive is prepared for GitHub CI under Node 24.18.0, but the local host is Node 22.16.0.
