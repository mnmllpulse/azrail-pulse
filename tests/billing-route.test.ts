import { describe, expect, it } from "vitest";
import { billingRoute } from "../src/routes/billing";

type Run = { sql: string; args: unknown[] };

function fakeEnv(rows: Record<string, unknown[]> = {}) {
  const runs: Run[] = [];
  const env = {
    AZRAIL_METERING: "enforce",
    AZRAIL_D1: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({ run: async () => (runs.push({ sql, args }), {}) }),
        all: async () => ({ results: rows[sql.includes("spend_limits") ? "limits" : sql.includes("model_prices") ? "prices" : "calls"] ?? [] }),
      }),
    },
  };
  return { env: env as never, runs };
}

const call = (method: string, path: string, body: Record<string, unknown> = {}, env: never = fakeEnv().env) =>
  billingRoute(new Request(`https://x${path}`, { method }), new URL(`https://x${path}`), env, body);

describe("billingRoute", () => {
  it.each([
    ["GET", "/api/admin/other"],
    ["PUT", "/api/admin/billing"],
    ["GET", "/api/billing"],
  ])("%s %s не его", async (method, path) => {
    expect(await call(method, path)).toBeNull();
  });

  it("GET отдаёт лимиты, тарифы, неразобранные вызовы и режим учёта", async () => {
    const { env } = fakeEnv({ limits: [{ scope: "global" }], prices: [{ model: "m" }], calls: [{ id: "c1" }] });
    const res = (await call("GET", "/api/admin/billing", {}, env))!;
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ limits: [{ scope: "global" }], prices: [{ model: "m" }], unresolved: [{ id: "c1" }], mode: "enforce" });
  });

  it("POST с лишним полем отклоняется схемой", async () => {
    await expect(call("POST", "/api/admin/billing", { usd: 5, hack: 1 })).rejects.toThrow();
  });

  it("POST бюджета пишет лимит в micro-USD", async () => {
    const { env, runs } = fakeEnv();
    const res = (await call("POST", "/api/admin/billing", { usd: 2.5, scope: "team" }, env))!;
    expect(await res.json()).toEqual({ success: true, mode: "enforce" });
    expect(runs[0].args).toEqual(["team", 2_500_000]);
  });

  it("POST тарифа модели пишет оба тарифа", async () => {
    const { env, runs } = fakeEnv();
    const res = (await call("POST", "/api/admin/billing", { model: "m1", inputRate: 100, outputRate: 200 }, env))!;
    expect(res.status).toBe(200);
    expect(runs[0].args).toContain("m1");
  });

  it("POST сверки несуществующего вызова даёт 409, а не падение", async () => {
    const res = (await call("POST", "/api/admin/billing", { reconcileCallId: "nope", actualMicroUsd: 5 }))!;
    expect(res.status).toBe(409);
    expect(await res.json()).toHaveProperty("error");
  });
});
