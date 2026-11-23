import { describe, expect, it } from "vitest";
import { graphCaption, layerGraph } from "../ui/mission-layers";

const n = (id: string, ...dependencies: string[]) => ({ id, dependencies });
const ids = (layers: Array<Array<{ id: string }>>) => layers.map((l) => l.map((x) => x.id));

describe("уровни графа миссии", () => {
  it("цепочка даёт по узлу на уровень", () => {
    expect(ids(layerGraph([n("a"), n("b", "a"), n("c", "b")]))).toEqual([["a"], ["b"], ["c"]]);
  });
  it("независимые шаги в одном уровне, общий шаг — ниже самой длинной цепочки", () => {
    expect(ids(layerGraph([n("a"), n("b"), n("c", "a"), n("d", "b", "c")]))).toEqual([["a", "b"], ["c"], ["d"]]);
  });
  it("неизвестная зависимость и цикл не ломают расчёт", () => {
    expect(layerGraph([n("a", "ghost")]).length).toBe(1);
    expect(layerGraph([n("a", "b"), n("b", "a")]).flat().length).toBe(2);
  });
  it("подпись объясняет режим без терминов", () => {
    expect(graphCaption("explicit", [[1, 2], [3]])).toContain("по очереди");
    expect(graphCaption("derived-linear", [[1]])).toContain("один за другим");
    expect(graphCaption("explicit", [])).toBe("Шагов пока нет.");
  });
});
