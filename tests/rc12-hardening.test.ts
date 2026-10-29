import { describe, expect, it, vi } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { checkpointTool, loadCheckpoints, validateReplayableCheckpoints, UncertainToolError } from "../src/lib/checkpoints";
import { previewR2GarbageCollection, parseR2GcRequest } from "../src/lib/r2-gc";
import { previewRetention, parseRetentionPreviewRequest } from "../src/lib/retention-preview";
import type { Env } from "../src/types";

function envWithDb() {
  const { db, sqlite } = sqliteD1();
  return { env: { AZRAIL_D1: db } as unknown as Env, sqlite, db };
}

describe("RC12 tool receipt provenance", () => {
  it("treats a lost completion acknowledgement as completed when D1 proves the commit", async () => {
    const { env, db } = envWithDb();
    const original = db.batch.bind(db);
    let calls = 0;
    (env.AZRAIL_D1 as unknown as { batch: typeof db.batch }).batch = async (stmts) => {
      calls++;
      const result = await original(stmts);
      if (calls === 2) throw new Error("response lost after commit");
      return result;
    };
    const work = vi.fn(async () => ({ ok: true }));
    await expect(checkpointTool(env, "m", 0, "write_file", { path: "a" }, work, true, "attempt-1"))
      .resolves.toEqual({ ok: true });
    expect(work).toHaveBeenCalledTimes(1);
    const point = (await loadCheckpoints(env, "m"))[0];
    expect(point.status).toBe("completed");
    expect(point.receipt_status).toBe("completed");
    expect(point.receipt_attempt_id).toBe("attempt-1");
  });

  it("never starts work when the reservation commit acknowledgement is lost", async () => {
    const { env, db } = envWithDb();
    const original = db.batch.bind(db);
    let calls = 0;
    (env.AZRAIL_D1 as unknown as { batch: typeof db.batch }).batch = async (stmts) => {
      calls++;
      const result = await original(stmts);
      if (calls === 1) throw new Error("reservation ack lost");
      return result;
    };
    const work = vi.fn(async () => ({ ok: true }));
    await expect(checkpointTool(env, "m", 0, "connector_call", {}, work, true, "attempt-2"))
      .rejects.toBeInstanceOf(UncertainToolError);
    expect(work).not.toHaveBeenCalled();
    const point = (await loadCheckpoints(env, "m"))[0];
    expect(point.status).toBe("running");
    expect(point.receipt_status).toBe("running");
  });

  it("blocks replay when checkpoint and independent receipt disagree", async () => {
    const { env, sqlite } = envWithDb();
    await checkpointTool(env, "m", 0, "read_file", {}, async () => ({ text: "ok" }), false, "attempt-3");
    sqlite.prepare("UPDATE mission_tool_receipts SET result_json='{}' WHERE mission_id='m' AND step=0").run();
    const points = await loadCheckpoints(env, "m");
    expect(() => validateReplayableCheckpoints(points, 4)).toThrow(/receipt/i);
  });
});

describe("RC12 R2 GC preview", () => {
  it("is dry-run, age-gated and protects D1-referenced prefixes", async () => {
    const { env, sqlite } = envWithDb();
    sqlite.exec("INSERT INTO users(id) VALUES('u'); INSERT INTO projects(id,user_id,name) VALUES('p','u','P'); INSERT INTO workspace_heads(project_id,prefix) VALUES('p','projects/p/workspace-versions/live/');");
    const now = Date.UTC(2026, 9, 8);
    const objects = [
      { key: "projects/p/workspace-versions/live/a.ts", size: 10, uploaded: new Date(now - 30 * 86400000) },
      { key: "projects/p/workspace-versions/orphan/a.ts", size: 20, uploaded: new Date(now - 30 * 86400000) },
      { key: "projects/p/workspace-versions/fresh/a.ts", size: 30, uploaded: new Date(now - 60 * 60000) },
    ];
    env.AZRAIL_R2 = {
      list: async ({ prefix }: { prefix?: string }) => ({
        objects: objects.filter((o) => o.key.startsWith(prefix ?? "")), truncated: false,
      }),
    } as never;
    const preview = await previewR2GarbageCollection(env, { scope: "projects", minAgeHours: 24 * 7, now });
    expect(preview.dryRun).toBe(true);
    expect(preview.safeToApply).toBe(false);
    expect(preview.candidates.map((x) => x.key)).toEqual(["projects/p/workspace-versions/orphan/a.ts"]);
  });

  it("rejects unbounded/invalid preview parameters", () => {
    expect(() => parseR2GcRequest(new URL("https://x/api/admin/r2-gc?maxObjects=999999"))).toThrow();
    expect(() => parseR2GcRequest(new URL("https://x/api/admin/r2-gc?minAgeHours=0"))).toThrow();
    expect(() => parseR2GcRequest(new URL("https://x/api/admin/r2-gc?scope=everything"))).toThrow();
  });
});


describe("RC12 retention preview", () => {
  it("protects newest and snapshot-linked versions while only proposing old history", async () => {
    const { env, sqlite } = envWithDb();
    sqlite.exec(`
      INSERT INTO users(id) VALUES('u');
      INSERT INTO projects(id,user_id,name) VALUES('p','u','P');
      INSERT INTO project_versions(id,project_id,version_number,r2_object_key,created_by_agent,created_at) VALUES
        ('v3','p',3,'projects/p/versions/v3/','code-agent','2026-10-01 00:00:00'),
        ('v2','p',2,'projects/p/versions/v2/','execution-engine','2026-01-01 00:00:00'),
        ('v1','p',1,'projects/p/versions/v1/','code-agent','2025-01-01 00:00:00');
      INSERT INTO mission_snapshots(mission_id,r2_key) VALUES('m','projects/p/versions/v2/');
      INSERT INTO studio_artifacts(id,account_id,name,mime,r2_key,bytes,created_at) VALUES
        ('a2','acct','new','text/plain','studio/acct/a2',2,1790812800000),
        ('a1','acct','old','text/plain','studio/acct/a1',1,1735689600000);
    `);
    const now = Date.UTC(2026, 9, 8);
    const preview = await previewRetention(env, { olderThanDays: 30, keepNewest: 1, now });
    expect(preview.safeToApply).toBe(false);
    expect(preview.versionCandidates.map((x) => x.id)).toEqual(["v1"]);
    expect(preview.studioCandidates.map((x) => x.id)).toEqual(["a1"]);
  });

  it("bounds policy inputs", () => {
    expect(() => parseRetentionPreviewRequest(new URL("https://x/api/admin/retention-preview?olderThanDays=1"))).toThrow();
    expect(() => parseRetentionPreviewRequest(new URL("https://x/api/admin/retention-preview?keepNewest=0"))).toThrow();
  });

  it("records a rejected edit as failed and lets the mission continue", async () => {
    const { env } = envWithDb();
    const { ToolRejectedError } = await import("../src/lib/tool-errors");
    await expect(checkpointTool(env, "m", 0, "edit_file", { path: "a" }, async () => { throw new ToolRejectedError("search обязателен."); }, true, "attempt-edit"))
      .rejects.toBeInstanceOf(ToolRejectedError);
    const point = (await loadCheckpoints(env, "m"))[0];
    expect(point.status).toBe("failed");
    expect(point.receipt_status).toBe("failed");
  });
});
