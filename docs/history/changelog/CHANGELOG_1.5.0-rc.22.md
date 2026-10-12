# AZRAIL PULSE 1.5.0-rc.22

## Stage 8 — Studio Module Registry

- Central per-studio branching was removed from `ui/app.ts`.
- Added canonical `ui/studio-manifest.ts` and typed `StudioModule` contract in `ui/studio-types.ts`.
- Added lazy `ui/studio-registry.ts` loaders for all nine studios.
- Split Web, Image, Music, Video, Audio, Ableton, Data, Ledger and Pulse Lab into separate `ui/studio-modules/*` files.
- Preserved separate routes `/studios/:id`, draft isolation, viewer/cloud access boundaries, async epoch fencing and media cleanup.
- Added `npm run studios:check`, release-preflight invariants and regression tests preventing a return to the monolithic UI switch.
- Added `docs/current/STUDIO_ARCHITECTURE_RU.md`.
- Added a preview-only TypeScript fallback builder for this ChatGPT environment where local `esbuild` dependencies cannot be installed; this fallback is explicitly not release verification.
- Canva was used read-only to inspect existing AZRAIL interface references. No Canva design was modified.
- GitHub and Cloudflare remain mutation-free during this stage.
