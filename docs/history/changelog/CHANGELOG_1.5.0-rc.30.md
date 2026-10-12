# AZRAIL 1.5.0-rc.30 — Stage 16 Professional Music Studio

- Rebuilt Music Studio around one Generate CTA with Prompt, Genre, Mood, BPM/Auto, Key/Auto, Scale, Bars, Time signature, Pattern, Arrangement and Synth preset.
- Replaced the minimal fixed-F-minor sketch with a deterministic bounded multi-part composition engine for lead, bass, pad and arp roles.
- Added arrangement-aware local synthesis via `OfflineAudioContext`, built-in playback, Waveform and Piano Roll views.
- Preserved WAV and MIDI export while adding tempo/time-signature MIDI metadata.
- Added durable Save session with private WAV/MIDI Studio artifacts and account/project ownership verification.
- Added `migrations/023-professional-music-studio.sql` and `music_sessions` provenance metadata.
- Added project-scoped session history with Load, WAV and MIDI actions.
- Extended Music Studio server draft fields to cover all professional controls.
- Added `publication.music.session_saved` Unified Event Stream events.
- Added `music:check`, release-preflight invariants and a dedicated static Quality Gate entry.
- Kept provider truthfulness fail-closed: no undocumented Cloudflare text-to-music model is claimed or invoked.
- Used GitHub, Cloudflare and Canva only for read-only verification/reference; no remote mutation was performed.
