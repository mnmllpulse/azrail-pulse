import { describe, expect, it } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";
import {
  approvalDigest,
  claimApproval,
  completeApproval,
  decideApproval,
  getApproval,
  requestApproval,
} from "../src/lib/approval-engine";

function fixture() {
  const { db, sqlite } = sqliteD1();
  return { env: { AZRAIL_D1: db } as unknown as Env, sqlite };
}

describe("Unified Approval Engine", () => {
  it("binds a human decision to the exact payload and consumes it once", async () => {
    const { env, sqlite } = fixture();
    const digest = await approvalDigest({ repo: "mnmllpulse/azrail-os", head: "feature/x", base: "main" });
    const req = await requestApproval(env, {
      actionType: "github_pr",
      risk: "critical",
      scopeType: "github_pr",
      scopeId: "mnmllpulse/azrail-os:feature/x->main",
      payloadDigest: digest,
      summary: "Open PR",
      requestedBy: "account:a",
      accountId: "a",
    });
    expect(req.status).toBe("pending");
    await decideApproval(env, { id: req.id, actor: "account:admin", decision: "approved", expectedDigest: digest });
    await expect(claimApproval(env, {
      id: req.id,
      actionType: "github_pr",
      scopeType: "github_pr",
      scopeId: "mnmllpulse/azrail-os:feature/x->main",
      payloadDigest: await approvalDigest({ repo: "mnmllpulse/azrail-os", head: "changed", base: "main" }),
      actor: "git:a",
    })).rejects.toThrow(/точным параметрам/);
    await claimApproval(env, { id: req.id, actionType: "github_pr", scopeType: "github_pr", scopeId: "mnmllpulse/azrail-os:feature/x->main", payloadDigest: digest, actor: "git:a" });
    await expect(claimApproval(env, { id: req.id, actionType: "github_pr", scopeType: "github_pr", scopeId: "mnmllpulse/azrail-os:feature/x->main", payloadDigest: digest, actor: "git:a" })).rejects.toThrow();
    await completeApproval(env, { id: req.id, actor: "git:a", outcome: "executed", detail: { pr: 1 } });
    expect((await getApproval(env, req.id))?.status).toBe("executed");
    expect(sqlite.prepare("SELECT COUNT(*) n FROM approval_receipts WHERE approval_id=?").get(req.id)?.n).toBe(4);
  });

  it("uses canonical key ordering in payload digests", async () => {
    expect(await approvalDigest({ b: 2, a: { y: 2, x: 1 } })).toBe(await approvalDigest({ a: { x: 1, y: 2 }, b: 2 }));
  });

  it("rejected approvals never become executable", async () => {
    const { env } = fixture();
    const digest = await approvalDigest({ action: "restore", id: "backup" });
    const req = await requestApproval(env, { actionType: "restore", risk: "critical", scopeType: "backup_restore", scopeId: "p:b:t", payloadDigest: digest, summary: "Restore", requestedBy: "account:a" });
    await decideApproval(env, { id: req.id, actor: "account:admin", decision: "rejected", expectedDigest: digest });
    await expect(claimApproval(env, { id: req.id, actionType: "restore", scopeType: "backup_restore", scopeId: "p:b:t", payloadDigest: digest, actor: "restore:a" })).rejects.toThrow(/не готов/);
  });
});
