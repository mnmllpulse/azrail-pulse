import { describe, expect, it, vi } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";

const recover = vi.fn(async (id: string) => ({ resumed: id !== "m-busy", ...(id === "m-busy" ? { reason: "Проект занят другой операцией." } : {}) }));
vi.mock("agents", () => ({ getAgentByName: vi.fn(async () => ({ recoverMission: recover })) }));
const { resumeAfterConnectorCall } = await import("../src/lib/approval-resume");

function seed() {
  const { db, sqlite } = sqliteD1();
  const mission = (id: string, project: string, owner: string, status: string, callId: string | null, approval = true) => {
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status) VALUES(?,?,?,?)").run(id, project, "цель", status);
    sqlite.prepare("INSERT OR IGNORE INTO resource_owners(kind,resource_id,account_id) VALUES('project',?,?)").run(project, owner);
    if (callId) sqlite.prepare("INSERT INTO mission_checkpoints(mission_id,step,tool,input_json,result_json,status,updated_at) VALUES(?,?,?,?,?,?,?)")
      .run(id, 1, "connector_call", "{}", JSON.stringify({ id: callId, approvalRequired: approval }), "completed", 1);
  };
  mission("m1", "p1", "me", "waiting_approval", "call-1");
  mission("m-busy", "p2", "me", "waiting_approval", "call-1");
  mission("m-other-call", "p3", "me", "waiting_approval", "call-2");
  mission("m-running", "p4", "me", "executing", "call-1");
  mission("m-stranger", "p5", "stranger", "waiting_approval", "call-1");
  mission("m-no-approval", "p6", "me", "waiting_approval", "call-1", false);
  return { env: { AZRAIL_D1: db, Orchestrator: {} } as unknown as Env };
}

describe("автопродолжение миссии после внешнего действия", () => {
  it("продолжает только свои миссии, ждавшие именно это действие", async () => {
    recover.mockClear();
    const { env } = seed();
    const out = await resumeAfterConnectorCall(env, "me", "call-1");
    expect(out.map((o) => o.missionId).sort()).toEqual(["m-busy", "m1"]);
    expect(recover).toHaveBeenCalledTimes(2);
    expect(out.find((o) => o.missionId === "m1")?.resumed).toBe(true);
    expect(out.find((o) => o.missionId === "m-busy")).toMatchObject({ resumed: false, reason: "Проект занят другой операцией." });
  });
  it("чужое, работающее, не то действие и действие без approval не трогает", async () => {
    recover.mockClear();
    const { env } = seed();
    await resumeAfterConnectorCall(env, "me", "call-1");
    const ids = recover.mock.calls.map((c) => c[0]);
    for (const skipped of ["m-stranger", "m-running", "m-other-call", "m-no-approval"]) expect(ids).not.toContain(skipped);
  });
  it("ошибка не ломает ответ: возвращается причина", async () => {
    recover.mockRejectedValueOnce(new Error("сбой агента"));
    const { env } = seed();
    const out = await resumeAfterConnectorCall(env, "me", "call-1");
    expect(out.some((o) => o.resumed === false && o.reason === "сбой агента")).toBe(true);
  });
  it("ошибка чтения базы даёт пустой результат", async () => {
    const out = await resumeAfterConnectorCall({ AZRAIL_D1: { prepare: () => { throw new Error("db down"); } } } as unknown as Env, "me", "call-1");
    expect(out).toEqual([]);
  });
});
