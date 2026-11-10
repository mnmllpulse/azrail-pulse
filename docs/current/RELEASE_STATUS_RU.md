# AZRAIL 1.5.0-rc.63 — статус релиза

Текущая контрольная точка: **Stage 33 / Stage D пункт 38 — Production Release Preparation**.

## Что подтверждено

Master-сценарий дошёл до последнего пункта #38: **«Только потом production release»**. В RC47/RC48 сформирован отдельный fail-closed production release contract. Подготовка не меняет GitHub, Cloudflare или Canva и не трактует `+` как production authorization.

Контур связывает exact-release Node24 evidence, staging migration/deploy/smoke/security, backup/restore proof, production approval, exact GitHub PR publication + fresh CI + merge SHA, свежий production deployment lease и D1 Time Travel bookmark. Production migration обязана выполнить D1 export и private R2 backup до первой schema write; Worker deploy допускается только после migration. OIDC issuer/client передаются явно во время deploy, а `--keep-vars` запрещён, чтобы не сохранить legacy `CORS_ORIGIN=*`.

После deploy релиз всё ещё не считается завершённым. Нужны новый Cloudflare deployment/version ID, exact-release production smoke, security verification, fresh drift = `ALIGNED`, а legacy `AZRAIL_TOKEN` может быть revoke/rotate только после доказанного OIDC cutover. Финальный receipt — `.work/production-release-verified.json` со статусом `VERIFIED_RELEASED`.

## RC50 exhaustive source-package audit

RC54 сохраняет clean layout для active runtime, но возвращает **весь history/legacy контур в Full Archive ZIP**. `repo:exhaustive` проверяет current/history/legacy файлы и все декодируемые строки. GitHub `main` → Cloudflare остаётся **staging-only** auto-deploy после полного Node24 Verify. Production workflow disabled, Stage D порядок не меняется.

## Состояние на 29 октября 2026

Статус выпуска: **CONDITIONAL**. Карточка: `docs/current/PRODUCTION_READINESS.md`. Выпуск привязан к рабочему сайту `azrail-pulse`. Репозиторий `mnmllpulse/azrail-pulse` закрытый, код на ветке `main`. Черновые адреса версий на рабочем сайте выключены, квитанция одобрения с этим совпадает. Карточка рабочего сайта держит статус CONDITIONAL. Квитанция `VERIFIED_RELEASED` на эту выкладку не пишется. Решением 6 ноября 2026 восемнадцать пунктов следующей карты сняты с `1.5.0-rc.63` и остаются версиями 1.5.1–2.0.

- Рабочий сайт — воркер `azrail-pulse`. Deployment `58faa074-2349-4241-9ba2-1bb78b0a276d`, версия `2def7e8b-c039-4f45-a338-fdf31b267b26`. Служебный пульт «Метратрон» снова открывается по своему маршруту. Полоса различает обычную, короткую, противоречивую и проектную фразу. Память читается только у своего проекта. У владельца план пишет модель. Если модель не ответила, план собирается по словам фразы. Картинка, плеер и ссылка на страницу остаются в полосе. Кнопка «Продолжить» собирает только то, что ещё не готово. Следующая фраза видит уже собранные части. Кнопка «Править» меняет одну часть и не пересобирает соседние. Сбой одной части не гасит соседнюю. «Повторить» поднимает только упавшую. До старта видны остаток чата и генерации, ролик назван раскадровкой. Раскадровка лежит карточками. Картинка и трек скачиваются из полосы, имя берётся из фразы. Картинка собирается в двух вариантах, размер выбирается до старта. Прошлая вещь остаётся в том же чате. Пустая полоса пишет «Пока ничего нет.» Можно выбрать 2, 3 или 4 варианта. У готовой картинки есть шаг «Увеличить». Когда нужен вход, в полосе кнопка «Войти». Новый чат начинает с голоса Серый, ключ озвучки назван отсутствующим. Под полем написано: чат 200, генерация 500 в сутки. Своя картинка задаёт вид следующей сборки. У части сайта есть «Скачать проект», «Править текст» и «Копия проекта». Перед публикацией написано, помещается ли текст на ширине 390 px. В Web Studio на экране один вид, кнопка «Другой вид» меняет только его. Повтор картинки заканчивает зависшую сборку тем же ключом. Строка сайта становится готовой только когда миссия уже не пишет «Выполняю задачу». Фраза режима «Для картинки» ложится в поле Image Studio. Строка модели под полем скрыта, пока модель не выбрана. Служебные экраны спрятаны за кнопкой «Эксперт». Каталог моделей — 268 имён. Вход только почтой. Секрет ключа снят, запасного входа ключом нет. Почта `mnmllpulse@gmail.com` остаётся хозяином. Проверка 11 из 11 снята с прошлой выкладки, роль хозяина.
- Учебная копия — `azrail-pulse-staging`. Deployment `8632ce8f-98ed-462f-b946-1d60c92482b8`, версия `152dff3b-fafc-4a4f-ad8d-022a2e2f0c8a`. Эта сборка чата на учебную копию выложена. Дневной потолок провайдера 500, чат 200. Вход только почтой, своя база и свои черновые адреса. Хозяин — та же почта `mnmllpulse@gmail.com`. Проверка 11 из 11 снята с прошлой выкладки `63b9d403-2c6d-4993-842a-f24d9d2b7efc`, роль хозяина.
- Выпуск смотрит на рабочий сайт `azrail-pulse`. Команда выпуска отказывается от `wrangler.production.json`. Репозиторий: закрытый `mnmllpulse/azrail-pulse`, ветка `main`.
- #29 Node 24: локальный корпус VERIFIED для `1.5.0-rc.63`.
- #30–#31 учебная миграция и выклад: применены до smoke.
- #32 staging smoke: **VERIFIED**, 11 из 11, deployment `63b9d403-2c6d-4993-842a-f24d9d2b7efc`, роль хозяина.
- #33 проверка безопасности учебной копии: **VERIFIED**, 7 из 7.
- #34 сверка рабочего сайта: сравнивает `azrail-pulse` с `wrangler.jsonc`. Статус **ALIGNED**, 42 совпадения, блокеров нет. Секрет `AZRAIL_TOKEN` снят. База не менялась.
- #36 одобрение выпуска: квитанция записана локально при выключенных черновых адресах, живёт 24 часа и выкладку не разрешает.
- #38 выпуск: **CONDITIONAL**. Квитанция `VERIFIED_RELEASED` не записана.

## Безопасные команды

```sh
npm run production:release:check
npm run production:release:simulate
npm run production:release:plan
```

`npm run production:release:apply` остаётся remote mutation path и не должен выполняться без всех exact receipts и отдельного явного production release approval. Runbook: `docs/runbooks/PRODUCTION_RELEASE_RU.md`.


## RC55 Series E runtime/control-plane

Локально реализован следующий блок сценария E11–E16. Stop теперь одновременно фиксирует durable cancellation intent в D1 и отправляет live abort в активный Orchestrator Durable Object; внешние MCP fetch-вызовы получают AbortSignal. Uncertain connector effects имеют явный reconcile flow, а студии — recovery UI. GitHub/Cloudflare production mutation не выполнялась.

## RC55 carries forward Series E Web Studio Intelligence — E17–E21

Локально реализован следующий блок пользовательского 55-страничного сценария:

- Design Contract v2 с typography/grid/breakpoints/component states;
- Visual ↔ Code inspector, который связывает выбранный preview-element с реальным source path/line;
- source-aware Layers / Component Tree;
- responsive canvases 390 / 768 / 1024 / 1440;
- Browser QA внутри sandboxed preview с сохранением отчёта в Unified Event Stream.

Этот batch не менял remote GitHub, Cloudflare или Canva. Browser QA подтверждает DOM-состояние локального static preview, но не подменяет live E2E, staging smoke или production acceptance.

## RC55 local product-intelligence update

E22–E40 completion contracts and Series F/G shared foundations are now present locally: voice lifecycle/STT adapter, image jobs, video/music pipelines, Mission DAG, expanded Ledger units, sandbox policy, Command Palette, hierarchical memory, Asset Intelligence, Compare Mode, Review persistence and Universal Module System 2.0. Migration 031 is included locally but has **not** been applied to Cloudflare D1. GitHub/Cloudflare/Canva were read-only only.


## RC56 Music Intelligence runtime

Series F F01–F16 реализованы локально: multi-track intake 1–20, local key/Camelot windows, measured energy/structure heuristic, chord tendencies, Reference Matrix, A/B LUFS match, Production Brief/Originality Guard, Learning Coach и Music Memory persistence. Production origin локально сокращён до `https://mnmllpulse.com`; дополнительные домены отложены. GitHub/Cloudflare/Canva не изменялись. На момент RC56 F17–F20 были следующим Music batch; они закрыты локально в RC57 ниже.


## RC57 Music Intelligence runtime — F17–F20

Локально завершён следующий последовательный Music batch: безопасный DAW Project Import Gateway (`.dawproject`, `.als`, Ableton Project ZIP, generic ZIP fallback), truthful Plugin Compatibility report, measured-to-abstract Composition Plan и Render → Analyze → Improve loop на реально отрендеренном WAV. Migration 032 добавлена локально и **не применялась** к Cloudflare D1. Для больших DAW uploads зафиксирован следующий production boundary: direct R2 multipart + durable processing вместо полного buffering в Worker. GitHub/Cloudflare/Canva использовались только read-only.

### RC57 verification receipt

- `quality:static`: **53 PASS / 0 FAIL / 0 BLOCKED**;
- `quality`: **53 PASS / 0 FAIL / 5 BLOCKED**;
- migration catalog: **002–032**;
- production drift: **RECONCILIATION_REQUIRED, 17 remote blockers**, no write attempted;
- blocked proof remains Node24/dependency-backed build/tests/dry-run + live authenticated smoke.


## RC58 Image Studio 2.0 local checkpoint

F21–F40 Image Studio workbench foundation добавлен локально: Reference Board, Layers/Mask, approved image quick switcher + AUTO, genealogy, Style/Identity/Brand controls, measured QA и Export Center. Mask-generative F27–F31 и Structural UI raster dispatch остаются fail-closed до подтверждённого provider route. GitHub/Cloudflare/Canva не изменялись.

## RC59 Video Studio 2.0 local checkpoint

Series F F41–F60 реализованы локально: Project Storyboard, Shot List, Timeline Editor, Scene Cards, Asset Library, Reference Video Board, per-shot prompt/model intent, Continuity Memory, camera/keyframes/transitions, Voice/Music/SFX, script captions, grading, Render Queue, Proxy Preview, deterministic Video QA и Export Profiles включая explicit 4K. Migration 033 добавлена локально и **не применялась** к Cloudflare D1. Provider video generation и Cloudflare Stream/Media остаются fail-closed до отдельного Model Registry/binding этапа. GitHub/Cloudflare/Canva не изменялись.

### RC59 verification receipt

- `quality:static`: **55 PASS / 0 FAIL / 0 BLOCKED**;
- `quality`: **55 PASS / 0 FAIL / 5 BLOCKED**;
- `series:f:video` and `video:check`: **PASS**;
- UI TypeScript: **PASS**;
- migration catalog: **002–033**;
- production drift: **RECONCILIATION_REQUIRED, 17 remote blockers**, no write attempted;
- host Node: **22.16.0**; canonical release Node: **24.18.0**;
- provider video generation / Stream / Media: **not wired and not claimed**;
- GitHub / Cloudflare / Canva: **read-only only, zero mutations**.

## RC60 Metatron Lab 2.0 local checkpoint

Series F F61–F80 реализованы локально как единый **Agent Operations Center**: Live Mission Graph, Agent Cards, Start/Pause/Resume/Cancel/Terminate, cooperative AbortSignal, WebSocket + durable replay logs, Trace Explorer, token/cost/resource telemetry, checkpoints/resume/read-only replay, safe failed-step retry, `uncertain_effect`, fail-closed reconciliation, fencing, real health probes, pre-dispatch replacement, approvals, simulation-only Fault Injection Lab, Memory Inspector и Decision Explanation Panel.

Migration `034-metatron-lab-2.sql` добавлена локально и **не применялась** к Cloudflare D1. Graph mode пока `derived-linear` из persisted step order и не выдаётся за explicit planner DAG. Automatic replacement не повторяет задачу после начала `run()`. GitHub / Cloudflare / Canva — read-only, zero mutations.

Финальные gate numbers этого exact source tree фиксируются отдельным `VERIFICATION_RC60.json` после итогового manifest/gate pass.


### RC60 final local verification receipt

- `series:f:metatron`: **F61–F80 PASS** + durable schema/safety-boundary checks;
- UI TypeScript: **PASS**;
- fallback browser bundle: **PASS / release_verified=false**;
- `quality:static`: **56 PASS / 0 FAIL / 0 BLOCKED**;
- `quality`: **56 PASS / 0 FAIL / 5 BLOCKED**;
- migration catalog: **002–034**;
- production drift: **RECONCILIATION_REQUIRED, 17 remote blockers**, no write attempted;
- host Node: **22.16.0**; canonical release Node: **24.18.0**;
- GitHub / Cloudflare / Canva: **zero mutations**.


## RC61 Universal Module System 2.0 local checkpoint

Series F F81–F100 реализованы локально одним каноническим `ModuleDefinition + ModuleFrame`: full-tree wrapper, Grip/reorder, Collapse/Expand, Pin, Lock, Rename, Module Settings, Reset, bounded Undo/Redo, Loading/Error/Retry, live status, permission-aware actions, module shortcuts, Module History, Resource Usage и extensible plugin action API.

Duplicate/Delete/Move работают fail-closed: они появляются только если конкретный модуль/host предоставляет безопасный callback и нужные permissions/workspaces. Канонические названия Studio не меняются. Новая D1 migration не требуется; migration catalog остаётся **002–034**. GitHub / Cloudflare / Canva — read-only, zero mutations.

Финальные exact-tree gate numbers фиксируются в `VERIFICATION_RC61.json`.

### RC61 final exact-tree result

- Universal Module System 2.0: **F81–F100 PASS** через один канонический `ModuleDefinition + ModuleFrame`.
- `series:f:modules`: **25/25 contract checks PASS**.
- UI TypeScript: **PASS**.
- Static Quality Gate: **57 PASS / 0 FAIL / 0 BLOCKED**.
- Full Quality Gate: **57 PASS / 0 FAIL / 5 BLOCKED**.
- Latest migration: **034-metatron-lab-2.sql**; для rc.61 новая D1 migration не требуется и remote migration не применялась.
- Пять Full Gate blockers — только environment proof: Node 24/dependency-backed typecheck/build/tests/Wrangler dry-run и live authenticated smoke.
- Duplicate/Delete/Move остаются fail-closed capability actions: без реального host callback действие не показывается и не симулируется.
- GitHub / Cloudflare / Canva: **read-only, zero mutations**.


## RC62 Series G System Intelligence — G01–G10

Series G теперь объединяет существующие Studio/Metatron foundations в один System Intelligence layer: context-ranked Suggestions, Global Memory, Asset Intelligence, Universal Command Palette, immutable System History с fail-closed Undo boundary, Connector Gateway, Resource Ledger 2.0, Mission Graph, Browser QA truth-boundary и real Chromium/CDP E2E runner.

Migration `035-series-g-system-intelligence.sql` — additive-only: `intelligence_memory_policy`, `asset_intelligence_evidence`, `suggestion_feedback`, `system_e2e_runs`. В migration нет `ALTER TABLE`, `UPDATE` или `DELETE`; remote apply не выполнялся.

### RC62 local verification target

- `series:g:check`: **18/18 PASS**;
- UI TypeScript: **PASS**;
- Static Quality Gate: **58 PASS / 0 FAIL / 0 BLOCKED**;
- Full Quality Gate: **58 PASS / 0 FAIL / 6 BLOCKED**;
- additional G09/G10 blocker: live authenticated Chromium proof не может быть выполнен без `AZRAIL_URL` + credential;
- migration catalog: **002–035**;
- production drift: **RECONCILIATION_REQUIRED / 17 blockers**, read-only;
- GitHub / Cloudflare / Canva: **zero mutations**.


## RC63 final cross-cutting closure

После Series F/G закрыты последние сквозные пункты PDF: Universal Compare Mode, Professional Review action workflow и canonical Studio naming/русские descriptors. Compare работает только с реальными saved assets и не модифицирует A/B. `Fix critical` / `Fix all safe issues` выбирают только findings с `safeAutoFix=true`; остальные остаются manual review required. Новая D1 migration не требуется; latest migration остаётся `035-series-g-system-intelligence.sql`. GitHub / Cloudflare / Canva остаются read-only, zero mutations.

Финальные exact-tree numbers фиксируются в `verification/current/VERIFICATION_RC63.json` после итогового Static/Full Gate.


### RC63 final exact-tree result

- `cross:final`: **24/24 PASS**.
- UI TypeScript: **PASS**.
- Static Quality Gate: **59 PASS / 0 FAIL / 0 BLOCKED**.
- Full Quality Gate: **59 PASS / 0 FAIL / 6 BLOCKED**.
- Latest migration: **035-series-g-system-intelligence.sql**; новая migration для rc.63 не требуется.
- Production drift: **RECONCILIATION_REQUIRED / 17 blockers**, read-only.
- GitHub / Cloudflare / Canva: **zero mutations**.
