# Production Approval Gate — Stage D #36

Production approval — это не кнопка deploy и не разрешение «вообще на будущее». Это короткоживущий локальный receipt, привязанный к точному RC, SOURCE_MANIFEST, GitHub base SHA, reviewed production deployment и хэшам upstream evidence.

Проверяемый рабочий сайт — `azrail-pulse`, deployment `1603300f-0a39-44c8-b79a-39580de6a7d4`. Удалённый `azrail-os` в эту проверку не входит. Проверка и план сами квитанцию не создают. 29 октября квитанция для этого deployment была записана, когда черновые адреса версий были выключены. Затем их снова включили на рабочем сайте и на учебной копии. Эта запись больше не совпадает с живым сайтом и выкладку не разрешает.

## До approval обязаны быть подтверждены

- Node24 suite = `VERIFIED`;
- staging migration = `APPLIED`;
- staging deploy command = `DEPLOY_COMMAND_SUCCEEDED`;
- staging smoke = `VERIFIED` на **новом** deployment ID, а не на baseline;
- staging security verification = `VERIFIED`;
- backup/restore local proof = `VERIFIED_LOCAL_DISPOSABLE`;
- реальный disposable Cloudflare restore drill = `VERIFIED_DISPOSABLE_CLOUD` и `production_targeted=false`;
- canonical UI build = `esbuild` / `release_verified=true`;
- production drift evidence существует; известный drift должен быть явно включён в release reconciliation plan;
- production OIDC issuer/client ID проверены оператором отдельно от staging;
- production preview URLs: `disabled` или доказанно `access-protected`.

## Команды

```sh
npm run production:approval:check
npm run production:approval:plan
npm run production:approval:authorize
```

Первые две команды remote state не меняют. `authorize` тоже **не пишет в GitHub/Cloudflare/Canva** — он только создаёт `.work/production-approval.json` после полного набора evidence и точной owner-фразы.

## Exact owner gate

`authorize` требует все значения одновременно:

```text
AZRAIL_PRODUCTION_APPROVAL=<exact RC version>
AZRAIL_PRODUCTION_APPROVAL_PHRASE=I_APPROVE_PRODUCTION_RELEASE
AZRAIL_EXPECTED_PRODUCTION_DEPLOYMENT=<reviewed production deployment ID>
AZRAIL_PRODUCTION_OIDC_ISSUER=<verified production issuer>
AZRAIL_PRODUCTION_OIDC_CLIENT_ID=<verified production client ID>
AZRAIL_PRODUCTION_PREVIEW_POLICY=disabled|access-protected
```

Если выбран `access-protected`, дополнительно требуется `AZRAIL_PRODUCTION_ACCESS_APP_ID`.

Secret values в receipt не сохраняются. OIDC identity и Access app ID записываются только в виде минимально необходимой metadata/hash proof.

## Когда approval становится недействительным

- изменился source manifest;
- изменился GitHub `main` base SHA;
- изменился production deployment lease;
- RC version изменилась;
- receipt истёк;
- PR/CI изменил payload;
- любой upstream gate перестал быть VERIFIED.

После approval порядок остаётся строгим: **#37 GitHub PR → #38 production release → post-release `production:drift:strict` = ALIGNED**.
