# AZRAIL PULSE 1.5.0-rc.57

Local-only Series F Music Intelligence update. No GitHub/Cloudflare/Canva mutations were performed.

## F17 — DAW Project Import

- Added bounded `DAWImportAdapter` for DAWproject, Ableton `.als`, Ableton Project ZIP and generic project ZIP fallback.
- Added ZIP central-directory safety validation for entry count, per-entry size, expanded-size budget and traversal paths.
- Added structured DAW report persistence through migration `032-music-daw-import.sql`.

## F18 — Plugin Compatibility

- Added metadata-based plugin inventory and compatibility report.
- Browser/Worker does not claim to detect locally installed plug-ins; default status is `local-status-unknown`.
- Plugin state is parsed as metadata only and is never executed during import.

## F19 — Composition Engine

- Added measured-analysis → abstract Composition Plan.
- Safe composer handoff applies tempo/key/scale/bars only; originality guard forbids melody/reference cloning.

## F20 — Render → Analyze → Improve

- Rendered WAV is re-analyzed using the measured PCM analyzer.
- Iteration review checks BPM/key/true peak, optional LUFS target and stereo diagnostics, then emits next actions.
- No subjective artistic-quality score is fabricated.

## Release boundary

- Production origin remains `https://mnmllpulse.com`.
- Large DAW project ingestion remains a future direct-R2-multipart + durable-processing path.
- Node24/esbuild/Vitest/Wrangler release proof remains mandatory; fallback preview is not release proof.
