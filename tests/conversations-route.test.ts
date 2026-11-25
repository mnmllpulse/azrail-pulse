import { describe, expect, it } from "vitest";
import { conversationsRoute } from "../src/routes/conversations";
import type { Env } from "../src/types";
import type { Principal } from "../src/lib/accounts";

const env = {} as Env;
const user = { id: "u", role: "viewer", operator: false } as unknown as Principal;
const call = (method: string, path: string, body: Record<string, unknown> = {}) =>
  conversationsRoute(new Request(`https://x.test${path}`, { method }), new URL(`https://x.test${path}`), env, user, body);

describe("маршруты бесед", () => {
  it("чужие пути и методы идут дальше", async () => {
    expect(await call("GET", "/api/chat")).toBeNull();
    expect(await call("POST", "/api/plan")).toBeNull();
    expect(await call("DELETE", "/api/conversations")).toBeNull();
    expect(await call("GET", "/api/conversations/plan")).toBeNull();
  });
  it("правка беседы без корректного тела отклоняется до обращения к базе", async () => {
    await expect(call("PATCH", "/api/conversations", {})).rejects.toBeTruthy();
  });
});
