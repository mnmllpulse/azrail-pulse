import { describe, it, expect } from "vitest";
import { modelIntent, YES, ROLLBACK } from "../ui/chat-settings";

const models = [
  { slug: "@cf/zai-org/glm-5.3", label: "GLM 5.3" },
  { slug: "@cf/zai-org/glm-5.3-flash", label: "GLM 5.3 Flash", free: true },
  { slug: "@cf/openai/gpt-oss-20b", label: "GPT OSS 20B" },
];

describe("смена модели из чата", () => {
  it("точное имя находится, неоднозначное нет", () => {
    expect(modelIntent("переключи на GLM 5.3", models)?.slug).toBe("@cf/zai-org/glm-5.3");
    expect(modelIntent("используй gpt oss", models)?.slug).toBe("@cf/openai/gpt-oss-20b");
    expect(modelIntent("переключи на glm", models)).toBeNull();
    expect(modelIntent("переключи на несуществующую", models)).toBeNull();
  });
  it("автовыбор и бесплатная модель", () => {
    expect(modelIntent("переключи на авто", models)?.slug).toBe("");
    expect(modelIntent("используй бесплатную модель", models)?.slug).toBe("@cf/zai-org/glm-5.3-flash");
  });
  it("обычные фразы не принимаются за команду", () => {
    expect(modelIntent("объясни как переключить модель", models)).toBeNull();
    expect(modelIntent("привет", models)).toBeNull();
  });
  it("подтверждение и откат", () => {
    expect(YES.test("да")).toBe(true);
    expect(YES.test("да, но потом")).toBe(false);
    expect(ROLLBACK.test("откати")).toBe(true);
  });
});
