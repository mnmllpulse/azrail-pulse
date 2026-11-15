# Documentation map

- `current/` — current operational/product truth for the active RC.
- `runbooks/` — operator procedures and release gates.
- `product/` — architecture, product specification and branding source documents.
- `releases/` — current release changelog.
- `history/` — snapshots and summaries only; full text of past audits and changelogs lives in branch `archive/docs-2026-11`.
- `DOCS_RULES.md` — how to keep documentation tidy.

If historical content conflicts with current code or current documentation, `docs/current/`, `docs/runbooks/`, executable checks in `scripts/`, and canonical configuration in `config/` take precedence.
