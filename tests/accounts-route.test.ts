import { describe, expect, it } from "vitest";
import { accountsRoute } from "../src/routes/accounts";

type Run = { sql: string; args: unknown[] };

function fakeEnv(accounts: unknown[] = []) {
  const runs: Run[] = [];
  const env = {
    AZRAIL_D1: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({ run: async () => (runs.push({ sql, args }), {}) }),
        all: async () => ({ results: accounts }),
      }),
    },
  };
  return { env: env as never, runs };
}

const call = (method: string, path: string, body: Record<string, unknown> = {}, env: never = fakeEnv().env) =>
  accountsRoute(new Request(`https://x${path}`, { method }), new URL(`https://x${path}`), env, body);

describe("accountsRoute", () => {
  it.each([
    ["GET", "/api/admin/permissions"],
    ["PUT", "/api/admin/accounts"],
    ["GET", "/api/admin/accounts/revoke"],
    ["POST", "/api/admin/accounts/other"],
    ["GET", "/api/me"],
  ])("%s %s не его", async (method, path) => {
    expect(await call(method, path)).toBeNull();
  });

  it("GET отдаёт список аккаунтов без токенов", async () => {
    const rows = [{ id: "a", name: "n", role: "editor", expires_at: null, disabled: 0 }];
    const res = (await call("GET", "/api/admin/accounts", {}, fakeEnv(rows).env))!;
    expect(await res.json()).toEqual({ accounts: rows });
  });

  it("создание аккаунта с неверной ролью отклоняется схемой", async () => {
    await expect(call("POST", "/api/admin/accounts", { name: "x", role: "god" })).rejects.toThrow();
  });

  it("отзыв аккаунта помечает его отключённым", async () => {
    const { env, runs } = fakeEnv();
    const res = (await call("POST", "/api/admin/accounts/revoke", { accountId: "acc_1" }, env))!;
    expect(await res.json()).toEqual({ success: true });
    expect(runs[0].sql).toContain("disabled=1");
    expect(runs[0].args).toEqual(["acc_1"]);
  });

  it("право включается через INSERT, выключается через DELETE", async () => {
    const on = fakeEnv();
    await call("POST", "/api/admin/permissions", { projectId: "p", capability: "sandbox", enabled: true }, on.env);
    expect(on.runs[0].sql).toContain("INSERT OR IGNORE");
    const off = fakeEnv();
    await call("POST", "/api/admin/permissions", { projectId: "p", capability: "sandbox", enabled: false }, off.env);
    expect(off.runs[0].sql).toContain("DELETE");
  });
});
