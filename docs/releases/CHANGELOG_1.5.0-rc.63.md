# AZRAIL 1.5.0-rc.63

## Final cross-cutting closure

- Added Universal Compare Center available from every Studio through compact Tools and Ctrl/Cmd+K.
- Compare Mode renders real saved image/audio/video/text artifacts and never mutates A/B sources.
- Preserved Web Studio source/snapshot diff as the authoritative Before/After path for code workspaces.
- Upgraded Professional Review UI with `Fix critical`, `Fix all safe issues`, and `Review manually`.
- Review remediation is strictly gated by `safeAutoFix=true`; unsafe findings remain manual-review only.
- Added explicit local-only remediation prompt boundaries: no deploy, push, PR, remote migration, or external mutation.
- Hardened canonical Studio naming and Russian descriptors; `Pulse Lab` remains canonical.
- Localized key user-facing Prompt labels to `Промпт`.
- Added mandatory `cross:final` repository gate.
- No GitHub, Cloudflare, or Canva mutation was performed.
