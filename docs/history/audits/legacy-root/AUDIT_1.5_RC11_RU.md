# Инженерный аудит AZRAIL PULSE 1.5.0-rc.11

## Область прохода

RC11 проверяет crash/recovery semantics Execution Engine: checkpoint replay, durable plan, replan/rollback budgets и объективный test baseline. Удалённые GitHub/Cloudflare ресурсы использовались только для read-only сверки подключения; mutation/deploy не выполнялись.

## Найденные дефекты

1. **Malformed approval evidence мог быть проигнорирован.** Recovery `waiting_approval` не должен трактовать повреждённый connector result как отсутствие важного side effect. Исправлено fail-closed validation всей checkpoint цепочки.
2. **После restart строился новый план.** Persisted `mission_steps` существовали, но Execution Engine мог повторно делать scout/model planning, расходуя вызовы и создавая две версии плана. Теперь durable plan загружается первым.
3. **Multi-row plan mutation была неатомарной.** Частичный save/advance/revise мог оставить несовместимые статусы. Связанные переходы переведены на D1 batch; ambiguous acknowledgement сверяется повторным чтением.
4. **Replan budget был process-local.** Restart обнулял `MAX_REVISIONS`. Счётчик перенесён в `mission_recovery_state`.
5. **Regression rollback retry был process-local.** Restart мог выдать дополнительный автоматический rollback/retry. Теперь этот бюджет также durable и fail-closed.
6. **Test baseline мог быть переснят после mutation.** Recovery без сохранённого baseline мог измерить уже изменённый workspace и стереть доказательство регрессии. Теперь baseline first-write-wins, а при checkpoint history без durable baseline comparison отключается вместо подмены исходной точки.
7. **Во время RC11 обнаружен локальный compile defect:** после удаления старого `regressions` counter остались две ссылки на переменную. Они заменены на durable-aware `regressionRetryUsed`, а старые source-contract tests обновлены.
8. **Исторические regression tests разошлись с текущими типами.** RC5 вызывал `validateTrustedHttpsUrl` без обязательного label, RC6 создавал `AttachmentRef` без `inputType`. Оба несоответствия исправлены; это важно, потому что полный `tsc` иначе падал бы уже на тестах.

## Архитектурный результат

Recovery теперь строится вокруг правила **durable state is authoritative**: checkpoint, plan, retry budget и baseline нельзя реконструировать догадкой из process memory после restart. Это уменьшает риск повторного model/tool execution и ложного доказательства успешности.

## Что сознательно не делалось

RC11 не выполняет массовую декомпозицию `execution-engine.ts`: сначала нужно получить свежий полный dependency-backed typecheck/Vitest. Также отложены R2 orphan GC/retention worker и Studio artifact retention — это отдельный следующий слой и не должен смешиваться с изменением recovery semantics.

## Release gate

До production обязательны: Node.js 24+, чистый `npm ci`, semantic TypeScript typecheck, полный Vitest, Wrangler dry-run обоих explicit configs, применение migration 011 на disposable staging D1 и smoke/recovery tests. Текущая sandbox-среда предоставляет Node 22.16.0, а offline npm cache неполон (`undici` отсутствует), поэтому dependency-backed gates здесь не объявляются пройденными.
