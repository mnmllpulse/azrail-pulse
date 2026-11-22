# Модели: реестр, политика, OpenRouter

Status: current

Состояние на 20 ноября 2026. Исходники: `src/lib/model-registry.ts`, `model-policy.ts`, `model-router.ts`, `neuron-paid.ts`, `openrouter.ts`, `openrouter-sync.ts`, `model-catalog.ts`.

## Тариф и источники данных

- Тариф Cloudflare: **Workers Paid** (`AZRAIL_WORKERS_PLAN=paid` на рабочем сайте). Бесплатны не модели, а 10 000 нейронов в сутки на аккаунт; сверх них $0,011 за 1000 нейронов. Платных моделей на Workers Paid три: `deepseek-v4.1-flash-1017`, `glm-5.3`, `inkling-2-small`; остальные модели доступны и на Free.
- Учебная копия работает как Free (`AZRAIL_WORKERS_PLAN=free`, `AZRAIL_FORCE_FREE=true`).
- Сведения о ценах и списке отключений взяты из ответов помощника Cloudflare (2026-11-13 и 2026-11-20) и changelog Cloudflare 2026-11-05. **Независимо с каталогом цен не сверены.** Статический снимок каталога `src/data/ai-model-registry.json` (268 имён, 2026-11-04) не пересобирался: скрипт `scripts/build-model-registry.mjs` читает токен wrangler с компьютера владельца.

## Реестр (`MODEL_REGISTRY`)

| Группа | Состав |
|---|---|
| Cloudflare `@cf/…` | 32 записи, из них 10 с `deprecatedAt: 2026-11-20` |
| OpenRouter `openrouter:<id>` | 15 бесплатных (`:free`) моделей |

Поле `tier` (`fast` / `balanced` / `frontier`) — ручная категоризация, не измеренный рейтинг. Окно контекста не указано, если оно не проверено.

Флаг `manualOnly` (8 записей: `clairic`, `clairic-flash`, `clef`, `clef-flash`, `clef-omni`, `granite-4.0-h-micro`, `apertus-v1.5-8b`, `inkling-2-small`): роутер сам такую модель не выбирает, закреплённый выбор из меню работает. Причина — нет данных о качестве; у `clairic` цена $0,10 действует до 1 декабря, затем $0,24.

## Отключённые модели (20.11.2026)

Роутер не предлагает модель с наступившим `deprecatedAt` (`isDeprecated`). В каталоге отключённые слаги помечаются недоступными (`isRetiredSlug`): 10 из реестра и 14 вне реестра (R1-distill, три LoRA, llama-3.1-8b-fp8, llama-3.2-1b, melotts, whisper-tiny-en, llava-1.5, embeddinggemma-300m, четыре SDXL).

Помечены в реестре: `nemotron-3-120b-a12b`, `deepseek-v4-pro-0813`, `deepseek-v4-flash-0731`, `qwq-32b`, `qwen3-30b-a3b-fp8`, `kimi-k2.6`, `kimi-k2.7-code`, `glm-5.2`, `glm-5.3-flash`, `llama-3.2-3b-instruct`.

## Кто доступен без платной подписки

`FREE_MODEL_SLUGS` в `model-policy.ts` — проверенный список для Free: llama-3.3-70b-fp8-fast, qwen2.5-coder-32b, gpt-oss-20b, gemma-4-26b-a4b-it, bge-m3, llama-3.2-11b-vision-instruct, clairic, clairic-flash, clef, clef-flash, clef-omni, granite-4.0-h-micro, apertus-v1.5-8b (и отключённые llama-3.2-3b, qwen3-30b-a3b). Картинки (`flux-2-klein-4b/9b`) и `whisper-large-v3-turbo` вызываются мимо чатового списка.

`modelBlockReason` решает, доступна ли модель: OpenRouter — по наличию ключа; модель из списка Free — всегда; платная из набора нейронов — при `paid` и без `AZRAIL_FORCE_FREE`; прочие — только при включённом режиме сторонних моделей и бюджете.

## Автовыбор роутера

- Низкий уровень усилий → дешёвые модели первыми; высокий → «тяжёлые».
- Платные модели в автовыборе: **только `deepseek-v4.1-flash-1017` и только для тяжёлых задач** (`neuronAllowedFor`). Обычные и мелкие задачи идут на бесплатные. `glm-5.3` и `inkling-2-small` — только вручную.
- Закреплённая в меню модель обходит роутер; отключённая платная из набора отклоняется.
- Суточный потолок платных моделей — `AZRAIL_DAILY_NEURONS` (9000, максимум 10 000). Подробности — `docs/NEURON_BUDGET.md`.

## OpenRouter

- Вызов напрямую (`openrouter.ai/api/v1`), слаг `openrouter:<id>`, ключ — секрет Worker `OPENROUTER_API_KEY` (в репозитории и чате ключа нет). Только бесплатные модели.
- Автосверка со списком OpenRouter: cron каждые 10 минут вызывает `syncOpenRouter`; список обновляется не чаще раза в 6 часов (KV `openrouter:live`), защита `MIN_FREE=3` от пустого ответа. Исчезнувшие модели помечаются «не актуальна», роутер их не берёт, ручной выбор даёт `ModelPolicyError`. Новые модели сверка **не добавляет сама**, а показывает счётчик «новых».
- `GET /api/openrouter-status` — состояние; `POST /api/admin/openrouter-refresh` — принудительное обновление (admin). В меню моделей группа OpenRouter идёт первой.

## Ограничения

- Список из 15 моделей OpenRouter получен пересказом каталога и может быть неполным.
- Качество новых моделей Cloudflare (clairic, clef и др.) не проверено.
- Формат передачи картинки в `llama-3.2-11b-vision-instruct` не проверен; чат читает картинки через `env.AI.toMarkdown` (см. `ATTACHMENTS_RU.md`).
