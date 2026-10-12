# Unified Event Stream — AZRAIL 1.5.0-rc.25

## Цель

`event_stream` — единый append-only operational event contract для миссий, агентов, инструментов, approvals, connectors, verification, recovery и publication. Он не заменяет специализированные таблицы состояния: `missions`, `task_history`, `approval_requests`, `approval_receipts`, `connector_calls` и `workspace_publications` остаются каноническими источниками состояния своих подсистем.

## Контракт

Каждое событие имеет монотонный `seq`, UUID/ID `id`, `schemaVersion=1`, `domain`, `type`, optional scope (`accountId`, `projectId`, `missionId`, `taskId`, `approvalId`), subject, actor, payload и `createdAt`.

`seq` — единственный replay cursor. Временная метка не используется как cursor: несколько событий могут иметь одинаковое время.

Домены RC25: `mission`, `agent`, `tool`, `approval`, `connector`, `verification`, `recovery`, `publication`, `system`.

## Durable first

Realtime frame отправляется только после durable INSERT в `event_stream`. Если запись в Event Stream не удалась, основная mission/approval операция не должна маскироваться ложным live-событием. Специализированный durable state остаётся первичным доказательством результата.

## Replay

Authenticated endpoint:

`GET /api/projects/{projectId}/events?after={seq}&limit={n}`

возвращает `events`, новый `cursor` и `hasMore`. Клиент после reconnect сначала догружает все события `seq > cursor`, затем открывает WebSocket.

## Realtime

WebSocket transport `/api/stream` использует один application frame:

`{ "type": "event_stream", "event": <EventEnvelope> }`

Legacy `mission_event` / `task_event` больше не являются canonical transport contract.

## Совместимость

Таблица `mission_events` временно остаётся legacy read source. Migration `018-unified-event-stream.sql` best-effort импортирует старые mission events в новый поток. Новые mission writes идут только в `event_stream`.

## Release gate

`npm run events:check` проверяет таблицу, monotonic cursor, replay API, realtime envelope и интеграции approval/connector/publication/UI. Static Quality Gate обязан включать этот check.
