# AZRAIL PULSE 1.5.0-rc.54

## Series E — Web Studio Intelligence (E17–E21)

- Upgraded project Design Contract to v2 with typography, grid, canonical breakpoints, component density, focus policy, interaction states, guided empty states and recoverable error states.
- Added backward normalization for legacy v1 design contracts.
- Added source-aware component scanning for React declarations and HTML `id` / `data-component` landmarks.
- Added a dedicated Layers panel exposing real source path + line mappings.
- Added Visual ↔ Code Inspect mode in sandboxed Preview and scoped `Edit with AZRAIL` actions against the real source file.
- Replaced generic desktop/tablet/mobile preview with canonical 1440 / 1024 / 768 / 390 px responsive canvases.
- Added in-browser DOM QA for overflow, duplicate IDs, form labels, image alt, accessible names, touch targets, heading order, contrast, console errors and CSP-blocked requests.
- Added backend validation and Event Stream persistence for Browser QA reports; score is recomputed from findings server-side.
- Added mandatory `series:e:web` static gate and strengthened `web:check`.
- GitHub, Cloudflare and Canva were inspected read-only only. No branch, push, PR, deploy, migration or production mutation was performed.
