import { describe, expect, it } from "vitest";
import { settingsRoute } from "../src/routes/settings";
import type { Env } from "../src/types";
import type { Principal } from "../src/lib/accounts";

const env = {} as Env;
const guest = { role: "viewer", operator: false } as unknown as Principal;
const call = (method: string, path: string, principal: Principal, body: Record<string, unknown> = {}) =>
  settingsRoute(new Request(`https://x.test${path}`, { method }), new URL(`https://x.test${path}`), env, principal, body);

describe("маршруты настроек", () => {
  it("чужой путь пропускает дальше", async () => {
    expect(await call("GET", "/api/chat", guest)).toBeNull();
    expect(await call("DELETE", "/api/routing-settings", guest)).toBeNull();
  });
  it("режим разрешений меняет только владелец", async () => {
    const res = await call("POST", "/api/admin/permission-mode", guest, { mode: "trusted" });
    expect(res?.status).toBe(403);
  });
  it("команды в контейнере для не-владельца закрыты", async () => {
    const res = await call("POST", "/api/trial/sandbox", guest, { projectId: "p" });
    expect(res?.status).toBe(403);
  });
  it("обновлять список моделей может только владелец", async () => {
    const res = await call("POST", "/api/admin/openrouter-refresh", guest);
    expect(res?.status).toBe(403);
  });
  it("флаги пробных функций проверяют тип", async () => {
    expect((await call("POST", "/api/admin/trial", guest, { speech: "да" }))?.status).toBe(400);
    expect((await call("POST", "/api/admin/trial", guest, { sandbox: 1 }))?.status).toBe(400);
  });
});
