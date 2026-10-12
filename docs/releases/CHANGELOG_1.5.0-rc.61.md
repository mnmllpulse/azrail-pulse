# AZRAIL 1.5.0-rc.61 — Universal Module System 2.0

## Series F F81–F100

Локально завершён Universal Module System 2.0 поверх существующего rc.60 foundation. Один `ModuleFrame` теперь оборачивает полный control tree каждой студии и стандартизирует grip/reorder, collapse, pin, lock, rename, settings, reset, undo/redo, loading/error/retry states, live status, permissions, shortcuts, history, resource usage и extensible action API.

## Simplicity

Secondary actions перенесены в компактное `More` меню. В первом уровне остаются только наиболее частые действия и live state.

## Safety

Duplicate/Delete/Move — capability-gated. Framework не делает опасный DOM clone и не симулирует workspace move, если host не предоставляет реальный adapter. Канонические Studio names не переименовываются: Rename относится только к module instance label.

## Release boundary

Новая D1 migration не нужна: этот batch — универсальный UI/runtime contract. Latest migration остаётся `034-metatron-lab-2.sql`. GitHub, Cloudflare и Canva в rc.61 не изменяются.

## Verification

Добавлен `series:f:modules` и обязательный static quality gate. Финальные числа фиксируются в `verification/current/VERIFICATION_RC61.json` после exact-tree pass.
