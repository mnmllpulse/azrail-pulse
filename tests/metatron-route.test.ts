import { describe, expect, it } from "vitest";
import { metatronRoute } from "../src/routes/metatron";
import type { Env } from "../src/types";
import type { Principal } from "../src/lib/accounts";

const env = {} as Env;
const user = { id: "u", role: "viewer", operator: false } as unknown as Principal;
const call = (method: string, path: string, body: Record<string, unknown> = {}) =>
  metatronRoute(new Request(`https://x.test${path}`, { method }), new URL(`https://x.test${path}`), env, user, body);

describe("маршруты Метатрона", () => {
  it("чужие пути и методы идут дальше", async () => {
    expect(await call("GET", "/api/chat")).toBeNull();
    expect(await call("POST", "/api/mission")).toBeNull();
    expect(await call("DELETE", "/api/metatron/missions")).toBeNull();
  });
  it("список миссий и снимок требуют идентификатор", async () => {
    const list = await call("GET", "/api/metatron/missions");
    expect(list?.status).toBe(400);
    const one = await call("GET", "/api/metatron/mission");
    expect(one?.status).toBe(400);
  });
  it("лаборатория сбоев закрыта для не-владельца", async () => {
    const res = await call("POST", "/api/metatron/fault-injection", { missionId: "m", scenario: "x" });
    expect(res?.status).toBe(403);
  });
});
