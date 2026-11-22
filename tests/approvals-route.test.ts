import { describe, expect, it } from "vitest";
import { approvalsRoute } from "../src/routes/approvals";

const principal = (role: string, id = "u1") => ({ id, role }) as never;

function fakeEnv(approval: Record<string, unknown> | null) {
  return {
    AZRAIL_D1: {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => approval,
          all: async () => ({ results: sql.includes("approval_receipts") ? [{ event_type: "requested" }] : [] }),
        }),
      }),
    },
  } as never;
}

const call = (method: string, path: string, env: never, who = principal("editor"), body: Record<string, unknown> = {}) =>
  approvalsRoute(new Request(`https://x${path}`, { method }), new URL(`https://x${path}`), env, who, body);

describe("approvalsRoute", () => {
  it.each([
    ["GET", "/api/approvals/a/decision"],
    ["POST", "/api/approvals"],
    ["GET", "/api/approvals/a/b/c"],
    ["GET", "/api/me"],
  ])("%s %s не его", async (method, path) => {
    expect(await call(method, path, fakeEnv(null))).toBeNull();
  });

  it("чужое подтверждение не отдаётся обычному аккаунту (404)", async () => {
    const res = (await call("GET", "/api/approvals/a1", fakeEnv({ id: "a1", account_id: "someone-else" })))!;
    expect(res.status).toBe(404);
  });

  it("несуществующее подтверждение даёт 404", async () => {
    const res = (await call("GET", "/api/approvals/nope", fakeEnv(null)))!;
    expect(res.status).toBe(404);
  });

  it("своё подтверждение отдаётся вместе с журналом", async () => {
    const res = (await call("GET", "/api/approvals/a1", fakeEnv({ id: "a1", account_id: "u1" })))!;
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ approval: { id: "a1" }, receipts: [{ event_type: "requested" }] });
  });

  it("администратор видит чужое подтверждение", async () => {
    const res = (await call("GET", "/api/approvals/a1", fakeEnv({ id: "a1", account_id: "someone-else" }), principal("admin", "root")))!;
    expect(res.status).toBe(200);
  });

  it("решение без обязательных полей отклоняется схемой", async () => {
    await expect(call("POST", "/api/approvals/a1/decision", fakeEnv(null), principal("editor"), {})).rejects.toThrow();
  });
});
