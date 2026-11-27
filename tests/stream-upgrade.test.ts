import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("апгрейд WebSocket не пересоздаётся", () => {
  const source = readFileSync("src/index.ts", "utf8");

  it("withTraceHeaders пропускает ответ 101 до new Response", () => {
    const body = source.slice(source.indexOf("function withTraceHeaders"));
    expect(body.indexOf("isUpgradeResponse(response)")).toBeGreaterThan(-1);
    expect(body.indexOf("isUpgradeResponse(response)")).toBeLessThan(body.indexOf("new Response("));
  });

  it("признак апгрейда: статус 101 или webSocket", async () => {
    const { isUpgradeResponse } = await import("../src/lib/upgrade-response");
    expect(isUpgradeResponse({ status: 101 } as Response)).toBe(true);
    expect(isUpgradeResponse({ status: 200, webSocket: {} } as unknown as Response)).toBe(true);
    expect(isUpgradeResponse(new Response("ok"))).toBe(false);
  });
});
