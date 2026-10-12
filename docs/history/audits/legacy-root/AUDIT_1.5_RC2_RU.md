# AZRAIL PULSE 1.5.0-rc.2 — инженерный аудит, проход 1

Этот документ относится только к локальному ZIP-кандидату. Публикация в GitHub и deploy в Cloudflare в этом проходе запрещены.

## Исправлено после RC1

1. **Release provenance.** `README.md`, `START_HERE_RU.md`, `package.json` и `package-lock.json` приведены к текущему RC. Исторический `VERIFICATION.json` оставлен только как доказательство старой 1.4.0.
2. **SOURCE_MANIFEST.** Манифест RC1 был устаревшим: он ссылался на отсутствующие файлы и не совпадал с десятками изменённых файлов. В RC2 он полностью пересоздан с SHA-256 для текущего набора файлов.
3. **Безопасность deploy.** Прямые `deploy`, `deploy:staging` и `deploy:production` в локальном RC намеренно заблокированы. Это исключает случайный publish во время проверки ZIP.
4. **CI verification.** Проверочный workflow теперь обязан прогонять preflight и оба явных Worker dry-run конфига: staging и production.
5. **Approval / recovery.** Найден реальный логический разрыв: миссия в `waiting_approval` могла быть возобновлена после подготовки connector write-вызова, не проверяя, что пользователь действительно подтвердил и успешно выполнил именно эту операцию. RC2 запрещает recovery, пока соответствующая запись `connector_calls` не имеет статус `succeeded`.

## Проверки, реально выполненные в этом проходе

- `release-preflight` — PASS.
- строгий JSON — PASS (tsconfig проверяется как JSONC отдельно).
- package / package-lock version consistency — PASS.
- SHA-256 source manifest — PASS, 0 отсутствующих/несовпадающих файлов.
- синтаксический transpile TypeScript — PASS для 170 `.ts` файлов.
- `node --check` для release/deploy/migrate/smoke скриптов — PASS.

## Что пока нельзя считать проверенным

`npm ci` в текущем изолированном runtime не получил ответ от npm registry и завершился по timeout. Поэтому в этом проходе **не заявляются как пройденные**:

- полноценный TypeScript typecheck с зависимостями;
- Vitest suite;
- UI build через esbuild;
- Wrangler staging dry-run;
- Wrangler production dry-run.

Это ограничение среды проверки, а не доказательство ошибки или исправности исходников.

## Инфраструктурный drift, который проверяем перед будущим deploy

Ранее read-only сверка Cloudflare показала, что текущий production Worker отличается от нового локального target-config: в deployed production оставались более старая compatibility date, `AZRAIL_METERING=observe` и legacy `CORS_ORIGIN=*`. Локальный RC ничего в Cloudflare не меняет. Перед будущей публикацией это нужно проверять сначала на staging, затем отдельным подтверждением на production.

## Следующий проход

1. Повторный статический аудит mission lifecycle / approval / recovery.
2. Проверка policy/auth boundary и внешних side effects.
3. Проверка Studios/UI навигации и сохранения состояния.
4. При доступном npm registry — clean `npm ci`, полный `npm run check`, затем оба Worker dry-run.
5. Только после двух зелёных проходов решать, открывать ли GitHub PR и включать ли deployment pipeline.
