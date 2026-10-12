# AZRAIL PULSE 1.5.0-rc.3 — инженерный аудит, проход 2

## Область прохода

Второй проход сфокусирован на Mission Lifecycle, Approval/Recovery, Cloudflare configuration provenance и защите от случайной публикации. GitHub и Cloudflare использовались только read-only; рабочая версия собирается локально из RC2.

## Критические/важные находки

### 1. `waiting_approval` нельзя было нормально отменить — исправлено

`requestCancel()` принимал только `queued/executing/cancelling`. Миссия после connector approval переходила в `waiting_approval`, а значит пользователь мог отказаться от внешнего действия, но сама миссия оставалась навсегда подвешенной. Connector call мог быть отменён отдельно, после чего recovery также блокировался.

RC3 закрывает цикл: prepared call CAS-отменяется, pending approval intents помечаются `cancelled`, mission получает terminal `cancelled` + result. Если call уже `running/uncertain`, сервер fail-closed и требует ручной проверки.

### 2. Recovery доверял одному connector call ID — усилено

В RC2 `recoverMission()` проверял `SELECT status FROM connector_calls WHERE id=?`. ID криптографически случайный, но это не должно быть authorization boundary. В RC3 call дополнительно связывается с `resource_owners.account_id` того же проекта.

### 3. Corrupt outbox мог ронять recovery 500 — исправлено

`JSON.parse(mission_outbox.params)` выполнялся без проверки формы. Теперь параметры валидируются до state transition; повреждённая запись блокирует автоматическое восстановление.

### 4. Staging config мог стереть рабочий OIDC binding — исправлено

В live staging присутствуют `OIDC_CLIENT_ID` и `OIDC_ISSUER`, но RC2 `wrangler.staging.json` их не содержал. Будущий deploy из этого файла мог бы удалить plain-text bindings. RC3 закрепляет текущие non-secret значения.

### 5. Local RC всё ещё содержал прямые пути cloud mutation — усилено

Deploy package-команды были выключены, но `deploy-ci`, `provision --apply`, remote `migrate --apply`, старые `db:schema`/`db:security` и отдельный `push-to-github.sh` оставались вызываемыми. Последний ещё и проверял несуществующий корневой `wrangler.toml`, то есть его safety-preflight был устаревшим. RC3 добавляет interlock на уровне cloud/GitHub scripts, блокирует опасные aliases и переводит push-script на актуальные explicit staging/production configs.

## Read-only Cloudflare drift

На момент прохода:

- production Worker: `azrail-os`;
- staging Worker: `azrail-pulse-staging`;
- production D1/KV/R2 совпадают с `wrangler.production.json`;
- staging D1/KV/R2 совпадают с `wrangler.staging.json`;
- production deployed compatibility date: `2026-08-08`, config: `2026-09-29`;
- production deployed metering: `observe`, config: `enforce`;
- production содержит legacy `CORS_ORIGIN=*`;
- production plain-text OIDC issuer/client не доказаны текущим deployment state;
- staging OIDC issuer/client присутствуют и теперь зафиксированы в RC3 config.

**Ничего из drift не менялось удалённо.** Production deploy остаётся blocker до отдельной проверки OIDC и controlled rollout.

## Выполненные проверки RC3

- `release-preflight`: PASS (с ожидаемым warning по production OIDC provenance);
- syntax check всех `scripts/*.mjs`: PASS;
- TypeScript syntax transpile: 170 файлов, 0 syntax errors;
- AST relative imports: 530, 0 missing;
- JSON/JSONC: PASS;
- YAML: PASS;
- shell `bash -n`: PASS;
- targeted runtime test: waiting-approval cancellation → mission/call cancelled: PASS;
- targeted runtime test: external call already running → cancellation blocked: PASS.

## Что пока НЕ доказано

Не воспроизведены `npm ci`, полный TypeScript semantic typecheck, весь Vitest suite и Wrangler dry-run, потому что npm registry в текущей изолированной среде не завершает установку зависимостей. Поэтому RC3 — **review candidate, не production release**.

## Следующий проход (RC4)

1. Full test/typecheck в среде с npm registry.
2. Execution Engine / checkpoint/recovery replay invariants.
3. Billing ledger и fail-closed metering paths.
4. OIDC/session/auth edge cases.
5. Studios/API/UI consistency и dead-code/reference split.
6. Только после нескольких чистых проходов — решение о GitHub/Cloudflare.
