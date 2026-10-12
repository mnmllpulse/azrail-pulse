# AZRAIL PULSE 1.5.0-rc.56

Local-only development release. GitHub / Cloudflare / Canva remain read-only; no deployment or remote mutation was performed.

## Series F — Music Intelligence Studio 2.0, F01–F16

- Added multi-track intake queue for 1–20 local audio files with per-track waiting/analyzing/done/failed/cancelled states.
- Reused the measured PCM analyzer for BPM, key, LUFS, true peak, dynamics, spectrum, stereo and waveform data; no synthetic audio metrics are invented.
- Added adaptive local analysis windows for local key/Camelot and measured energy timeline.
- Added measured-window Auto Structure heuristic and explicit manual bar-slicing primitive. Heuristic structure is labelled as heuristic in UI/contracts.
- Added normalized pitch-class profile output and chord-tendency ranking. This is not presented as exact chord transcription.
- Added Reference Matrix and aggregated reference profile.
- Added local A/B player with relative LUFS matching by attenuation only (no gain above unity).
- Added Production Brief / Originality Guard generation from measured characteristics.
- Added V1 → V2 Music Learning Coach based on measured deltas and bounded engineering recommendations.
- Added one-click persistence of measured Music analysis into hierarchical Music Memory.
- Production origin decision updated locally to a single AZRAIL OS origin: `https://mnmllpulse.com`.

## Build / verification boundary

- UI TypeScript check passes on the available host.
- Official `npm ci` / esbuild build remains unavailable on this host because the package registry stalls and Node is 22.16.0, not the release Node 24 runtime.
- A separate `tsc-fallback-bundle` was generated so the local ZIP contains a runnable browser UI with the rc.56 Music Intelligence changes. It is explicitly marked `release_verified: false` and does not replace the Node24/esbuild production proof.
- F17–F20 (DAW Import coverage, Plugin Compatibility orchestration, Composition Engine integration, Render → Analyze → Improve loop) remain the next sequential Music batch.
