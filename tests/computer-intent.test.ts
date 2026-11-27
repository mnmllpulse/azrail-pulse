import { describe, expect, it } from "vitest";
import { parseComputerVerdict } from "../src/lib/computer-intent";
import { computerTask, maybeComputerTask } from "../ui/chat-agent";

describe("вход: нужен ли компьютер", () => {
  it("разбирает ответ модели строго", () => {
    for (const yes of ["да", "Да.", " yes", "ДА, нужно"]) expect(parseComputerVerdict(yes), yes).toBe(true);
    for (const no of ["нет", "не знаю", "даже", "", "No"]) expect(parseComputerVerdict(no), no).toBe(false);
  });

  it("слабый признак ловит фразы без «на рабочем столе», но не болтовню", () => {
    for (const t of ["закинь отчёт в папку Загрузки", "выложи видео на ютуб с моего компа", "найди файл resume.pdf у меня"]) expect(maybeComputerTask(t), t).toBe(true);
    for (const t of ["привет", "объясни что такое папка в git", "расскажи про ютуб"]) expect(maybeComputerTask(t), t).toBe(false);
  });

  it("явные фразы по-прежнему идут быстрым путём", () => {
    expect(computerTask("Создай на рабочем столе папку demo")).toBe(true);
    expect(computerTask("привет")).toBe(false);
  });
});
