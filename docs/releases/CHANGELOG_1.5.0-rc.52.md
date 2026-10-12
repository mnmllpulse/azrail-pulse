# AZRAIL PULSE 1.5.0-rc.52

## Series E — Product Intelligence Foundation

- Added contextual next-step suggestions to Chat and every Studio surface using deterministic, low-cost rules before any future LLM enrichment.
- Added Smart Empty States so Studio result areas explain what the user can do next instead of rendering an empty panel.
- Added a Universal Studio Toolbar with lifecycle state, Run/Stop, project History, Help, draft Undo/Redo and live model selection for mission-capable surfaces.
- Wired draft save/sync status and actual undo/redo history into the universal toolbar through a single UI event contract.
- Added a real Studio state machine (`IDLE`, `READY`, `RUNNING`, `PAUSED`, `CANCELLING`, `FAILED`, `COMPLETED`).
- `Stop` now aborts the current Studio operation through the existing `AbortController` boundary and reports a stopped state instead of pretending success.
- Added live Model Quick Switcher for mission-capable Studio surfaces using `/api/model-catalog`; `AUTO` remains the default router and manual selections are persisted per browser session.
- Selected model is now forwarded as `preferredModel` when a mission is created.
- Added `series:e:check` and made the Series E foundation contract a mandatory static quality gate.
- Added a universal `ModuleFrame` action contract with Collapse/Expand, Pin, Lock and Reset actions backed by real UI state; unsafe Duplicate/Delete actions remain capability-gated rather than decorative.
- Preserved the complete RC51 Full Archive history/legacy tree and moved RC51 verification evidence into `verification/history/rc/`.
- No GitHub, Cloudflare or Canva write was performed.

- Archived the exact 55-page Series E/F/G update scenario under `docs/product/SERIES_E_F_G_UPDATE_SCENARIO.pdf` for release traceability.
- Final local static quality gate: 48 passed / 0 failed / 0 blocked. Full dependency-backed gate remains blocked only by the Node22 host/runtime-smoke boundary.
