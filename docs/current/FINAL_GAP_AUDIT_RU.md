# Final Gap Audit — AZRAIL 1.5.0-rc.63

Status: current

Этот документ отделяет **закрытые требования PDF** от функций, которые нельзя честно считать production-ready без внешнего provider/runtime/deployment proof.

## Закрыто локально по PDF

- Series E E01–E40 foundations/runtime contracts.
- Series F F01–F100: Music, Image, Video, Metatron, Universal Module System.
- Series G G01–G10: Suggestions, Global Memory, Asset Intelligence, Command Palette, History/Undo, Connector Gateway, Resource Ledger 2.0, Mission Graph, Browser QA truth-boundary, Real E2E runner contract.
- Universal Compare Mode: image/audio/video/text saved assets + Web source snapshot diff.
- Professional Review: Critical/Major/Minor/Improvement, safeAutoFix boundary, Fix critical / Fix all safe / Review manually.
- Canonical Studio names in English with Russian descriptors.

## Намеренно не заявляется как завершённое

### AI Model Registry / Auto Router catalog

Список 243 AI-моделей Cloudflare сохранён как отдельный reference, но по решению владельца **отложен**. Текущий UI не должен притворяться, что весь каталог провайдеров уже прошёл policy/cost/capability review.

### Image provider-backed masked operations

Inpainting, outpainting, object remove/replace и background replace имеют mask/region contracts и UI, но provider dispatch остаётся fail-closed до подтверждённой mask-capable model route.

### Video provider generation

Storyboard/timeline/local proxy/final WebM runtime реализован, но Veo/Seedance/Runway/другие provider generators, Cloudflare Stream и Media Transformations не объявляются подключёнными до отдельного binding/model-registry этапа.

### Node24 dependency-backed release proof

Текущий host: Node 22.16.0. Canonical runtime: Node 24.18.0. Поэтому TypeScript full build, canonical esbuild, Vitest и Wrangler dry-run остаются BLOCKED в Full Gate на этом host.

### Real Browser QA / Real E2E

Runner существует и требует deployed `AZRAIL_URL` + authenticated credential + real Chromium/CDP. Без live target он возвращает BLOCKED и не подменяется static preview QA.

### Production reconciliation

Read-only production evidence остаётся `RECONCILIATION_REQUIRED` с 17 blockers. GitHub, Cloudflare D1/Worker/DNS и Canva не изменялись в local RC workflow.

## Production domain decision

Текущая production architecture target использует один основной домен: `mnmllpulse.com`. `mnmllpulse.org` и `pulse-labs.org` отложены для будущих приложений/продуктов и не включены в текущий deploy target.

## Release rule

Ни один локальный PASS не заменяет Node24 CI, live authenticated Browser QA/E2E, staging receipts, production approval, reviewed GitHub PR и post-deploy production evidence.
