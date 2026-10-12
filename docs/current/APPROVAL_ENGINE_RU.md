# Unified Approval Engine — AZRAIL 1.5.0-rc.25

Этот контур отделяет **решение человека** от **исполнения опасного действия**. Запись запроса не является разрешением, а разрешение не является повторно используемым токеном.

## Состояния

`pending → approved/rejected → executing → executed/failed/uncertain`

Также используются `cancelled` и `expired`.

## Что привязывается к approval

Каждый запрос хранит:

- тип действия;
- риск (`high` / `critical`);
- область и идентификатор операции;
- SHA-256 `payload_digest` точных параметров;
- проект/миссию/аккаунт, если они известны;
- кто запросил и кто решил;
- срок действия;
- журнал receipts.

Изменение хотя бы одного параметра меняет digest. Старый approval после этого непригоден.

## Single-use

После решения `approved` исполнитель обязан выполнить CAS-переход в `executing`. Второй исполнитель тот же approval получить не может. После попытки фиксируется `executed`, `failed` либо `uncertain`.

`uncertain` означает: внешний запрос мог быть принят, но подтверждённый ответ потерян. Автоматический повтор запрещён.

## Подключённые контуры RC23

- Connector mutation — подтверждение точных аргументов MCP-вызова;
- Git external write — создание ветки и запись/обновление файла;
- GitHub PR;
- deployment `repository_dispatch`;
- восстановление backup в новый project;
- автономный запрос `delete_file` / другого approval-risk tool фиксируется, но не исполняется самим mission loop.

`production_migration` и `secret_rotation` уже входят в закрытый action catalog, но операторские CLI остаются дополнительно заблокированы отдельными cloud-mutation interlocks. До release-stage они не получают автоматического пути исполнения из приложения.

## API

- `GET /api/approvals` — список доступных запросов;
- `GET /api/approvals/:id` — запрос и audit receipts;
- `POST /api/approvals/:id/decision` — `approved` или `rejected`; решение опасной операции требует admin role.

Рекомендуется перед решением сверять `payload_digest` с отображаемыми параметрами. Endpoint принимает ожидаемый digest и блокирует решение при несовпадении.

## Запрещённые упрощения

Нельзя:

- исполнять approval-risk tool непосредственно из autonomous loop;
- принимать boolean `confirm=true` без durable exact-payload record для внешней mutation;
- повторно использовать уже claimed approval;
- менять параметры между approval и исполнением;
- считать сетевую неопределённость успешным завершением;
- удалять audit receipts при обычной очистке runtime данных.
