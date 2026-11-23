import { describe, expect, it } from "vitest";
import {
  chapterCount,
  longTarget,
  parsePlan,
  writeLong,
} from "../ui/long-text";

describe("объём длинного текста", () => {
  it.each([
    ["напиши сказку на 10 страниц по 2000 знаков", 20000],
    ["напиши фантастическую сказку на пять страницц по 10000 знаков", 45000],
    ["напиши статью на 3 страницы", 5400],
    ["напиши рассказ 12000 знаков", 12000],
    ["напиши эссе на 2000 слов", 14000],
  ])("«%s» → %i знаков", (phrase, chars) =>
    expect(longTarget(phrase)?.chars).toBe(chars),
  );

  it("короткое и обычные вопросы идут одним запросом", () => {
    expect(longTarget("напиши сказку на 1 страницу")).toBeNull();
    expect(longTarget("напиши короткую сказку")).toBeNull();
    expect(longTarget("привет")).toBeNull();
  });
  it("предел помечается", () => {
    expect(longTarget("напиши книгу на 10 страниц по 10000 знаков")).toEqual({
      chars: 45000,
      capped: true,
    });
  });
  it("число глав в разумных границах", () => {
    expect(chapterCount(4000)).toBe(2);
    expect(chapterCount(20000)).toBe(7);
    expect(chapterCount(45000)).toBe(10);
  });
  it("план разбирается и добивается до нужного числа", () => {
    expect(parsePlan("1. Начало — кот\n2) Встреча — пёс\nмусор", 3)).toEqual([
      "Начало — кот",
      "Встреча — пёс",
      "Часть 3",
    ]);
  });
});

describe("написание по главам", () => {
  it("план, затем каждая глава отдельным запросом с памятью о плане", async () => {
    const prompts: string[] = [];
    const out = await writeLong({
      message: "напиши сказку на 4 страницы по 1500 знаков",
      chars: 6000,
      capped: false,
      ask: async (prompt) => {
        prompts.push(prompt);
        return prompts.length === 1
          ? "1. Начало — а\n2. Конец — б"
          : `текст главы ${prompts.length - 1}`;
      },
    });
    expect(out).toMatchObject({ done: 2, total: 2 });
    expect(prompts).toHaveLength(3);
    expect(prompts[2]).toContain("Конец предыдущей главы");
    expect(prompts[2]).toContain("заверши текст");
    expect(out.text).toContain("## Начало — а");
    expect(out.text).toContain("текст главы 2");
  });
  it("при сбое готовые главы сохраняются", async () => {
    let calls = 0;
    const out = await writeLong({
      message: "x",
      chars: 9000,
      capped: false,
      ask: async () => {
        calls += 1;
        if (calls === 1) return "1. Начало\n2. Середина\n3. Финал";
        if (calls === 3) throw new Error("Лимит.");
        return "глава";
      },
    });
    expect(out.done).toBe(1);
    expect(out.failed).toBe("Лимит.");
    expect(out.text).toContain("## Начало");
  });
  it("если плана нет, ничего не выдумывается", async () => {
    const out = await writeLong({
      message: "x",
      chars: 9000,
      capped: false,
      ask: async () => {
        throw new Error("нет");
      },
    });
    expect(out.text).toBe("");
    expect(out.failed).toBe("нет");
  });
});
