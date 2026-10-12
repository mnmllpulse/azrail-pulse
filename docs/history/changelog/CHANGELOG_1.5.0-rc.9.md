# AZRAIL PULSE 1.5.0-rc.9

Локальный hardening-кандидат. В рамках прохода GitHub и Cloudflare использовались только read-only; публикация, merge, deployment и cloud-write операции не выполнялись.

## Исправлено

- `waiting_approval` больше не считается terminal status. Mission polling не останавливается в момент, когда система на самом деле ждёт подтверждения пользователя. API дополнительно возвращает `requiresAction`.
- R2 pagination для backup creation и version restore теперь обнаруживает повторный cursor. Цикл вида `A → B → A` больше не может зависнуть навсегда.
- Ambiguous provider transport failures (`timeout`, network reset, broken connection и аналогичные случаи после dispatch) получают отдельный `ProviderOutcomeUncertainError`. Автоматический retry/fallback для такого исхода запрещён, чтобы не породить второй model request, пока первый мог фактически выполниться.
- Явные quota/provider ответы вроде `429` остаются отличимыми от transport ambiguity и продолжают обрабатываться существующей политикой маршрутизации.
- Release preflight закрепляет новые RC9-инварианты.

## Архитектурный вывод

RC9 продолжает принцип: неизвестный результат внешнего side effect нельзя превращать в разрешение на повтор. То же правило теперь применяется не только к connector writes и timeout, но и к неоднозначному transport failure model provider.

## Release gates

Перед публикацией обязательны свежие `npm ci`, semantic TypeScript typecheck, полный Vitest и Wrangler dry-run для staging/production. Старые результаты предыдущих сборок не используются как доказательство для RC9.
