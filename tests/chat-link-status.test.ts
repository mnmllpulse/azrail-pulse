import { describe, expect, it } from "vitest";
import { chatSupplements, wantsLinkStatus } from "../src/lib/chat-context";

const env = { GITHUB_TOKEN: "x", MCP_SERVERS: "[]" } as never;

describe("блок состояния связей", () => {
  it.each([
    "какие у тебя подключения?",
    "что ты умеешь",
    "есть доступ к GitHub?",
    "сделай анализ азраил и скажи что ещё не работает",
    "работает ли озвучка",
    "подключена ли Figma",
  ])("«%s» получает блок", (phrase) => expect(wantsLinkStatus(phrase)).toBe(true));

  it.each([
    "привет",
    "ладно клод все исправит",
    "хорошо если я все это сделаю то что я получу на выходе",
    "напиши сказку про красную шапочку",
    "объясни DNS",
    "а теперь нарисуй этого алибабу",
  ])("«%s» не получает блок", (phrase) => expect(wantsLinkStatus(phrase)).toBe(false));

  it("без вопроса о связях в запрос ничего не добавляется", async () => {
    expect(await chatSupplements(env, "привет")).toBe("");
    expect(await chatSupplements(env, "что ты умеешь")).toContain("СОСТОЯНИЕ СВЯЗЕЙ");
  });
});
