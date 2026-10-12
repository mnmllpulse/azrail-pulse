# Universal Module System 2.0 — Series F F81–F100

Источник требований — блок F81–F100 пользовательского PDF. Цель: все модули AZRAIL используют один `ModuleDefinition` и один `ModuleFrame`, вместо собственных header/spinner/delete/error реализаций.

## Канонический контракт

`ModuleDefinition` содержит `id`, `type`, `title`, `status`, `capabilities`, `actions`, `permissions`, `resourceUsage`, `history` и optional `workspaceId`. `ModuleFrame` оборачивает **весь** control tree студии, а не первый дочерний блок.

## F81–F100

- F81 Drag handle / Grip — native drag reorder между sibling ModuleFrame.
- F82 Collapse / Expand — единый controller + persisted state.
- F83 Duplicate — capability-gated; отображается только при безопасном `onDuplicate`.
- F84 Delete — capability-gated; отображается только при `canDelete + onDelete` и `module.manage`.
- F85 Pin — persisted per module/project.
- F86 Lock — отключает внутренние controls, не ломая frame controls.
- F87 Rename — переименовывает только module instance label, не каноническое имя Studio.
- F88 Move between workspaces — контракт `ModuleWorkspace + onMove`; действие появляется только при реально объявленных нескольких workspace.
- F89 Module Settings — единая settings-панель.
- F90 Reset to defaults — snapshot исходных полей.
- F91 Undo / Redo — bounded field snapshots, отдельные undo/redo stacks.
- F92 Loading state — live `loading`.
- F93 Error state — единый error surface.
- F94 Retry state — `retrying` + реальный retry callback текущего модуля.
- F95 Live status badge — `idle/loading/running/paused/retrying/success/warning/failure`.
- F96 Permission-aware actions — `module.view`, `module.configure`, `module.execute`, `module.manage`.
- F97 Module-specific keyboard shortcuts — framework shortcuts + `Alt+Enter` для Run там, где модуль исполняемый.
- F98 Module History — bounded action/state/error/resource history.
- F99 Resource Usage indicator — измеряемые `runs` и `last_ms`; API допускает дополнительные реальные метрики.
- F100 Extensible action API — `registerUniversalModuleAction()` + runtime `controller.registerAction()`.

## 6-second / simplicity rule

В первом уровне остаются Grip, Collapse, Pin, live status и resource usage. Lock, Undo/Redo, History, Settings, Reset, Rename и destructive/capability actions находятся в компактном **More** меню. Это сохраняет полный профессиональный контракт без перегруженного header.

## Safety boundaries

Framework **не** делает `cloneNode(true)` для Duplicate: такой clone потерял бы корректные event handlers/state и мог бы создать ложную копию. Delete также не выполняется без explicit callback. Move не симулируется сменой текста — нужен реальный workspace adapter. Unsupported actions скрыты, а не притворяются доступными.

## Persistence

UI preferences/history labels хранятся локально per module/project. Этот block не требует новой D1 migration; latest migration остаётся `034-metatron-lab-2.sql`. Durable multi-user module layouts можно добавить отдельной миграцией только когда в продукте появится реальный multi-workspace surface.

## Verification

`npm run series:f:modules` проверяет F81–F100, единый ModuleDefinition/ModuleFrame, simplicity menu и fail-closed destructive/workspace boundaries. Gate включён в `quality:static`.
