# AZRAIL OS v0.4.0 — Foundation Upgrade

## Included
- Chat POST endpoint backed by persistent conversations/messages.
- Workspace primitives: read/write/edit/list/search.
- Tool Registry expanded with execution-oriented tools.
- Initial `ExecutionEngine` abstraction with guarded tool dispatch.
- Upload keys namespaced by project + UUID to avoid filename collisions.
- Removed duplicate TypeScript statements found in the previous audited source.
- Health response now exposes actually available tools.

## Explicitly NOT claimed
This release does not claim a code execution sandbox, browser automation, or live
preview runtime. Those remain next-phase integrations.

> Позже: автономный цикл инструментов ДОДЕЛАН и работает — см. раздел
> «Слой автономного выполнения» в README.
>
> Из списка выше удалены две строки, обещавшие эндпоинты, которых в коде
> нет и не было. Файлы проекта отдаются через инструменты цикла
> (`list_files`, `read_file`), а не отдельным маршрутом. Теперь за этим
> следит тест: каждый упомянутый в документах путь сверяется с кодом.
