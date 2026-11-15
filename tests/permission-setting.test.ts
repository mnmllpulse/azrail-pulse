import { describe, it, expect } from "vitest";
import { readPermissionMode, writePermissionMode } from "../src/lib/permission-setting";
import { MODE_LABELS } from "../ui/permission-settings";
import type { Env } from "../src/types";

const kv = (initial?: string, broken = false) => {
  let value = initial;
  return {
    get: async () => { if (broken) throw new Error("kv"); return value ?? null; },
    put: async (_k: string, v: string) => { value = v; },
  };
};
const env = (over: Record<string, unknown>) => over as unknown as Env;

describe("режим разрешений", () => {
  it("сохранённое значение важнее конфигурации; по умолчанию trusted", async () => {
    expect(await readPermissionMode(env({ AZRAIL_KV: kv("ask"), AZRAIL_PERMISSION_MODE: "trusted" }))).toBe("ask");
    expect(await readPermissionMode(env({ AZRAIL_KV: kv(), AZRAIL_PERMISSION_MODE: "ask" }))).toBe("ask");
    expect(await readPermissionMode(env({ AZRAIL_KV: kv() }))).toBe("trusted");
  });
  it("мусор в хранилище читается как trusted, сбой KV закрывает до ask", async () => {
    expect(await readPermissionMode(env({ AZRAIL_KV: kv("root") }))).toBe("trusted");
    expect(await readPermissionMode(env({ AZRAIL_KV: kv(undefined, true), AZRAIL_PERMISSION_MODE: "trusted" }))).toBe("ask");
  });
  it("записать можно только ask или trusted", async () => {
    const store = kv();
    const e = env({ AZRAIL_KV: store });
    expect(await writePermissionMode(e, "ask")).toBe("ask");
    expect(await readPermissionMode(e)).toBe("ask");
    await expect(writePermissionMode(e, "autonomous")).rejects.toThrow();
    await expect(writePermissionMode(e, 1)).rejects.toThrow();
  });
  it("в интерфейсе те же два режима", () => {
    expect(Object.keys(MODE_LABELS).sort()).toEqual(["ask", "trusted"]);
  });
});
