# AZRAIL 1.5.0-rc.31 — Stage 17 Professional Video Studio

- Rebuilt Video Studio as **AZRAIL Scene Builder + Timeline Lite**, not a browser clone of a full desktop NLE.
- Added Aspect ratio 16:9 / 9:16 / 1:1, 720p / 1080p resolution, 4 / 8 / 12 second duration and 24 / 30 FPS controls.
- Added 1–8 editable scenes with per-scene text layers, Cut/Fade/Slide transitions and Static/Zoom/Pan/Pulse motion presets.
- Added local image layers (up to eight) and one optional audio layer with bounded file sizes.
- Added authenticated Workers AI scene planning through `@cf/openai/gpt-oss-20b`, protected by the existing exact idempotency/admission path.
- Kept final video rendering local and explicit via Canvas + MediaRecorder; Cloudflare Stream and generative video are not falsely claimed as wired.
- Added Web / Social / Presentation export presets, live preview and bounded WebM export.
- Added `migrations/024-professional-video-studio.sql` and durable `video_sessions` provenance metadata.
- Added project-scoped Video session history with timeline reload and WebM download.
- Added server-side ownership validation for saved WebM artifacts and `publication.video.session_saved` Unified Event Stream events.
- Extended Video Studio draft fields to cover the professional controls.
- Added `video:check`, release-preflight invariants and a dedicated static Quality Gate entry.
- Used GitHub, Cloudflare and Canva only for read-only verification/reference; no remote mutation was performed.
