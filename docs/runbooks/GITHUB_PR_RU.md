# Stage D #37 — GitHub PR

Этот этап публикует **ровно тот source tree, который был одобрен Stage D #36**. Сам факт `+` не является разрешением на GitHub mutation. До отдельного разрешения разрешены только локальные проверки и read-only GitHub inspection.

## Безопасные команды

```sh
npm run github:pr:check
npm run github:pr:plan
```

Они не создают branch/commit/PR и не меняют GitHub, Cloudflare или Canva.

## Publication ticket

```sh
npm run github:pr:ticket
```

Команда также **не пишет в GitHub**. Она только создаёт локальный `.work/github-pr-publication-ticket.json`, но лишь если:

1. `.work/production-approval.json` имеет `APPROVED_FOR_GITHUB_PR` для текущего RC;
2. approval не истёк;
3. SHA-256 `SOURCE_MANIFEST.json` совпадает с approval;
4. approval `github_base_sha` совпадает с reviewed `main` lease;
5. `SOURCE_MANIFEST.json` точно соответствует worktree;
6. оператор отдельно выставил `AZRAIL_ALLOW_GITHUB_MUTATION=I_UNDERSTAND` и `AZRAIL_GITHUB_PR_APPROVAL=<current release>`.

Ticket — это scoped authorization для следующего connector-action, не удалённая операция.

## Публикация после отдельного разрешения

Будущая GitHub операция должна идти в строгом порядке:

```text
fresh GET main SHA
  -> compare with approval lease
  -> create unique release branch from exact SHA
  -> publish exact SOURCE_MANIFEST payload including .github/workflows
  -> verify branch tree
  -> open DRAFT PR to main
  -> wait for fresh Verify CI on exact head
  -> inspect diff/file list
  -> only after success mark ready / review / merge according to owner instruction
```

Нельзя переиспользовать старые PR #8 или #12 как release proof для RC46. PR #12 основан на более старом base SHA и его исторический `Verify` run завершился failure; это не fresh CI evidence.

## Особый blocker: workflow publication

В текущем `main` каталог `.github` отсутствует; в истории есть commit `remove .github (PAT lacks workflow scope)`. Поэтому если используемый GitHub credential не способен опубликовать `.github/workflows/check.yml` и `.github/workflows/deploy.yml`, публикация должна завершиться **BLOCKED**. Запрещено молча отправлять ветку без CI workflow.

## CI contract

`Verify` обязан использовать Node из `.nvmrc`, checkout без persisted credentials, `npm ci`, `npm run source:manifest:check`, `npm run quality:static`, `npm run node24:suite`. Production deploy workflow в RC остаётся disabled.

## Завершение #37

Пункт #37 нельзя считать `VERIFIED` только потому, что PR существует. Нужны exact approved source, fresh successful CI on exact head, проверенный diff и свежий base lease. Production release — отдельный пункт #38.
