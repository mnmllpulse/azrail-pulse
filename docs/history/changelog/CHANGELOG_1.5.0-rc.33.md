# AZRAIL 1.5.0-rc.33 — Stage 19 Professional Ableton Lab

- Rebuilt the minimal ALS parser into a bounded Ableton Live Set project inspector.
- Added BPM, time signature, scenes, groups, tracks, clips, devices, plugins, automation, routing, samples and master-chain extraction.
- Added explicit checks for missing plugin/sample markers, duplicated processing, resolvable routing loops, sidechain topology, gain-staging heuristics, CPU-heavy devices, frozen tracks and inactive devices.
- Added truthful analysis boundaries: local plugin installation and filesystem availability are not invented from ALS metadata.
- Raised the bounded parser contract to 12 MiB compressed / 24 MiB unpacked XML with DTD/ENTITY rejection and node traversal budget.
- Added `ableton_analyses` durable history via migration 025 and private project-bound source artifact provenance.
- Added bounded report compaction for D1 history while returning the full live report to the current analysis response.
- Added `verification.ableton.analysis_completed` to Unified Event Stream.
- Added project-aware Ableton Lab UI with summary metrics, tracks/devices/plugins, routing/sidechains, sample inventory, master chain, checks, JSON export and history/source download.
- Added `ableton:check`, release-preflight invariants and regression fixtures.
- GitHub, Cloudflare and Canva were used read-only only; no remote repository/cloud/design mutation was performed.
