# Series F / G — текущее состояние после RC62

Status: snapshot 2026-10-12 (не источник истины)

Источник требований: пользовательский PDF-сценарий Series E/F/G, 63 страницы.

## Series F — F01–F100

Series F закрыта последовательно локальными релизами:
- RC56: F01–F16 Music Intelligence;
- RC57: F17–F20 DAW/Plugin/Composition/Render loop;
- RC58: F21–F40 Image Studio 2.0;
- RC59: F41–F60 Video Studio 2.0;
- RC60: F61–F80 Metatron Lab 2.0;
- RC61: F81–F100 Universal Module System 2.0.

Provider-dependent функции остаются fail-closed там, где реальный provider/model не подключён. Список 243 AI models намеренно отложен до отдельного Model Registry / Auto Router этапа.

## Series G — RC62

- **G01 Suggestion Engine** — server-ranked cross-studio context suggestions + durable feedback.
- **G02 Global Memory** — User/Workspace/Project/Music/Image/Video/Agent/Session hierarchy + source/why/TTL/confidence.
- **G03 Asset Library** — metadata/tags/embedding evidence/project links/versions/analysis/usage history.
- **G04 Command Palette** — Ctrl/Cmd+K объединяет studios, memory, history и QA readiness.
- **G05 History / Undo** — event/task evidence surface; undo fail-closed unless reversible flow is proven.
- **G06 Connector Gateway** — переиспользуется существующий policy/vault/reconciliation stack.
- **G07 Resource Ledger 2.0** — переиспользуются reservations, budgets, dimensions и uncertain accounting.
- **G08 Mission Graph** — validated graph + Metatron control plane.
- **G09 Browser QA** — static preview QA не выдаётся за real-browser proof; live proof через Chromium/CDP.
- **G10 Real E2E** — live authenticated Chromium runner; без target/auth статус BLOCKED.

## Migration boundary

Latest local migration: `035-series-g-system-intelligence.sql`, additive-only sidecar schema. Remote apply не выполнялся.

## Domain boundary

Production origin: **`https://mnmllpulse.com`**. Дополнительные домены отложены для будущих приложений.

## Release boundary

GitHub / Cloudflare / Canva — read-only. Local ZIP остаётся canonical source до отдельной явной команды владельца на публикацию/deploy.
