# AZRAIL PULSE Unified 1.5.0-rc.4

RC4 — третий глубокий инженерный проход по локальному ZIP. Никаких публикаций в GitHub и никаких изменений Cloudflare в рамках этого прохода не выполнялось.

## Исправлено

1. **Cancellation race в финализации миссии.** Поздний успешный/ошибочный результат больше не может перезаписать уже выставленный `cancelling`. Если отмена успела первой, финальное состояние становится `cancelled` и сохраняется cancellation-result.
2. **Tenant isolation при отмене `waiting_approval`.** Connector call из checkpoint теперь можно отменить только если он принадлежит тому же account, что и владелец проекта. Чужой opaque call ID не является authorization boundary.
3. **Fail-closed конфигурация квот.** Явный лимит `0` теперь действительно блокирует расход, а не откатывается на permissive fallback. Некорректный заданный лимит также закрывает операцию вместо восстановления дефолта.
4. **Fail-closed `AZRAIL_METERING`.** Любое неизвестное значение кроме `observe`/`enforce` блокирует model call до provider dispatch. Опечатка больше не понижает enforcement молча.
5. **Очистка security-state.** Плановый cleanup удаляет просроченные `web_sessions`, `oidc_states` и `connector_oauth_states` вместе с websocket tickets/quota buckets.
6. **Recovery checkpoint hardening.** Повреждённый `input_json` checkpoint блокирует автоматическое восстановление до повторного запуска и не переводит миссию в queued вслепую.
7. **Benchmark terminal-state consistency.** `runBenchMission()` теперь возвращает отмену, если cancellation выиграл CAS при поздней успешной или аварийной финализации; отчёт benchmark больше не может заявить успех, которого нет в persisted mission state.
8. **Release secret gate.** Локальный pre-push scanner дополнен modern GitHub fine-grained PAT, OpenAI project keys, Slack, Stripe, Google API keys и расширенными private-key headers; он больше не отстаёт от runtime `secret-scan.ts`.

## Не изменено намеренно

- GitHub `main` и отдельная ветка не обновлялись.
- Cloudflare production/staging не деплоились и не менялись.
- Production OIDC provenance всё ещё требует отдельного подтверждения перед любым deploy.
- Исторические verification-файлы не считаются доказательством RC4.
