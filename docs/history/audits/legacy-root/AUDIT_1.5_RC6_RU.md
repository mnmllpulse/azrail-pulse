# AZRAIL PULSE 1.5.0-rc.6 — инженерный аудит, проход 6

## Статус

RC6 собран только как локальный review candidate. GitHub и Cloudflare использовались read-only; публикация, merge, deploy, изменения Worker/D1/KV/R2 и конфигурации не выполнялись.

## 1. Upload: R2 и D1 расходились после частичного сбоя

До RC6 `/api/upload` сначала записывал объект в R2, а затем создавал `resource_owners`. Если D1 падал после успешного `R2.put`, запрос завершался ошибкой, но объект оставался в R2 без авторизационной записи. Пользователь не мог к нему обратиться, а storage leak накапливался.

RC6 сохраняет исходную последовательность, но при ошибке ownership-записи удаляет только что созданный R2 key best-effort и пробрасывает исходную D1-ошибку. Дополнительно переданный, но невалидный `projectId` теперь даёт 400: сервер не маскирует ошибку тихим переходом в inbox.

## 2. Большой текстовый attachment раньше целиком загружался в память

Лимит модели — 256 КиБ текста, но `loadAttachments()` делал `obj.text()` для объекта до 50 МиБ и только потом обрезал строку. Это создавало лишний R2 transfer и пиковое потребление памяти Worker.

RC6 использует официальный R2 ranged read `{offset:0,length:256 KiB}` для oversized text objects. В модель попадает только нужный prefix, а диагностическое поле `bytes` сохраняет исходный размер объекта.

## 3. Workspace publish был логически atomic, но физически оставлял мусор

`publishWorkspace()` правильно переключал `workspace_heads` только после полной записи новой версии. Однако если второй R2 write или D1 head flip падал, уже записанные объекты новой, никогда не опубликованной версии оставались в bucket.

RC6 ведёт список staged keys и удаляет их при любом исключении до успешного head flip. Активная версия по-прежнему не меняется до полной готовности новой.

## 4. Ошибка снятия project lock могла провоцировать повтор side effect

Раньше `finally { await DELETE lock }` означал: работа уже успешно выполнена, затем D1 временно недоступна на cleanup, и клиент получает ошибку. Для внешнего caller это выглядит как failed operation и создаёт соблазн повторить уже выполненную мутацию.

Теперь исходная работа возвращается успешно, а lock-release outage логируется. Если сама работа упала, её исходная ошибка сохраняет приоритет. Stale-lock cleanup закрывает оставшийся lease позже.

## 5. Crash мог оставить operation lock навсегда

Mission reaper переводил stale missions в `failed`, но их `operation_locks` не удалял. После аварии проект мог остаться занятым даже после того, как сама миссия уже признана мёртвой.

RC6 после terminal transition удаляет locks reaped mission IDs. Отдельно удаляются synthetic/orphan leases старше одного часа, только если owner не является активной queued/executing/cancelling mission. Это сохраняет live mission locks.

## 6. OIDC network boundary

Discovery и token exchange использовали `fetch` без `redirect:'error'` и `.json()` без собственного body cap. Для token endpoint 307/308 redirect особенно неприятен: POST body содержит authorization code и, для confidential client, `client_secret`.

RC6:
- запрещает redirect для discovery и token exchange;
- ограничивает оба JSON body до 256 КиБ;
- проверяет, что discovery — JSON object;
- требует явные строковые `authorization_endpoint`, `token_endpoint`, `jwks_uri` и прогоняет их через общий trusted HTTPS validator.

## 7. Studio privacy / capability truth

`/api/studio/capabilities` всегда сообщал `auth:'oidc'`, даже если runtime работал в token mode. `/api/studio/ledger` отдавал обычному authenticated user платформенный daily request budget/commit aggregate. Это не давало доступ к чужим model calls, но раскрывает глобальный usage сигнал.

RC6 сообщает фактический auth mode. Platform aggregate показывается только admin/operator, остальные получают только историю model calls своих проектов.

## Проверки прохода

Фактически выполнены на изменённом RC6:
- release preflight — PASS;
- targeted runtime assertions — 7/7 PASS;
- TypeScript syntax/transpile scan — 173 файлов, 0 ошибок;
- relative TypeScript imports — 550, missing 0;
- strict JSON — 40 файлов, 0 ошибок;
- JSONC tsconfig — 2/2;
- YAML workflows — 2/2;
- Node `.mjs` syntax — PASS;
- shell syntax — PASS;
- production-source secret pattern scan — 125 файлов, 0 findings.

## Остающиеся блокеры перед production

Нет свежего подтверждения полного dependency-enabled pipeline: `npm ci`, semantic `tsc`, весь Vitest, `wrangler ... --dry-run` для staging и production, disposable staging migration/smoke. Production OIDC issuer/client также намеренно не угадываются. Поэтому RC6 остаётся кандидатом для следующего аудита, а не production build.
