import { sqliteD1 } from "./stubs/sqlite-d1";
import { coreEngineSource } from "./helpers/core-source";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  isTerminal,
  statusForResult,
  reapStaleMissions,
  requestCancel,
  isCancelRequested,
  finishMission,
  staleMinutes,
  DEFAULT_STALE_MINUTES,
} from "../src/lib/mission-state";
import { readKey, lookup, remember } from "../src/lib/idempotency";
import { issueTicket, redeemTicket, TICKET_TTL_SECONDS } from "../src/lib/ws-ticket";
import { checkRateLimit } from "../src/lib/auth";
import type { Env } from "../src/types";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/** Код без комментариев.
 *
 *  В этом проекте комментарии подробные и часто цитируют то, ЧЕГО В КОДЕ
 *  БОЛЬШЕ НЕТ («здесь раньше стоял await engine.runMission(...)»). Поиск
 *  по сырому тексту находит такую цитату и объявляет отсутствующий вызов
 *  присутствующим — проверка «этого больше не вызывается» обязана смотреть
 *  на код, а не на рассказ о нём. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// ─── Заглушки хранилищ ──────────────────────────────────────────────────
// Ровно столько поведения, сколько используют проверяемые функции. Полная
// эмуляция D1 проверяла бы саму эмуляцию.

interface Row {
  id: string;
  status: string;
  updated_at?: string;
  created_at?: string;
}

function fakeD1(rows: Row[], opts: { failOnResultColumn?: boolean } = {}) {
  const {db,sqlite}=sqliteD1();
  for(const row of rows)sqlite.prepare("INSERT INTO missions(id,goal,status,created_at,updated_at) VALUES(?,'test',?,?,?)")
    .run(row.id,row.status,row.created_at??new Date().toISOString(),row.updated_at??row.created_at??new Date().toISOString());
  if(opts.failOnResultColumn)sqlite.exec("ALTER TABLE missions DROP COLUMN result_json");
  return {prepare:db.prepare.bind(db),batch:db.batch.bind(db),get rows(){return sqlite.prepare("SELECT * FROM missions").all() as unknown as Row[];}};
}

function fakeKV(opts: { broken?: boolean } = {}) {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      if (opts.broken) throw new Error("KV недоступен");
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      if (opts.broken) throw new Error("KV недоступен");
      store.set(key, value);
    },
    async delete(key: string) {
      if (opts.broken) throw new Error("KV недоступен");
      store.delete(key);
    },
  };
}

const envWith = (parts: Partial<Env>): Env => parts as Env;

// ─────────────────────────────────────────────────────────────────────────

describe("Миссия исполняется в фоне, а не внутри HTTP-запроса", () => {
  const idx = src("src/index.ts");
  const orch = src("src/agents/orchestrator.ts");
  const missions = src("src/agents/mission-coordinator.ts");
  const engine = coreEngineSource();

  it("роут НЕ ждёт выполнения миссии", () => {
    // Здесь была причина самого дорогого класса отказов: весь цикл из
    // восьми-двадцати шагов с вызовами модели шёл внутри одного запроса.
    // Cloudflare рвёт клиентское соединение примерно на сотой секунде —
    // результат терялся, а строка в missions навсегда оставалась в
    // "executing", потому что финальный UPDATE стоял ПОСЛЕ недостижимого
    // await.
    const from = idx.indexOf('url.pathname === "/api/mission" && request.method === "POST"');
    const mission = code(idx.slice(from, idx.indexOf('url.pathname === "/api/mission/cancel"', from)));
    expect(mission).not.toContain("runMission(");
    expect(mission).not.toContain("new ExecutionEngine");
    expect(mission, "миссия обязана уходить в фон").toContain(".startMission(");
  });

  it("роут отвечает 202: работа принята, но не выполнена", () => {
    const from = idx.indexOf('url.pathname === "/api/mission" && request.method === "POST"');
    const mission = idx.slice(from, idx.indexOf('url.pathname === "/api/mission/cancel"', from));
    expect(mission).toContain('status: "accepted"');
    expect(mission).toContain("202");
  });

  it("цикл живёт в Durable Object и держит объект от выселения", () => {
    // Durable Object выселяется примерно через минуту простоя, а ожидание
    // ответа модели с его точки зрения и есть простой. Без heartbeat
    // длинная миссия рискует умереть на середине — та же потеря работы,
    // от которой уходили, только по другой причине.
    expect(orch).toContain("async runMissionTask(");
    expect(missions).toContain("host.keepAlive()");
    expect(missions).toContain("stopHeartbeat()");
  });

  it("планировщик — штатный из SDK, а не собственный alarm()", () => {
    // Свой alarm() на подклассе Agent перехватывает будильник, на котором
    // SDK держит собственные задачи и heartbeat.
    expect(missions).toContain('host.schedule(0, "runMissionTask"');
    expect(orch).not.toMatch(/\basync alarm\s*\(/);
  });

  it("падение цикла не оставляет миссию висящей", () => {
    const task = missions.slice(missions.indexOf("export async function runScheduledMission("));
    expect(task).toContain("catch");
    expect(task).toContain('finishMission(host.env, missionId, "failed"');
  });

  it("ожидание connector approval нельзя обойти кнопкой восстановления", () => {
    const recovery = missions.slice(missions.indexOf("export async function recoverMission("), missions.indexOf("export async function runScheduledMission("));
    expect(recovery).toContain('mission.status === "waiting_approval"');
    expect(recovery).toContain('requiredApprovalCallIds(replay)');
    expect(recovery).toContain("JOIN resource_owners o ON o.kind='project'");
    expect(recovery).toContain('o.account_id=c.account_id');
    expect(recovery).toContain('call.status !== "succeeded"');
  });
});

describe("Остановка миссии", () => {
  it("флаг ставится, если миссия ещё идёт", async () => {
    const db = fakeD1([{ id: "m1", status: "executing" }]);
    const env = envWith({ AZRAIL_D1: db as unknown as D1Database });
    const res = await requestCancel(env, "m1");
    expect(res).toMatchObject({ ok: true, reason: "cancelling" });
    expect(db.rows[0].status).toBe("cancelling");
  });

  it("завершённую миссию остановить нельзя — и об этом говорится прямо", async () => {
    // Тихое success:true на уже закончившуюся миссию выглядело бы как
    // успешная отмена того, что и так не шло.
    const db = fakeD1([{ id: "m1", status: "completed" }]);
    const env = envWith({ AZRAIL_D1: db as unknown as D1Database });
    expect(await requestCancel(env, "m1")).toMatchObject({ ok: false, reason: "already_finished" });
  });

  it("несуществующая миссия — не найдена, а не отменена", async () => {
    const db = fakeD1([]);
    const env = envWith({ AZRAIL_D1: db as unknown as D1Database });
    expect(await requestCancel(env, "нет-такой")).toMatchObject({ ok: false, reason: "not_found" });
  });
  it("ожидающую approval миссию можно отменить, а подготовленное внешнее действие гасится", async () => {
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status) VALUES('m-wait','p1','test','waiting_approval')").run();
    sqlite.prepare("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('project','p1','a1')").run();
    sqlite.prepare(`INSERT INTO connector_calls(
      id,account_id,connection_id,connection_revision,request_key,tool_name,arguments_cipher,arguments_digest,tools_digest,policy_digest,approval_needed,status,expires_at,created_at,updated_at
    ) VALUES('c-wait','a1','conn1',1,'rk1','write','x','d1','d2','d3',1,'prepared',9999999999999,1,1)`).run();
    sqlite.prepare("INSERT INTO mission_checkpoints(mission_id,step,tool,input_json,result_json,status,updated_at) VALUES('m-wait',0,'connector_call','{}',?,'completed',1)")
      .run(JSON.stringify({id:'c-wait',approvalRequired:true,status:'prepared'}));
    const env = envWith({AZRAIL_D1:db});
    expect(await requestCancel(env,'m-wait')).toMatchObject({ok:true,reason:'cancelled',status:'cancelled'});
    expect(sqlite.prepare("SELECT status FROM missions WHERE id='m-wait'").get()).toMatchObject({status:'cancelled'});
    expect(sqlite.prepare("SELECT status FROM connector_calls WHERE id='c-wait'").get()).toMatchObject({status:'cancelled'});
  });

  it("отмена waiting_approval не может погасить connector_call другого владельца", async () => {
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status) VALUES('m-cross','p1','test','waiting_approval')").run();
    sqlite.prepare("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('project','p1','owner-a')").run();
    sqlite.prepare(`INSERT INTO connector_calls(
      id,account_id,connection_id,connection_revision,request_key,tool_name,arguments_cipher,arguments_digest,tools_digest,policy_digest,approval_needed,status,expires_at,created_at,updated_at
    ) VALUES('c-other','owner-b','conn1',1,'rk-cross','write','x','d1','d2','d3',1,'prepared',9999999999999,1,1)`).run();
    sqlite.prepare("INSERT INTO mission_checkpoints(mission_id,step,tool,input_json,result_json,status,updated_at) VALUES('m-cross',0,'connector_call','{}',?,'completed',1)")
      .run(JSON.stringify({id:'c-other',approvalRequired:true,status:'prepared'}));
    const env = envWith({AZRAIL_D1:db});
    expect(await requestCancel(env,'m-cross')).toMatchObject({ok:false,reason:'external_in_flight',status:'missing_connector_call'});
    expect(sqlite.prepare("SELECT status FROM connector_calls WHERE id='c-other'").get()).toMatchObject({status:'prepared'});
    expect(sqlite.prepare("SELECT status FROM missions WHERE id='m-cross'").get()).toMatchObject({status:'waiting_approval'});
  });

  it("не выдаёт чистую отмену, если внешнее действие уже выполняется", async () => {
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status) VALUES('m-run','p1','test','waiting_approval')").run();
    sqlite.prepare("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('project','p1','a1')").run();
    sqlite.prepare(`INSERT INTO connector_calls(
      id,account_id,connection_id,connection_revision,request_key,tool_name,arguments_cipher,arguments_digest,tools_digest,policy_digest,approval_needed,status,expires_at,created_at,updated_at
    ) VALUES('c-run','a1','conn1',1,'rk2','write','x','d1','d2','d3',1,'running',9999999999999,1,1)`).run();
    sqlite.prepare("INSERT INTO mission_checkpoints(mission_id,step,tool,input_json,result_json,status,updated_at) VALUES('m-run',0,'connector_call','{}',?,'completed',1)")
      .run(JSON.stringify({id:'c-run',approvalRequired:true,status:'prepared'}));
    const env = envWith({AZRAIL_D1:db});
    expect(await requestCancel(env,'m-run')).toMatchObject({ok:false,reason:'external_in_flight',status:'running'});
    expect(sqlite.prepare("SELECT status FROM missions WHERE id='m-run'").get()).toMatchObject({status:'waiting_approval'});
  });

  it("цикл спрашивает про остановку ПЕРЕД вызовом модели", () => {
    // Иначе отмена оплачивала бы ещё один вызов ради права остановиться.
    const engine = coreEngineSource();
    const loop = engine.slice(engine.indexOf("for (let i = checkpoints.length"));
    const abortAt = loop.indexOf("ctx.shouldAbort");
    const decideAt = loop.indexOf("this.decideNextStep(");
    expect(abortAt).toBeGreaterThan(-1);
    expect(abortAt, "проверка останова должна быть до решения шага").toBeLessThan(decideAt);
  });

  it("недоступная база не разрешает продолжать выполнение", async () => {
    // Ошибка чтения должна остановить новые вызовы, сохранив причину сбоя.
    const env = envWith({
      AZRAIL_D1: {
        prepare() {
          return { bind: () => ({ first: async () => { throw new Error("D1 упал"); } }) };
        },
      } as unknown as D1Database,
    });
    await expect(isCancelRequested(env, "m1")).rejects.toThrow("D1 упал");
  });
});

describe("Сборщик зависших миссий", () => {
  it("закрывает только те, что давно не обновлялись", async () => {
    const now = Date.parse("2026-09-15T12:00:00.000Z");
    const old = new Date(now - 60 * 60_000).toISOString();
    const fresh = new Date(now - 60_000).toISOString();
    const db = fakeD1([
      { id: "зависла", status: "executing", updated_at: old },
      { id: "идёт", status: "executing", updated_at: fresh },
      { id: "закончилась", status: "completed", updated_at: old },
    ]);
    const env = envWith({ AZRAIL_D1: db as unknown as D1Database });

    const res = await reapStaleMissions(env, now);
    expect(res.ids).toEqual(["зависла"]);
    expect(db.rows.find((r) => r.id === "идёт")!.status).toBe("executing");
    expect(db.rows.find((r) => r.id === "закончилась")!.status).toBe("completed");
  });

  it("порог настраивается, но имеет разумное умолчание", () => {
    expect(staleMinutes(envWith({}))).toBe(DEFAULT_STALE_MINUTES);
    expect(staleMinutes(envWith({ AZRAIL_MISSION_STALE_MINUTES: "5" }))).toBe(5);
    // Мусор в переменной не должен превращаться в NaN-минут: тогда
    // сборщик замолчал бы навсегда и никто бы этого не заметил.
    expect(staleMinutes(envWith({ AZRAIL_MISSION_STALE_MINUTES: "нисколько" }))).toBe(DEFAULT_STALE_MINUTES);
    expect(staleMinutes(envWith({ AZRAIL_MISSION_STALE_MINUTES: "-3" }))).toBe(DEFAULT_STALE_MINUTES);
  });

  it("крон объявлен в конфиге — иначе сборщик никогда не запустится", () => {
    const wrangler = JSON.parse(src("wrangler.staging.json"));
    expect(wrangler.triggers.crons).toContain("*/10 * * * *");
    expect(src("src/index.ts")).toContain("async scheduled(");
  });
});

describe("Финальный статус миссии", () => {
  it("отмена не выдаётся за поломку", () => {
    expect(statusForResult({ status: "failed", error: "cancelled" })).toBe("cancelled");
    expect(statusForResult({ status: "failed", error: "boom" })).toBe("failed");
    expect(statusForResult({ status: "done" })).toBe("unverified");
    expect(statusForResult({ status: "done", quality: { status: "verified" } })).toBe("completed");
    expect(statusForResult({ status: "needs_input" })).toBe("waiting_approval");
  });

  it("terminal-статусы перечислены честно", () => {
    expect(isTerminal("executing")).toBe(false);
    expect(isTerminal("cancelling")).toBe(false);
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("unverified")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal(undefined)).toBe(false);
  });

  it("база без колонки result_json не оставляет миссию висящей", async () => {
    // Миграция применяется отдельной командой. До неё первый UPDATE падает
    // на "no such column" — и без запасного пути миссия осталась бы в
    // "executing" навсегда, хотя работа выполнена.
    const db = fakeD1([{ id: "m1", status: "executing" }], { failOnResultColumn: true });
    const env = envWith({ AZRAIL_D1: db as unknown as D1Database });
    await finishMission(env, "m1", "completed", { status: "done", agent: "t", summary: "готово" });
    expect(db.rows[0].status).toBe("completed");
  });
});

describe("Идемпотентность запуска", () => {
  it("повтор с тем же ключом отдаёт ту же миссию", async () => {
    const kv = fakeKV();
    const env = envWith({ AZRAIL_KV: kv as unknown as KVNamespace });
    expect(await lookup(env, "mission", "k1")).toBeNull();
    await remember(env, "mission", "k1", "mission-1");
    expect((await lookup(env, "mission", "k1"))?.missionId).toBe("mission-1");
  });

  it("ключ из заголовка проверяется по форме", () => {
    const req = (v?: string) => new Request("https://x/", v ? { headers: { "Idempotency-Key": v } } : undefined);
    expect(readKey(req("abc-123_X"))).toBe("abc-123_X");
    expect(readKey(req())).toBe("");
    // Ключ попадает в имя записи KV. Принимать его без границ — значит
    // разрешить чужому забить пространство имён.
    expect(readKey(req("x".repeat(300)))).toBe("");
    expect(readKey(req("has space"))).toBe("");
    expect(readKey(req("semi;colon"))).toBe("");
  });

  it("недоступный KV не мешает запустить работу", async () => {
    // Отсутствие защиты от дубля хуже, чем невозможность работать вовсе.
    const env = envWith({ AZRAIL_KV: fakeKV({ broken: true }) as unknown as KVNamespace });
    expect(await lookup(env, "mission", "k1")).toBeNull();
    await expect(remember(env, "mission", "k1", "m1")).resolves.toBeUndefined();
  });
});

describe("Билет для WebSocket", () => {
  it("гасится при первом использовании", async () => {
    // Иначе это просто токен покороче: подсмотренный в логах билет
    // работал бы столько же, сколько живёт.
    const kv = fakeKV();
    const env = envWith({ AZRAIL_KV: kv as unknown as KVNamespace, AZRAIL_D1: sqliteD1().db });
    const { ticket, expiresIn } = await issueTicket(env, "shared");
    expect(expiresIn).toBe(TICKET_TTL_SECONDS);
    expect(await redeemTicket(env, ticket)).toBe("shared");
    expect(await redeemTicket(env, ticket)).toBeNull();
  });

  it("чужой билет не проходит, недоступный KV — тоже", async () => {
    const env = envWith({ AZRAIL_KV: fakeKV() as unknown as KVNamespace });
    expect(await redeemTicket(env, "выдуманный")).toBeNull();
    expect(await redeemTicket(env, "")).toBeNull();

    const broken = envWith({ AZRAIL_KV: fakeKV({ broken: true }) as unknown as KVNamespace });
    expect(await redeemTicket(broken, "что-угодно")).toBeNull();
  });

  it("интерфейс больше не кладёт постоянный токен в адрес сокета", () => {
    const html = src("public/index.html");
    expect(html).not.toContain("/api/stream?token=");
    expect(html).toContain("/api/stream?ticket=");
    expect(html).toContain("/api/stream/ticket");
  });
});

describe("Лимит расхода закрывается при сбое, а не открывается", () => {
  it("недоступный KV запрещает запуск", async () => {
    // Раньше здесь стояло allowed: true — защита кошелька снималась ровно
    // в тот момент, когда переставала работать.
    const env = envWith({ AZRAIL_KV: fakeKV({ broken: true }) as unknown as KVNamespace });
    const res = await checkRateLimit(env, "shared", 1);
    expect(res.allowed).toBe(false);
  });

  it("атомарный D1 учитывает полную стоимость", async () => {
    const env = envWith({ AZRAIL_KV: fakeKV() as unknown as KVNamespace, AZRAIL_D1: sqliteD1().db, AZRAIL_HOURLY_LIMIT: "3" });
    expect((await checkRateLimit(env, "u", 1)).allowed).toBe(true);
    expect((await checkRateLimit(env, "u", 1)).allowed).toBe(true);
    // Полная стоимость проверяется ДО списания: задача ценой 2 при одном
    // свободном месте не должна пролезать.
    expect((await checkRateLimit(env, "u", 2)).allowed).toBe(false);
    expect((await checkRateLimit(env, "u", 1)).allowed).toBe(true);
  });
});

describe("Неизвестный путь отдаёт приложение", () => {
  const idx = src("src/index.ts");

  it("биндинг ASSETS наконец читается кодом", () => {
    // Он был объявлен в wrangler.toml и не использовался ни одной строкой:
    // любая опечатка в адресе выдавала голый текст «Core API Running».
    expect(idx).toContain("env.ASSETS.fetch(");
    expect(src("src/types.ts")).toContain("ASSETS?: Fetcher");
  });

  it("под страницу не подменяются ответы API", () => {
    // Промахнувшийся запрос к /api/… должен получить честную ошибку, а не
    // HTML, который он не сможет разобрать.
    const block = idx.slice(idx.indexOf("Неизвестный путь отдаёт ПРИЛОЖЕНИЕ"));
    expect(block).toContain('!url.pathname.startsWith("/api/")');
    expect(block).toContain('includes("text/html")');
  });
});
