# Текущая документация AZRAIL

Status: current

Этот каталог — **единственный источник актуальных эксплуатационных утверждений** для текущего release candidate.

- `RELEASE_STATUS_RU.md` — текущий статус и блокеры релиза.
- `../../DEPLOY_RU.md` — безопасный порядок release/deploy.
- `../runbooks/MIGRATIONS_RU.md` — migration planner, ledger, backup/restore gate.
- `../runbooks/RELEASE_RU.md` — release gate и staging-first порядок.

Материалы вне `docs/current/` и `docs/runbooks/` могут быть историческими. При конфликте приоритет имеют текущие документы и исполняемые проверки из `scripts/`.

## RC18

- `CONFIGURATION_TRUTH_RU.md` — canonical environment model.
- `RELEASE_STATUS_RU.md` — текущий release status.
- `../runbooks/RELEASE_PACKAGE_RU.md` — clean package procedure.

## RC19

Quality Gate: VERIFIED / UNVERIFIED / BLOCKED / FAILED; отдельные lint, format, security и full runtime gates. `completed` теперь резервируется для результата с подтверждённым Quality Gate; неполностью подтверждённая работа получает финальный статус `unverified`.

- [Orchestrator architecture](ORCHESTRATOR_ARCHITECTURE_RU.md) — Stage 7 boundaries.

## RC22

- `STUDIO_ARCHITECTURE_RU.md` — canonical manifest, lazy registry и отдельные runtime-модули всех студий.

## RC23–RC25

- `APPROVAL_ENGINE_RU.md` — Unified Approval Engine и exact-payload single-use approvals.
- `EVENT_STREAM_RU.md` — Unified Event Stream, monotonic replay cursor и realtime envelope.
- `OBSERVABILITY_RU.md` — request/trace correlation, `trace_links` и admin-only trace traversal.

## RC27

- `ATTACHMENTS_RU.md` — Attachment Manager: R2-backed uploads, queue/retry, project binding и bounded reads.

## RC26

- `PROJECTS_RU.md` — Professional Projects: поиск, фильтры, метаданные, безопасные lifecycle actions и связь Studio artifacts с проектом.

## RC28

- `WEB_STUDIO_RU.md` — Professional Web Studio Workbench: files, isolated preview, changes, verification, logs, snapshots и non-destructive restore.

- `IMAGE_STUDIO_RU.md` — Professional Image Studio: bounded creative controls, system-owned FLUX.2 routing, durable history и reference workflows.
- `MUSIC_STUDIO_RU.md` — Professional Music Studio: bounded local composition engine, arrangement, waveform/piano roll, WAV/MIDI и durable sessions.


## RC32

- `AUDIO_LAB_RU.md` — Professional Audio Lab: Integrated/Short-term LUFS, LRA, true-peak estimate, stereo/dynamics/spectrum, BPM/key, Waveform/Spectrogram и Reference Comparison.

## RC33

- `ABLETON_LAB_RU.md` — Professional Ableton Lab: bounded ALS/XML parsing, scenes/groups/tracks, clips, devices/plugins, routing/sidechains, sample inventory, master chain, diagnostics boundaries и durable `ableton_analyses` history.

## RC34

- `DATA_STUDIO_RU.md` — Professional Data Studio: schema inference, validation, filter/sort, statistics, charts, explicit transformations, export и durable `data_analyses` history.

## RC44

- `../runbooks/BACKUP_RESTORE_PROOF_RU.md` — Stage D #35: local D1/R2 restore drill, Time Travel bookmark evidence и strict disposable-cloud proof gate.

- `SERIES_G_SYSTEM_INTELLIGENCE_RU.md` — G01–G10 cross-studio System Intelligence и real-browser/E2E truth boundary.
