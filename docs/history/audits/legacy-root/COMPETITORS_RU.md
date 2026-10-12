# Конкуренты и Sandbox: сравнительный анализ

Проверено по доступной официальной документации 29 сентября 2026. Это выбранные пять ориентиров, а не подтверждённый глобальный рейтинг. Внутренние закрытые маршрутизаторы конкурентов неизвестны; их алгоритмы не выдаются за изученные исходники. Фразы «v0 всегда ломает mobile» и «Bolt ломает БД при rollback» не подтверждены этим аудитом.

## Пять агентов

| Продукт | Подтверждённая сильная сторона | Что включить в AZRAIL | Что есть в этой сборке / разрыв |
|---|---|---|---|
| v0 | Design mode: выбор элемента, визуальные правки, изменения возвращаются в исходники и версии | Design Contract, точечный diff, проверка размеров экрана | Общие токены, адаптивный UI, атомарные patch tools; визуальный инспектор компонентов ещё нужен |
| Lovable | Quick/Deep security scans, проверки конфигурации БД, зависимостей и MCP перед публикацией | Публикация только после проверки доступа и критических ошибок | OIDC, owner isolation, CSP и тесты; полный автоматический SAST/pentest-конвейер не внедрён |
| Bolt | Быстрый цикл создания приложения, встроенные возможности Bolt Cloud и Version History | Быстрый preview и ясная история; код и данные восстанавливать раздельно | Версии R2, экспорт ZIP; живой preview произвольных зависимостей требует Sandbox |
| Replit Agent | Checkpoints сохраняют состояние проекта и контекст; восстановление development-БД выбирается отдельно | Долговечная миссия, восстановление с подтверждённого шага, отдельные backup кода/данных | DO, D1 outbox, checkpoints, R2 snapshots; production disaster recovery нужно прогнать |
| Cursor | Agent, Planning, Debugging, Rules, Skills, MCP и облачные агенты | Узкий контекст, инструменты по контракту, небольшие патчи, расширения с правами | Repo map, поиск, apply_patch, specialist agents; полноценный пользовательский MCP marketplace ещё нужен |

Источники:

- [v0 Design mode](https://v0.app/docs/design-mode). В документации отдельно указано, что сам Design mode недоступен на mobile viewports; это не утверждение о качестве адаптивности сгенерированных сайтов.
- [Lovable Security overview](https://docs.lovable.dev/features/security).
- [Bolt Quickstart](https://support.bolt.new/building/quickstart), [Project settings](https://support.bolt.new/building/using-bolt/project-settings). Часть страниц не открылась напрямую; использовались доступные выдержки официального индекса, без расширенных выводов о поведении БД.
- [Replit Checkpoints and Rollbacks](https://docs.replit.com/features/version-control/checkpoints-and-rollbacks). По умолчанию rollback не меняет БД; production restore имеет отдельную процедуру.
- [Cursor documentation](https://cursor.com/docs), [Background Agents](https://docs.cursor.com/background-agent).

Практический критерий улучшения: одинаковый набор задач, одинаковый бюджет, измеренные wall-clock time, стоимость, доля успешно пройденных acceptance tests и слепая оценка интерфейса. Название модели или длина Master-промпта не доказывают превосходство.

## Пять сред разработки и исполнения

| Среда | Выбранная сильная сторона | Применимость |
|---|---|---|
| Cloudflare Sandbox | Изолированный контейнер, команды/файлы, egress policy, интеграция с Workers | Основной Paid backend AZRAIL; не бесплатный аналог полноценного Linux |
| Vercel Sandbox | Снимки среды и управление сетевой политикой | Ориентир для воспроизводимых запусков и восстановления; отдельный будущий backend |
| E2B | Изолированная microVM, SDK, сетевые ограничения | Ориентир для отделения среды агента от секретов и контрольной плоскости |
| CodeSandbox SDK | Снимки, восстановление и клонирование VM | Ориентир для быстрого запуска среды из подготовленного состояния |
| StackBlitz WebContainers | Node.js runtime в браузере, файловая система, команды | Быстрый локальный preview; ограничения браузеров и памяти делают его дополнительным режимом |

Источники: [Cloudflare egress](https://developers.cloudflare.com/sandbox/guides/outbound-traffic/), [Vercel snapshots](https://vercel.com/docs/sandbox/concepts/snapshots), [E2B security](https://e2b.dev/security), [E2B SDK](https://e2b.dev/docs/sdk-reference/js-sdk/v2.6.2/sandbox), [CodeSandbox SDK](https://codesandbox.io/sdk), [WebContainers introduction](https://webcontainers.io/guides/introduction), [browser support](https://webcontainers.io/guides/browser-support). CodeSandbox сравнивался по доступной официальной поисковой выдержке: прямое открытие вернуло ошибку.

## Десять функций, выбранных после сравнения

| № | Функция | Статус AZRAIL Unified |
|---|---|---|
| 1 | Отдельная среда на проект | Есть идентификатор Sandbox по projectId |
| 2 | Закрытая по умолчанию сеть | Есть enableInternet=false и пустой allowlist |
| 3 | Отделённые секреты | Cookie/OIDC в Worker; секреты не передаются в сгенерированный проект |
| 4 | Снимки и независимый rollback кода | Есть versioned R2 + workspace head; бизнес-данные D1 отдельно |
| 5 | Двусторонняя синхронизация файлов | Добавлен bounded UTF-8 экспорт из Sandbox в новую R2-версию |
| 6 | Долговечное исполнение | Есть outbox/DO/checkpoints; клиентская вкладка не владеет миссией |
| 7 | Объективные QA-гейты | Добавлена обязательность проверки кода, включая recovery |
| 8 | Быстрый тёплый старт из образа | Закреплён базовый образ; специализированные dependency images ещё нужны |
| 9 | Preview с мобильного без секретов | Есть отдельный preview adapter; живая контейнерная проверка и доступ требуют приёмки |
| 10 | Ресурсный учёт по задачам | Есть атомарный request ledger и модельные денежные резервы; полный cloud-bill reconciliation ещё нужен |

Не все десять реализованы полностью. Таблица фиксирует разрыв между архитектурой и исполняемой поставкой, чтобы дорожная карта не превращалась в набор обещаний.

## Финансовая поправка

Cloudflare предоставляет бесплатное распределение 10 000 Neurons в день; на Workers Paid превышение оплачивается. Unified Billing использует предварительно пополненный баланс. Поэтому “OFF = нулевой риск любых списаний” — неверный универсальный контракт.

Официальные источники: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/), [AI Gateway pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/).
