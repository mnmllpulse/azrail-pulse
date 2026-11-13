# Series G — System Intelligence (G01–G10)

Status: current

Release target: **AZRAIL 1.5.0-rc.63**. Это локальная интеграция сквозных систем поверх уже закрытых Series E/F; отдельные параллельные state stores не создаются.

## G01 Suggestion Engine

Server-ranked контекстные suggestions объединяют surface, текущий результат, ошибки, mission status, budget state, recent events, memory scopes, asset kinds и `uncertain` connector effects. При `uncertain_effect` reconciliation получает максимальный приоритет, а автоматический retry не предлагается.

## G02 Global Memory

Иерархия: User → Workspace → Project → Music → Image → Video → Agent → Session. Для записи видимы `source`, `confidence`, TTL и `whyStored`. `whyStored` хранится в additive sidecar `intelligence_memory_policy`, поэтому migration 035 не меняет уже развёрнутую таблицу `intelligence_memory` через ALTER.

## G03 Asset Intelligence Library

Единая выдача показывает metadata, tags, embedding evidence, project links, version lineage, analysis и bounded usage history. Новые поля хранятся в additive sidecar `asset_intelligence_evidence`.

## G04 Command Palette

`Ctrl/Cmd+K` остаётся универсальным входом и включает Global Memory, System History / Undo и Browser QA / Real E2E readiness наряду со Studio/Project/Metatron actions.

## G05 History / Undo

System History объединяет durable `event_stream` и `task_history`. История immutable. Undo объявляется только для операций, у которых есть доказанный reversible flow через subsystem history/snapshot; универсального ложного undo нет.

## G06–G08

Connector Gateway, Resource Ledger 2.0 и Mission Graph используют существующие production-grade foundations: connector policy/evidence/reconciliation, budget reservations/resource accounting и validated mission graph + Metatron control plane. Series G их не дублирует.

## G09 Browser QA

Web Studio static preview collector остаётся полезным локальным QA, но **не считается real-browser proof**. Readiness API явно возвращает `staticPreviewIsRealBrowser=false`. Real browser proof выполняется только Chromium/CDP runner'ом на live target.

## G10 Real E2E

`scripts/series-g-live-e2e.mjs` требует `AZRAIL_URL` и `AZRAIL_TOKEN` либо `AZRAIL_SESSION_COOKIE`, запускает настоящий headless Chromium через CDP, проверяет authenticated API, rendered interactive shell, `Ctrl/Cmd+K`, responsive widths и Accessibility Tree. Без live authenticated target gate имеет статус **BLOCKED**, а не PASS.

## Persistence

`035-series-g-system-intelligence.sql` — additive-only migration:
- `intelligence_memory_policy`;
- `asset_intelligence_evidence`;
- `suggestion_feedback`;
- `system_e2e_runs`.

Migration не содержит `ALTER TABLE`, `UPDATE` или `DELETE` и **не применялась** к Cloudflare D1.

## Remote boundary

GitHub / Cloudflare / Canva остаются read-only. Публикация, migration apply и deploy требуют отдельной явной команды владельца.
