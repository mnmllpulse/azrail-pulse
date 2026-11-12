import { describe, expect, it } from "vitest";
import { dedupeTitles } from "../src/core/planner";

describe("dedupeTitles", () => {
  it("убирает повтор выполненного шага, повторы внутри списка и пустые строки", () => {
    expect(dedupeTitles(["Прочитать src/app.ts"], ["прочитать  src/app.ts!", "Внести правку", "внести правку.", "  "]))
      .toEqual(["Внести правку"]);
  });
  it("пустой вход даёт пустой результат", () => {
    expect(dedupeTitles([], [])).toEqual([]);
  });
});
