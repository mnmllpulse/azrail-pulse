# AZRAIL PULSE 1.5.0-rc.59

## Series F · F41–F60 · Video Studio 2.0

- Added Project Storyboard, Shot List, editable Scene Cards and bounded Timeline Editor.
- Added Asset Library and local-only Reference Video Board (up to 4 references).
- Added per-shot prompt suggestions and shot-level routing intent (`AUTO` / local proxy) without prematurely wiring the deferred AI video model catalog.
- Added Continuity Memory for character, clothing, lighting, location, camera language, props and color palette.
- Added pan/tilt/dolly/zoom/orbit camera controls plus start/end keyframes.
- Added transition editor, voice-over, music and SFX tracks, script-derived automatic captions and color grading.
- Added local Render Queue, low-resolution Proxy Preview, deterministic Video QA checks and export profiles including explicit 4K master intent.
- Added migration `033-video-studio-2.sql` with durable `video_storyboards` state.
- Cloudflare Stream/Media and provider-grade video generation remain explicitly unbound/fail-closed until the Model Registry/provider phase.
- No GitHub, Cloudflare, or Canva remote mutation was performed for this local checkpoint.
