# Observability / Trace Correlation — AZRAIL 1.5.0-rc.25

Status: current

Stage 11 вводит единый correlation contract для HTTP, миссий, задач агентов, model calls, tool calls, approvals, connector calls и operational events.

## Canonical chain

`request_id → trace_id → mission_id/task_id → model_call_id/tool_call_id → approval_id → connector_call_id → event seq`

`request_id` идентифицирует входящий HTTP/RPC запрос. `trace_id` — 32-символьный hex correlation id, который переносится через весь внутренний pipeline. Входящий W3C `traceparent` принимается только после структурной проверки; иначе генерируется новый trace id.

## Durable sidecar

Корреляция хранится в `trace_links` из `migrations/019-observability-trace-links.sql`. Это sidecar, а не источник бизнес-состояния. Ошибка записи trace metadata логируется как `observability.link_failed`, но не должна отменять или повторять уже выполненную business mutation.

Один `(entity_type, entity_id)` не перебиндивается на другой `request_id/trace_id`: повторный link может только дополнить отсутствующие дочерние IDs.

## Event Stream

`event_stream` остаётся canonical operational feed. Event envelope может содержать `requestId`, `traceId`, `toolCallId`, `connectorCallId`, `modelCallId`. События по trace читаются через durable join с `trace_links` и сохраняют monotonic `seq`.

## Operator trace view

Admin-only endpoint:

`GET /api/observability/traces/{traceId}?after={seq}&limit={n}`

Он возвращает durable entity links и event replay для указанного trace. Это диагностический endpoint и не заменяет project/account authorization model.

Обычные HTTP responses на основном fetch path получают `X-Request-Id` и `X-Trace-Id`, чтобы оператор мог связать клиентский запрос с серверными событиями.

## Release invariant

`npm run observability:check` обязан пройти до release. Он проверяет schema/migration, propagation через mission/task/model/tool/approval/connector/publication и admin-only trace lookup.
