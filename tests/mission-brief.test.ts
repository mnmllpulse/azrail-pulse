import { describe, expect, it } from "vitest";
import { missionBrief, missionStatusLabel } from "../ui/mission-brief";

const list = (...statuses: string[]) => statuses.map((status) => ({ status }));

describe("сводка миссий", () => {
  it("пусто и спокойно", () => {
    expect(missionBrief([])).toBe("Миссий пока нет.");
    expect(missionBrief(list("completed", "cancelled"))).toBe("Всё спокойно: активных миссий нет.");
  });
  it("перечисляет ожидание, работу, паузу и ошибки", () => {
    expect(missionBrief(list("waiting_approval", "executing", "executing", "paused", "failed"))).toBe("1 ждёт твоего разрешения · 2 миссии идут · 1 на паузе · 1 с ошибкой");
  });
  it("склоняет число миссий", () => {
    expect(missionBrief(list("executing"))).toBe("1 миссия идёт");
    expect(missionBrief(list(...Array(5).fill("executing")))).toBe("5 миссий идут");
    expect(missionBrief(list(...Array(11).fill("queued")))).toBe("11 миссий идут");
  });
  it("подписи статусов человеческие, неизвестный остаётся как есть", () => {
    expect(missionStatusLabel("waiting_approval")).toBe("Ждёт разрешения");
    expect(missionStatusLabel("weird")).toBe("weird");
  });
});
