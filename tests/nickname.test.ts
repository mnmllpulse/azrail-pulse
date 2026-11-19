import { describe, expect, it } from "vitest";
import {
  cleanNickname,
  customNickname,
  nicknameRoute,
} from "../src/unified/nickname";

const kv = () => {
  const m = new Map<string, string>();
  return {
    get: async (k: string) => m.get(k) ?? null,
    put: async (k: string, v: string) => void m.set(k, v),
    delete: async (k: string) => void m.delete(k),
  };
};
const env = () => ({ AZRAIL_KV: kv() }) as never;
const req = (method: string, body?: unknown) =>
  new Request("https://x.dev/auth/nickname", {
    method,
    headers: { Origin: "https://x.dev" },
    body: body ? JSON.stringify(body) : undefined,
  });

describe("ник", () => {
  it("валидирует", () => {
    expect(cleanNickname("  Pulse  ")).toBe("Pulse");
    expect(cleanNickname("Пульс_01")).toBe("Пульс_01");
    for (const bad of ["a", "ab", "<b>x</b>", "x".repeat(40), "", 42, ".a.b."])
      expect(cleanNickname(bad)).toBe("");
  });
  it("сохраняет, отдаёт и удаляет", async () => {
    const e = env();
    expect(
      (
        await nicknameRoute(
          req("PUT", { nickname: "Pulse" }),
          e,
          "a1",
          "https://x.dev",
        )
      ).status,
    ).toBe(200);
    expect(await customNickname(e, "a1")).toBe("Pulse");
    expect(
      (await nicknameRoute(req("DELETE"), e, "a1", "https://x.dev")).status,
    ).toBe(204);
    expect(await customNickname(e, "a1")).toBe("");
  });
  it("требует вход, Origin и валидный ник", async () => {
    const e = env();
    expect(
      (
        await nicknameRoute(
          req("PUT", { nickname: "Pulse" }),
          e,
          undefined,
          "https://x.dev",
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await nicknameRoute(
          req("PUT", { nickname: "Pulse" }),
          e,
          "a1",
          "https://evil.dev",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await nicknameRoute(
          req("PUT", { nickname: "<>" }),
          e,
          "a1",
          "https://x.dev",
        )
      ).status,
    ).toBe(400);
  });
});
