# Image Studio 2.0 — AZRAIL 1.5.0-rc.58

Источник требований: Series F, пункты F21–F40 пользовательской архитектурной спецификации.

## Что работает локально в RC58

- **F21 Reference Board** — до 8 reference результатов в рабочей области, выбор reference из History/Variants.
- **F22 Smart / Region Suggestions** — контекстные действия меняются при наличии mask.
- **F23 Model Quick Switcher** — `AUTO`, FLUX.2 Klein 4B и FLUX.2 Klein 9B. Расширенный список 243 моделей намеренно не подключён в этой серии.
- **F24 Auto Model Router** — простой generate маршрутизируется в fast model, reference/quality path — в 9B.
- **F25 Layers Panel** — единый layer contract для image/text/mask/effect/background с show/hide, lock, reorder, delete metadata layer.
- **F26 Mask Editor** — Brush, Erase, Size, Feather, Invert, Clear, Save Mask. Mask сохраняется как приватный Image Studio artifact.
- **F32 Variants Grid** — существующий multi-result grid переиспользуется, без второго result store.
- **F33 Image Version History** — genealogy строится из `reference_artifact_id` + `variation_index`; parent → child не выдумывается по времени.
- **F34 Style Lock** — добавляет явную consistency directive в provider prompt.
- **F35 Character/Product Consistency** — разрешается только при наличии reference image.
- **F36 Brand Constraints** — до 8 bounded constraints, сохраняются в image job config и влияют на prompt.
- **F38 Upscale + Restoration** — restoration является контролируемым режимом upscale, без обещания несуществующего отдельного restoration provider.
- **F39 Image QA Agent foundation** — локально измеряет resolution/aspect/format/brand-lock consistency и сохраняет findings через общий `/api/studio/review`.
- **F40 Export Center** — local non-destructive PNG/JPEG/WebP export: Original, Social 1:1, Story 9:16, Web Hero, Product Square.

## Fail-closed границы F27–F31

`Inpainting`, `Outpainting`, `Object Remove`, `Object Replace`, `Background Replace` имеют operation contract, mask contract, region UI и job metadata, но **не подменяются обычным edit prompt**.

До подключения отдельно проверенной mask-capable image model сервер возвращает provider-gated conflict. Это осознанная production граница: AZRAIL не должен показывать region edit как выполненный, если provider не гарантирует применение mask.

## F37 Structural UI Mode

Structural UI Mode также fail-closed для raster provider. Таблицы, интерфейсы и диаграммы должны создаваться структурно в Web Studio pipeline, а не рисоваться как плоская картинка. Поэтому включение Structural UI Mode блокирует raster dispatch вместо создания ложного UI-image результата.

## Provider routing

Текущий reviewed allowlist Image Studio остаётся узким:

- `@cf/black-forest-labs/flux-2-klein-4b` — fast generation;
- `@cf/black-forest-labs/flux-2-klein-9b` — quality/reference/edit/upscale.

Новый пользовательский PDF с 243 моделями сохранён отдельно для будущего Model Registry / Auto Router upgrade и не смешивается с RC58.

## Reliability / security

- exact-body `Idempotency-Key` fence сохранён;
- reference normalisation ≤512 px сохранена;
- mask/reference artifact проходят account ownership + image MIME validation;
- image job config фиксирует mask, style/identity locks, brand constraints, structural/restoration flags и provider;
- provider-gated операции завершаются fail-closed, а не создают фиктивный artifact;
- QA не выдумывает visual/text artifact findings: без vision review model локальный QA явно ограничен измеряемыми metadata checks.

## Release boundary

GitHub, Cloudflare и Canva в RC58 не изменяются. `mnmllpulse.com` остаётся единственным текущим production origin. Production proof по-прежнему требует Node >=24 и полный release gate.
