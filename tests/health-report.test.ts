import { describe, expect, it } from "vitest";
import { healthReport } from "../src/routes/health";

const env = (over: Record<string, unknown> = {}) =>
  ({
    AZRAIL_D1: { prepare: () => ({ all: async () => ({}) }) },
    AZRAIL_KV: { get: async () => null },
    AZRAIL_R2: { head: async () => null },
    AI: {},
    AZRAIL_VECTORIZE: {},
    AZRAIL_QUEUE: {},
    ...over,
  }) as never;
const now = new Date("2026-11-22T12:00:00Z");

describe("healthReport", () => {
  it("healthy: все три сервиса отвечают, код 200", async () => {
    const r = await healthReport(env(), "1.0.0", 9, now);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("healthy");
    expect(r.body.services.map((s) => s.status)).toEqual(["ok", "ok", "ok"]);
    expect(r.body.bindings).toEqual({ ai: "bound", vectorize: "bound", queue: "bound" });
    expect(r.body.agents).toBe(9);
    expect(r.body.timestamp).toBe(now.toISOString());
  });

  it("degraded: упавшая D1 даёт 503 и текст ошибки", async () => {
    const r = await healthReport(env({ AZRAIL_D1: { prepare: () => ({ all: async () => { throw new Error("d1 down"); } }) } }), "1", 0, now);
    expect(r.status).toBe(503);
    expect(r.body.status).toBe("degraded");
    expect(r.body.services[0]).toMatchObject({ name: "d1", status: "error", error: "d1 down" });
  });

  it("degraded: отсутствующий R2 тоже не считается здоровым", async () => {
    const r = await healthReport(env({ AZRAIL_R2: undefined, AI: undefined }), "1", 0, now);
    expect(r.status).toBe(503);
    expect(r.body.services[2]).toMatchObject({ name: "r2", status: "absent", ms: null });
    expect(r.body.bindings.ai).toBe("absent");
  });
});
