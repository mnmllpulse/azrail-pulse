# AZRAIL 1.5.0-rc.36 — Stage 22 / Professional Pulse Lab

- Pulse Lab преобразован из basic capability/readiness view в read-only System Control Center.
- Добавлены семь обязательных контуров: SYSTEM / AUTH / STORAGE / AI / RUNTIME / RELEASE / HEALTH.
- Добавлены состояния Healthy / Warning / Blocked / Unknown с явным различием между proven probe и binding/config presence.
- D1/KV/R2 проверяются read-only round-trip запросами; Workers AI, Gateway, Sandbox и Queue не вызываются синтетически.
- Добавлен `Build SHA` truth boundary через опциональный `AZRAIL_BUILD_SHA`; значение не фабрикуется.
- Добавлен migration/release evidence surface: latest migration, config drift, last staging smoke.
- Добавлена migration `028-pulse-lab-release-evidence.sql` и canonical `release_evidence` schema для будущего staging/release evidence.
- Добавлены one-hour health counters из существующего event/mission telemetry без создания новых synthetic events.
- Добавлен JSON export System Control report.
- Legacy `renderLab()` удалён, чтобы basic diagnostics UI не существовал параллельно с Professional Pulse Lab.
- Добавлен `pulse:check`; новый architecture gate включён в static Quality Gate и release-preflight.
- GitHub, Cloudflare и Canva использовались только read-only; никакие remote mutations не выполнялись.
