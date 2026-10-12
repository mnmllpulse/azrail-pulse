# AZRAIL PULSE 1.5.0-rc.8

Локальный hardening-кандидат. Публикация в GitHub и изменение Cloudflare в рамках этого прохода не выполнялись.

## Исправлено

- Workspace publication переведён на optimistic CAS: устаревший bulk publisher больше не может заменить более новый `workspace_heads.prefix` даже при обходе/гонке project lock.
- Pre-mission snapshot теперь публикует `project_versions` и `mission_snapshots` одной D1 batch-транзакцией. Убран crash-window между созданием baseline и привязкой его к миссии.
- Upload R2→D1 publication учитывает потерю ответа D1: объект не удаляется, если ownership-запись фактически успела commit.
- Studio artifacts получили тот же fail-closed publication protocol и безопасный `DELETE /api/studio/artifacts/:id` для владельца.
- Backups ограничены 50 опубликованными копиями на проект; добавлено безопасное удаление backup с D1-first dereference, проверкой ambiguous DELETE и bounded R2 cleanup.
- `DELETE /api/backups?projectId=...&backupId=...` добавлен в основной API и остаётся под существующим auth/resource boundary.
- Release preflight закрепляет новые RC8-инварианты, чтобы последующий рефакторинг не вернул старые race/consistency ошибки.

## Архитектурное решение

Большая декомпозиция `execution-engine.ts` в RC8 сознательно не выполнялась. До свежего полного semantic typecheck/Vitest/Wrangler dry-run структурный refactor центрального state machine увеличил бы площадь регрессии. RC8 сначала закрывает доказанные distributed-consistency дефекты минимальными изменениями поведения.

## Release gates

Перед публикацией по-прежнему обязательны свежие `npm ci`, semantic TypeScript typecheck, полный Vitest и Wrangler dry-run для staging/production. Старые результаты предыдущих сборок не являются доказательством для RC8.
