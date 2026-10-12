# AZRAIL 1.5.0-rc.27 — Stage 13 Attachment Manager

- Added `ui/attachment-manager.ts` with upload queue, status cards, remove and explicit retry.
- Replaced the legacy browser-side `attachmentsText` prompt stuffing with R2-backed `AttachmentRef[]` submission.
- Expanded composer attachment formats to ZIP/PDF/DOCX/code/images/audio/video supported by the existing upload backend.
- Preserved project ownership, 50 MB upload bounds, filename sanitization and R2/D1 publication recovery.
- Added `attachments:check`, release-preflight invariants and a dedicated Quality Gate entry.
- Added current documentation in `docs/current/ATTACHMENTS_RU.md`.
- No GitHub, Cloudflare or Canva mutation was performed.
