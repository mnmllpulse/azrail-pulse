# AZRAIL 1.5.0-rc.62

## Series G — G01–G10 System Intelligence

- Added context-ranked cross-studio Suggestion Engine and durable suggestion feedback.
- Unified Global Memory inspector with scope, TTL, source, confidence and storage reason.
- Extended Asset Intelligence with version/analysis/usage evidence through additive sidecars.
- Expanded Ctrl/Cmd+K Command Palette with memory, system history and G09/G10 readiness.
- Added unified immutable System History with fail-closed undo contracts.
- Reused existing Connector Gateway, Resource Ledger 2.0 and Mission Graph foundations instead of duplicating them.
- Added explicit Browser QA truth boundary: static preview QA is not real-browser evidence.
- Added real Chromium/CDP live E2E runner that is BLOCKED without live URL + authenticated credential.
- Added additive-only migration `035-series-g-system-intelligence.sql` with no ALTER/UPDATE/DELETE.
- GitHub, Cloudflare and Canva remain mutation-free for this local RC.
