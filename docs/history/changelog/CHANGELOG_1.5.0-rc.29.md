# AZRAIL 1.5.0-rc.29 — Stage 15 Professional Image Studio

- Rebuilt Image Studio around one Generate CTA with Prompt, Aspect ratio, Resolution, Style, Seed, Variations and History.
- Added system-owned model routing between Cloudflare-hosted FLUX.2 Klein 4B/9B instead of exposing a provider/model selector to ordinary users.
- Added reference-driven variation, edit and AI upscale/recreate workflows with browser-side reference normalization to <=512 px.
- Added Download, Use as reference, Create variation, Edit, Upscale and Metadata result actions.
- Added `migrations/022-image-studio.sql` and durable `image_generations` provenance/history.
- Published generated artifact ownership and generation metadata atomically in the same D1 batch.
- Preserved exact-body idempotency fencing so ambiguous provider outcomes cannot be silently retried with changed inputs.
- Added account/project-scoped `/api/studio/image/history` and inline-safe image previews.
- Added `publication.image.generated` Event Stream events after durable publication.
- Added `image:check`, release-preflight invariants and a dedicated static Quality Gate entry.
- Used GitHub, Cloudflare and Canva only for read-only verification/reference; no remote mutation was performed.
