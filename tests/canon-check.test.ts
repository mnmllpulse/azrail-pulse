import { describe, it, expect } from "vitest";
import { validateAgainstCanon, summarizeCanon } from "../src/lib/canon-check";
import { CANON } from "../src/lib/canon";

const empty = { calls: [], checks: [], steps: [] };

describe("Canon Validator судит по фактам, а не по впечатлению", () => {
  it("отвечает по всем двадцати одному принципу", () => {
    // Умолчание про принцип читалось бы как «с ним всё хорошо».
    const r = validateAgainstCanon(empty);
    expect(r).toHaveLength(CANON.length);
    expect(r.every((x) => x.evidence.length > 0), "у каждого должно быть основание").toBe(true);
  });

  it("пятнадцать принципов честно помечены непроверяемыми", () => {
    // Вердикт по «Human First» или «Legacy» был бы выдумкой.
    const r = validateAgainstCanon(empty);
    const unver = r.filter((x) => x.verdict === "unverifiable" && x.evidence.includes("ценность"));
    expect(unver).toHaveLength(15);
  });

  it("изменения без плана — нарушение", () => {
    const r = validateAgainstCanon({ ...empty, calls: [{ tool: "write_file", status: "ok" }] });
    const p6 = r.find((x) => x.n === 6)!;
    expect(p6.verdict).toBe("broken");
    expect(p6.evidence).toContain("write_file");
  });

  it("план до изменений — соблюдено", () => {
    const r = validateAgainstCanon({
      ...empty, steps: [{}, {}], calls: [{ tool: "write_file", status: "ok" }],
    });
    expect(r.find((x) => x.n === 6)!.verdict).toBe("held");
  });

  it("«готово» без единой проверки — нарушение", () => {
    // Сердце принципа: качество раньше скорости.
    const r = validateAgainstCanon({ ...empty, status: "done" });
    expect(r.find((x) => x.n === 7)!.verdict).toBe("broken");
  });

  it("незавершённая миссия без проверок не обвиняется", () => {
    // Проверять было нечего — это не нарушение.
    expect(validateAgainstCanon(empty).find((x) => x.n === 7)!.verdict).toBe("unverifiable");
  });

  it("ключи проверены ПОСЛЕ отправки — нарушение", () => {
    // Порядок здесь и есть смысл принципа: проверка после отправки
    // ничего уже не защищает.
    const r = validateAgainstCanon({
      ...empty,
      calls: [{ tool: "open_pr", status: "ok" }, { tool: "secret_scan", status: "ok" }],
    });
    const p12 = r.find((x) => x.n === 12)!;
    expect(p12.verdict).toBe("broken");
    expect(p12.evidence).toContain("ПОСЛЕ");
  });

  it("ключи проверены до отправки — соблюдено", () => {
    const r = validateAgainstCanon({
      ...empty,
      calls: [{ tool: "secret_scan", status: "ok" }, { tool: "open_pr", status: "ok" }],
    });
    expect(r.find((x) => x.n === 12)!.verdict).toBe("held");
  });

  it("выводы без чтения исходников — нарушение", () => {
    const r = validateAgainstCanon({ ...empty, calls: [{ tool: "call_model", status: "ok" }] });
    expect(r.find((x) => x.n === 16)!.verdict).toBe("broken");
  });

  it("результат без единого исполнения нечем обосновать", () => {
    const r = validateAgainstCanon({ ...empty, calls: [{ tool: "call_model", status: "ok" }] });
    expect(r.find((x) => x.n === 10)!.verdict).toBe("broken");
  });

  it("сводка называет нарушения поимённо", () => {
    const s = summarizeCanon(validateAgainstCanon({
      ...empty, status: "done", calls: [{ tool: "write_file", status: "ok" }],
    }));
    expect(s.broken).toBeGreaterThan(0);
    expect(s.violations.join(" ")).toMatch(/Blueprint|Quality/);
    expect(s.held + s.broken + s.unverifiable).toBe(CANON.length);
  });

  it("модель не участвует: вердикт воспроизводим", () => {
    // Чистая функция без сети и без базы — значит результат можно
    // перепроверить вручную, а не поверить на слово.
    const rec = { ...empty, status: "done", calls: [{ tool: "read_file", status: "ok" }] };
    expect(validateAgainstCanon(rec)).toEqual(validateAgainstCanon(rec));
  });
});
