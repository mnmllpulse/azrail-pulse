import { describe, expect, it } from "vitest";
import { markBlockedNodes, missionStatusView } from "../src/lib/metatron-ops";

const base = { status: "executing", pendingApprovals: [], uncertainCount: 0, blockedNodes: 0 };

describe("статус миссии для человека", () => {
  it("ожидающее разрешение важнее всего и несёт причину", () => {
    const view = missionStatusView({ ...base, uncertainCount: 1, pendingApprovals: [{ summary: "Запись в src/a.ts" }] });
    expect(view).toMatchObject({ state: "waiting_approval", label: "Ждёт твоего разрешения", reason: "Запись в src/a.ts" });
  });
  it("статус waiting_approval без записи тоже ждёт разрешения", () => {
    expect(missionStatusView({ ...base, status: "waiting_approval" }).state).toBe("waiting_approval");
  });
  it("неизвестный исход внешнего действия блокирует", () => {
    expect(missionStatusView({ ...base, uncertainCount: 1 }).state).toBe("blocked");
  });
  it("заблокированные шаги блокируют миссию", () => {
    expect(missionStatusView({ ...base, blockedNodes: 2 }).state).toBe("blocked");
  });
  it("обычные статусы", () => {
    expect(missionStatusView(base).state).toBe("running");
    expect(missionStatusView({ ...base, status: "paused" }).state).toBe("paused");
    expect(missionStatusView({ ...base, status: "completed" }).label).toBe("Готово");
    expect(missionStatusView({ ...base, status: "unverified" }).label).toBe("Готово, не проверено");
    expect(missionStatusView({ ...base, status: "failed" }).state).toBe("failed");
    expect(missionStatusView({ ...base, status: "cancelled" }).state).toBe("stopped");
  });
});

describe("заблокированные шаги", () => {
  const node = (id: string, status: string, dependencies: string[] = []) => ({ id, status, dependencies });
  it("шаг после упавшего становится blocked, цепочка тоже", () => {
    const out = markBlockedNodes([node("a", "failed"), node("b", "waiting", ["a"]), node("c", "waiting", ["b"])]);
    expect(out.map((n) => n.status)).toEqual(["failed", "blocked", "blocked"]);
  });
  it("независимый шаг и готовые шаги не трогаем", () => {
    const out = markBlockedNodes([node("a", "failed"), node("b", "waiting"), node("c", "succeeded", ["a"])]);
    expect(out.map((n) => n.status)).toEqual(["failed", "waiting", "succeeded"]);
  });
});
