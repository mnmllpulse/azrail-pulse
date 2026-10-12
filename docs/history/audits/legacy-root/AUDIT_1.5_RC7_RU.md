# AZRAIL PULSE 1.5.0-rc.7 — инженерный аудит, проход 7

## Статус

RC7 собран только как локальный review candidate. GitHub и Cloudflare использовались только read-only. Публикация, merge, deploy и изменения Worker/D1/KV/R2 не выполнялись.

## 1. Найдена опасная обратная сторона cleanup из RC6

В RC6 `publishWorkspace()` удалял staged R2 objects при любой ошибке D1 head flip. Но ошибка ответа D1 не доказывает, что запись не закоммитилась. Возможен сценарий:

1. новая версия полностью записана в R2;
2. D1 обновил `workspace_heads` на новый prefix;
3. ответ D1 потерян/соединение оборвалось;
4. catch считает publish неуспешным и удаляет R2 objects;
5. D1 head остаётся указывать на уже удалённую workspace version.

Это хуже orphan storage: активный workspace становится битым. RC7 после неоднозначной ошибки перечитывает `workspace_heads`. Если head уже указывает на новый prefix, операция считается успешной и объекты сохраняются. Если D1 доказывает, что prefix не опубликован, staged objects удаляются. Если даже verification-read недоступен, объекты сохраняются и исходная ошибка пробрасывается — fail-safe в пользу сохранности данных.

## 2. Общий R2 consistency boundary

Добавлен `src/lib/r2-consistency.ts`. Он централизует два правила:

- staging cleanup выполняется best-effort;
- после неоднозначной D1 publication ошибки удаление R2 разрешено только если D1 доказал отсутствие ссылки.

Тот же принцип применён к workspace versions, backups, snapshots и agent-produced project versions.

## 3. Backups и snapshots оставляли partial trees

`backupProject()` и `snapshotWorkspace()` могли успеть скопировать несколько объектов, после чего source read/R2 write/D1 insert падал. Частично записанный prefix оставался навсегда.

RC7 удаляет partial objects, если D1 publication ещё не начиналась. Если publication уже была отправлена, сначала проверяется соответствующая строка (`backup_manifests` или `project_versions`) и только после доказанного отсутствия ссылки выполняется cleanup.

## 4. Code/UI version artifacts имели тот же класс ошибки

Code Agent и UI Agent сначала записывали R2, затем `project_versions`. При ошибке D1 задача продолжалась, а R2 objects оставались недостижимыми. RC7 применяет тот же publication protocol и использует UUID в ключах, исключая collision двух сохранений в одну миллисекунду.

## 5. Timeout модели мог создать двойной provider dispatch

`withRetry()` ограничивал вызов через `Promise.race`, но сам `env.AI.run` не получает AbortSignal и может продолжить выполняться после timeout. Старое поведение после timeout могло:

- повторить ту же модель;
- переключиться на fallback-модель;
- получить поздний первый ответ/charge отдельно от уже начатой второй попытки.

RC7 считает timeout неопределённым outcome и останавливает retry/fallback.

## 6. Billing row мог навсегда остаться `running`

Ещё глубже: timeout находился снаружи `meteredCall()`. Поэтому accounting layer вообще не видел timeout и не успевал перевести `model_calls` в `uncertain`. RC7 вводит внутренний provider deadline (55 секунд) внутри `meteredCall`; внешний router deadline остаётся 60 секунд. Теперь сначала accounting фиксирует ambiguous provider outcome, затем router останавливает повтор.

## 7. Backup manifest hardening

Restore ограничивает manifest до 2 МиБ, проверяет тип/размер/sha256/path/key каждой записи и запрещает duplicate path/key. Повреждённый или подменённый manifest не должен приводить к большим чтениям или неочевидному overwrite.

## 8. Version restore memory accounting

Старый лимит 24 МиБ считался через `string.length`, то есть в UTF-16 code units, а не фактических R2 bytes. Кроме того, один большой object мог быть прочитан целиком до проверки общего бюджета. RC7 строит read set по R2 `size`, ограничивает суммарный объём до materialization и проверяет, что metadata не изменилась между list/get.

## Что намеренно не делалось в RC7

- Не удалялись старые snapshots/backups автоматически: retention policy — продуктовая политика, а не безопасный cleanup по умолчанию.
- Не выполнялась массовая декомпозиция 100+ KiB `execution-engine.ts`: сначала закрываются correctness invariants, затем structural refactor с полным dependency-enabled test pipeline.
- Не менялась удалённая Cloudflare/GitHub инфраструктура.

## Блокеры до production

Остаются обязательными fresh `npm ci`, semantic TypeScript check, полный Vitest, Wrangler staging/production dry-run и disposable staging migration/smoke. Production OIDC provenance также остаётся отдельным release gate.
