# Verification evidence

`verification/` contains machine-readable contracts and read-only snapshots used by the current release gates.

- `current/` — verification summary for the current RC.
- `history/rc/` — previous RC verification summaries.
- `history/` content is evidence/history only and is not accepted as proof for the current release.

Runtime receipts produced by checks belong in `.work/` and are intentionally not committed.
