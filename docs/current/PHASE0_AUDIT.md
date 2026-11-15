Status: snapshot 2026-11-15

# Phase 0: сверка мастер-спецификации с кодом

Основание: `docs/product/MASTER_SPECIFICATION.md`. Источник фактов: код, `wrangler.jsonc`, `tool-registry.ts`, тесты. Живой воркер и сборка контейнера не проверялись.

| Требование спецификации | Что в коде | Статус |
|---|---|---|
| Универсальный чат | Маршрутизатор, план из частей, студии и локальный агент из чата | Работает |
| Execution Engine, цикл «проверка → исправление» | `core/execution-engine.ts`: проверка тестами в контейнере, детектор зацикливания | Частично: зависит от песочницы |
| Cloud Sandbox | Биндинг `AZRAIL_SANDBOX`, `containers` в `wrangler.jsonc`; но `AZRAIL_SWITCH_SANDBOX=off` | Выключено |
| Terminal | Инструмент `sandbox_exec` есть в реестре, `available: false` без контейнера; панели терминала в UI нет | Нет |
| Live Preview | `sandbox_preview` есть в реестре, `available: false`; `preview_urls: false` | Нет |
| Local Agent | `read`/`list`/`write` с подтверждением, одна папка; команд и запуска программ нет, установщика нет | Частично |
| GitHub: OAuth/App, commit, push | В `src` и `ui` нет OAuth и GitHub App; есть `GITHUB_TOKEN`, `run_tests` через Actions, `git_diff`; `open_pr` отключён намеренно | Частично |
| Cloudflare Deploy из чата | Поиска вызовов деплоя через API в `src` нет; деплой идёт через CI и `wrangler` | Нет |
| Регистрация, подписки, биллинг | Вход по OIDC (Cloudflare Access) и ручное создание аккаунтов владельцем; `/api/admin/billing` и `lib/billing.ts` — учёт расходов, не продажа | Нет |
| Permission Engine | Риск инструмента `safe/review/approval`, роли `admin/editor/viewer`, подтверждения | Частично: уровней 0–3 и режимов Ask/Trusted/Autonomous нет |
| Kill switch | `lib/kill-switch.ts`, переключатели `AZRAIL_SWITCH_*` | Работает |
| Лимиты и учёт | `resource_budgets`, `resource_ledger`, лимит нейронов, `DAILY_PROVIDER_CALLS`, `CHAT_DAILY_LIMIT` | Работает |
| Checkpoint/Restore | Упоминания в 8 файлах `src`; сквозного сценария нет | Не проверено |
| Журнал действий | Таблицы `event_stream`, `event_integrity`, `mission_events` в `schema.sql` | Есть, сквозная проверка не делалась |
| Секреты в выводе | `lib/secret-scan.ts` | Модуль есть, где применяется — не проверено |
| Защита от prompt injection | Явной защиты поиском по коду не найдено; описания внешних инструментов в реестре помечены как данные | Не проверено глубже |
| E2E, GitHub и Cloudflare integration tests | 156 файлов тестов; сквозных сценариев и интеграционных тестов с GitHub и Cloudflare нет, есть `scripts/smoke.mjs` | Нет |

## Что блокирует Definition of Done

1. Песочница выключена: без неё нет сборки, терминала и предпросмотра, а значит и цикла «ошибка → исправление».
2. Нет интеграции GitHub (OAuth, commit, push) и Cloudflare (API деплоя).
3. Нет пользовательской регистрации и продажи подписок.

## Порядок работ по спецификации

1. Включить песочницу на проверке (`AZRAIL_SWITCH_SANDBOX`) и пройти сценарий «создать проект → build → ошибка → исправление → build».
2. Уровни разрешений 0–3 и три режима поверх существующих ролей.
3. Терминал с белым списком команд и подтверждением (локальный агент и контейнер).
4. GitHub App, затем Cloudflare Deploy.
5. Регистрация, подписки, учёт стоимости пользователя.
