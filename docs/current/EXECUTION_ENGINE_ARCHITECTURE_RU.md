# Execution Engine — архитектура после Stage 6

Начиная с `1.5.0-rc.20`, `ExecutionEngine` больше не хранит внутри себя реализацию каждого инструмента, планирование, журналирование и чтение полного workspace.

## Границы ответственности

```text
ExecutionEngine
├── ExecutionToolExecutor
│   ├── workspace tools
│   ├── connector tools
│   ├── sandbox tools
│   └── QA / Git capability bridge
├── ExecutionPlanningEngine
│   ├── initial plan
│   ├── replan
│   └── next-step decision
├── ExecutionJournal
│   ├── tool_calls
│   ├── approvals
│   ├── mission_checks
│   └── mission events
└── MissionWorkspace
    └── bounded verification snapshot
```

`ExecutionEngine` остаётся владельцем mission lifecycle: recovery, checkpoints, rollback, verification, iteration budget и terminal result.

## Правила

1. Tool-specific I/O не добавляется обратно в `execution-engine.ts`; новые адаптеры идут в `execution-tools.ts`.
2. Изменение prompt/plan policy идёт через `execution-planning.ts`.
3. Durable audit/event writes идут через `execution-journal.ts`.
4. Общие execution-типы не должны импортировать runtime modules, чтобы не создавать циклические зависимости.
5. Публичный импорт `ExecutionContext` из `execution-engine.ts` сохраняется для обратной совместимости.

## Цель

Главный state-machine файл должен оставаться обозримым и не превращаться снова в монолит. Stage 6 уменьшил `execution-engine.ts` примерно с 1754 до ~1095 строк, при этом существующие public contracts сохранены.
