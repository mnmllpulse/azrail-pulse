# AZRAIL PULSE 1.5.0-rc.55

## Series E — completion architecture (E22–E40)

- Added provider-neutral `SpeechToTextAdapter` and a real voice lifecycle: recording, pause, resume, transcribe, editable transcript, retry and cancel. Cancelled recordings are not submitted to the provider.
- Added persistent image job state (`queued/running/completed/failed/cancelled`) while preserving the existing idempotent image request flow and generation history.
- Added explicit Video pipeline/continuity/render-queue contracts without pretending unsupported cloud generation is already available.
- Added Music Intelligence primitives: Camelot mapping/neighbours, measured-metric energy score, reference profile, production brief, DAW import/stem separator adapters and an originality boundary.
- Added metadata-only Beatport reference storage. No unofficial track download path was added.
- Expanded Ledger resource-unit vocabulary for tokens, reasoning/cache, image/video/audio units, tool calls, browser runtime, container CPU, storage and bandwidth.
- Added Mission Dependency Graph validation with dependencies, parallel groups, retry limits, timeouts, resource requirements and cost estimate.
- Preserved the existing budget reservation, fencing-token, durable execution/recovery and uncertain-effect architecture instead of duplicating it.
- Hardened Sandbox policy with allowlisted egress, filesystem/process quotas and proxy-only secret policy.
- Added global Ctrl/Cmd+K Command Palette and strengthened the universal module contract.

## Series F/G — shared product-intelligence foundation

- Added hierarchical memory scopes and persistent `intelligence_memory` storage.
- Added `asset_intelligence` storage and automatic metadata/tag records for every newly saved Studio artifact.
- Added professional review persistence with Critical / Major / Minor / Improvement counts.
- Added universal Compare Mode contracts and UI component.
- Added Music reference metadata and production-brief routes.
- Added canonical English studio names with compact Russian descriptors: Web Studio, Image Studio, Music Studio, Video Studio, Pulse Lab, Ledger Studio, Data Studio, Ableton Lab, Audio Lab.
- Added migration `031-product-intelligence.sql` and source/schema integrity checks.

## Verification boundary

- GitHub, Cloudflare and Canva were used read-only for comparison. No push, PR, deploy, D1 migration, Cloudflare mutation or Canva edit was performed.
- Current local host is Node 22.16.0 while the release runtime remains Node 24.18.0. Dependency-backed TypeScript/build/test proof stays fail-closed until Node 24 + installed dependencies are available.
