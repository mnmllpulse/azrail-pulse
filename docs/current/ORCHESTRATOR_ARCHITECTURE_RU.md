# Orchestrator Architecture — Stage 7 / RC21

Status: current

`src/agents/orchestrator.ts` остаётся Durable Object shell: WebSocket lifecycle, state update, task flow и публичные RPC-методы. Доменные обязанности вынесены в отдельные модули без изменения внешних RPC-контрактов.

## Границы

- `orchestrator-intent.ts` — sufficiency gate и intent classification.
- `orchestrator-capabilities.ts` — capability -> agent selection и явный Git handoff.
- `orchestrator-history.ts` — WebSocket task event + D1 task_history.
- `orchestrator-self-test.ts` — диагностика sub-agents/D1/KV/R2 и routing preview без модельных вызовов.
- `mission-coordinator.ts` — mission delivery lease, schedule, benchmark execution, recovery и background mission execution.
- `orchestrator.ts` — thin Durable Object shell, чат, task sequencing и делегирующие RPC wrappers.

## Инварианты

1. `Orchestrator` не выбирает конкретный sub-agent по имени: выбор идёт через capability registry.
2. Recovery не обходит `waiting_approval`: approval call IDs выводятся только из валидированной checkpoint-цепочки.
3. Scheduled task принимает только актуальный durable `deliveryGeneration`.
4. Git handoff выполняется только при явном `commitToBranch`.
5. Task history сначала пытается отдать live event, затем независимо пишет D1.
6. Self-test не вызывает модели и убирает временные D1/KV/R2 записи.

## Совместимость

Публичные методы Durable Object сохранены: `handleTask`, `invokeCapability`, `startMission`, `runBenchMission`, `recoverMission`, `runMissionTask`, `getHistory`, `selfTest`, WebSocket lifecycle.

Stage 7 — структурный refactor. Cloudflare/GitHub mutations не выполнялись.
