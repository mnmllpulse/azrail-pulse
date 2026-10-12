# AZRAIL 1.5.0-rc.26 — Stage 12 Professional Projects

- Added `020-professional-projects.sql` and canonical sidecars `project_profiles` / `studio_artifact_projects`.
- Added typed Project Center backend with search, filters, sorting, metadata, lifecycle, recent activity and counts.
- Added bounded, lock-protected current-workspace duplication (400 files / 16 MiB) without copying historical missions/versions.
- Added exact-confirmation soft delete and active-mission lifecycle guard.
- Linked Studio artifact writes to project/studio context.
- Replaced primitive Projects UI with professional cards, favorite, status, studio, activity/counts, Open + overflow actions and details.
- Added legacy display-name fallback from latest mission goal for historical UUID-named projects.
- Added `projects:check` architecture gate and Stage 12 tests.
- No GitHub/Cloudflare/Canva mutations were performed.
