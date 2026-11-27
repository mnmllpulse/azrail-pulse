import { describe, expect, it } from "vitest";
import { stepTitle } from "../ui/mission-view";

describe("названия шагов миссии", () => {
  it.each([
    ["local_mkdir", '{"path":"Рабочий стол/demo"}', "Создаю папку: Рабочий стол/demo"],
    ["local_write", '{"path":"demo/a.txt","content":"привет"}', "Записываю файл: demo/a.txt"],
    ["local_shell", '{"command":"npm test"}', "Выполняю команду: npm test"],
    ["local_status", '{"jobId":"x"}', "Проверяю выполнение"],
    ["local_list", "не json", "Смотрю папку"],
    ["read_file", '{"path":"a"}', "Чтение файла"],
    ["неизвестный", "", "Инструмент"],
  ])("%s → %s", (tool, input, expected) => {
    expect(stepTitle(tool, input)).toBe(expected);
  });

  it("длинное значение обрезается", () => {
    expect(stepTitle("local_read", JSON.stringify({ path: "a".repeat(200) })).length).toBeLessThan(110);
  });
});
