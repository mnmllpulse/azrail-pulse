# AZRAIL 1.5.0-rc.32 — Stage 18 Professional Audio Lab

- Rebuilt Audio Lab from a basic PCM/FFT analyzer into a bounded professional mastering diagnostics workbench.
- Added Integrated LUFS, Short-term LUFS, Loudness Range and a documented BS.1770-style K-weighted gated implementation.
- Added a bounded 4× cubic inter-sample True Peak estimate and explicitly documented that it is not a certification meter.
- Added RMS, Crest Factor, clipping percentage, silence percentage, longest silence and DC offset measurements.
- Added stereo correlation and mid/side-based stereo width.
- Added spectral balance bands, spectral centroid, dominant frequency, bounded Waveform and Spectrogram summaries.
- Added BPM detection with confidence and false-tempo rejection for steady-state tones.
- Added key detection with confidence and a null result when tonal evidence is insufficient.
- Expanded Reference Comparison to loudness, true peak, LRA, RMS, width, BPM and normalized spectral differences.
- Added JSON engineering report export with explicit methodology metadata.
- Added `audio:check`, Audio Lab release-preflight invariants and a dedicated static Quality Gate entry.
- Extended audio regression tests for loudness, stereo width, silence/DC, 120 BPM pulse detection, C major detection and reference deltas.
- GitHub, Cloudflare and Canva were used read-only only; no remote repository, cloud or design mutation was performed.
