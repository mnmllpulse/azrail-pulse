import { describe, expect, it } from "vitest";
import { diagnoseLocalError, diagnoseOutput } from "../src/core/local-diagnose";

describe("диагноз ошибок на компьютере", () => {
  it.each([
    ["ENOENT: no such file or directory, open 'C:\\x'", /не существует/],
    ["Назначение уже существует.", /занято/],
    ["EACCES: permission denied", /нет доступа/i],
    ["Фрагмент не найден. Прочитай файл", /local_read/],
    ["Фрагмент встречается 3 раз.", /не уникален/],
    ["'pnpm' is not recognized as an internal or external command", /local_overview/],
    ["Error: Cannot find module 'vite'", /установ/i],
    ["listen EADDRINUSE: address already in use :::3000", /порт/i],
    ["Папка «a» не пуста — сначала", /не пуста/],
  ])("%s", (message, expected) => expect(diagnoseLocalError(message)).toMatch(expected));

  it("неизвестная ошибка — без выдуманного диагноза", () => {
    expect(diagnoseLocalError("что-то странное")).toBeNull();
  });

  it("берёт ошибку из отчёта инструмента", () => {
    expect(diagnoseOutput({ status: "failed", error: "ENOENT: x" })).toMatch(/не существует/);
    expect(diagnoseOutput({ status: "done" })).toBeNull();
  });
});
