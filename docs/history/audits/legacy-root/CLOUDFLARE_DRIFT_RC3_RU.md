# Cloudflare drift snapshot — RC3

Read-only snapshot для будущего controlled rollout. Этот документ не является командой на изменение production.

| Контур | Release config | Live snapshot | Статус |
|---|---|---|---|
| Production Worker | `azrail-os` | `azrail-os` | OK |
| Production D1 | `azrail-db` | `azrail-db` | OK |
| Production KV | `AZRAIL_KV` | `AZRAIL_KV` | OK |
| Production R2 | `azrail-artifacts` | `azrail-artifacts` | OK |
| Compatibility date | `2026-09-29` | `2026-08-08` | DRIFT |
| Metering | `enforce` | `observe` | DRIFT |
| Legacy CORS var | absent | `CORS_ORIGIN=*` | DRIFT / cleanup |
| AUTH_MODE | `oidc` | not present as plain binding | VERIFY BEFORE DEPLOY |
| Production OIDC issuer/client | not pinned in ZIP | not present as plain binding | BLOCKER |
| Staging D1/KV/R2 | dedicated staging | dedicated staging | OK |
| Staging OIDC issuer/client | pinned | present | OK |

Никаких remote writes в рамках RC3 не выполнялось.
