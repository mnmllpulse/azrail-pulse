import { describe, expect, it } from "vitest";
import { backupsRoute } from "../src/routes/backups";

const call = (method: string, path: string) =>
  backupsRoute(new Request(`https://x${path}`, { method }), new URL(`https://x${path}`), {} as never, {} as never, {}, {} as never);

describe("backupsRoute", () => {
  it.each([
    ["GET", "/api/me"],
    ["GET", "/api/backups/other"],
    ["PUT", "/api/backups"],
    ["GET", "/api/backups/restore"],
    ["POST", "/health"],
  ])("%s %s не его — отдаёт управление дальше", async (method, path) => {
    expect(await call(method, path)).toBeNull();
  });

  it("restore без projectId отклоняется проверкой входных данных", async () => {
    await expect(call("POST", "/api/backups/restore")).rejects.toThrow();
  });
});
