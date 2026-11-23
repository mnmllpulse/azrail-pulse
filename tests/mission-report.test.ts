import { describe, expect, it } from "vitest";
import { buildMissionReport, type ReportInput } from "../src/lib/mission-report";

const base: ReportInput = { goal: "Поправить кнопку", status: "completed", steps: [], approvals: [], uncertainCount: 0 };

describe("отчёт миссии", () => {
  it("готовая миссия: сделано, проверено, без «Осталось»", () => {
    const r = buildMissionReport({ ...base, summary: "Кнопка исправлена.", quality: { status: "verified", gates: [{ name: "Тесты", status: "passed" }] }, steps: [{ title: "Найти файл", status: "done" }, { title: "Правка", status: "done" }] });
    expect(r.headline).toBe("Миссия выполнена и проверена.");
    expect(r.text).toContain("Сделано (2 из 2):");
    expect(r.text).toContain("Тесты: пройдена");
    expect(r.text).not.toContain("Осталось");
    expect(r.needsYou).toEqual([]);
  });
  it("не заявляет «проверено», если проверка не подтвердила", () => {
    const r = buildMissionReport({ ...base, status: "unverified", quality: { status: "unverified", reason: "тесты не запускались" } });
    expect(r.headline).toContain("не подтвердила");
    expect(r.checked[0]).toContain("тесты не запускались");
  });
  it("нет записи проверки у завершённой миссии — так и пишет", () => {
    expect(buildMissionReport({ ...base }).checked).toEqual(["Проверка результата не записана."]);
  });
  it("в работе: показывает «Осталось»; ждёт разрешения: просит подтвердить", () => {
    const r = buildMissionReport({ ...base, status: "waiting_approval", steps: [{ title: "А", status: "done" }, { title: "Б", status: "pending" }], approvals: [{ status: "pending", summary: "Запись в a.ts" }] });
    expect(r.text).toContain("Осталось:");
    expect(r.needsYou).toEqual(["Подтвердить: Запись в a.ts"]);
  });
  it("ошибка и неизвестный исход попадают в «Нужно от тебя»", () => {
    const r = buildMissionReport({ ...base, status: "failed", error: "таймаут модели", uncertainCount: 1, steps: [{ title: "А", status: "pending" }] });
    expect(r.text).toContain("Не выполнено:");
    expect(r.needsYou).toHaveLength(2);
    expect(r.needsYou.join(" ")).toContain("таймаут модели");
  });
  it("отмена не выдаёт «cancelled» за причину ошибки", () => {
    const r = buildMissionReport({ ...base, status: "failed", error: "cancelled" });
    expect(r.needsYou).toEqual([]);
  });
});
