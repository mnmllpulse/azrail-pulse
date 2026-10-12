import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { quickIntent } from "../src/lib/quick-intent";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/**
 * НАЙДЕНО В БОЮ, а не тестами.
 *
 * Задача «Создай страницу-визитку mnmllpulse: тёмная тема, имя, три
 * ссылки» дважды возвращала «Не найдено исходных модулей для анализа».
 * Причина: промпт классификатора описывал answer, generate_ui,
 * security_scan, qa_check и evolution_audit — и НЕ ОПИСЫВАЛ generate_code.
 * Самое частое поручение не было объяснено вовсе, дешёвая модель выбирала
 * из растолкованного, и созидательная задача уходила в QA-агента. Тот
 * искал существующие модули для анализа покрытия, не находил их в пустом
 * проекте и честно отказывался.
 *
 * Ни один тест этого не ловил: все они проверяли МЕХАНИКУ маршрутизации —
 * что метка ведёт к нужному агенту, — и ни один не спрашивал, получает ли
 * модель достаточно сведений, чтобы выбрать верную метку.
 */

describe("Намерение по форме фразы", () => {
  it("просьба создать — это работа с кодом", () => {
    for (const s of [
      "Создай файл index.html с тёмной темой",
      "Напиши скрипт для разбора логов",
      "сделай страницу-визитку",
      "Добавь функцию подсчёта суммы",
      "Почини падающий импорт в модуле",
    ]) {
      expect(["generate_code", "generate_ui"], s).toContain(quickIntent(s));
    }
  });

  it("интерфейсная работа отделяется от прочего кода", () => {
    expect(quickIntent("Создай страницу-визитку: тёмная тема, имя, три ссылки")).toBe("generate_ui");
    expect(quickIntent("Напиши скрипт для разбора логов")).toBe("generate_code");
  });

  it("вопрос выигрывает у действия", () => {
    // «Объясни, как создать компонент» содержит и «объясни», и «создать».
    // Это просьба объяснить, а не задача на вёрстку.
    expect(quickIntent("Объясни, как создать компонент на React")).toBeNull();
    expect(quickIntent("Что такое Durable Objects?")).toBe("answer");
    expect(quickIntent("Чем отличается KV от D1")).toBe("answer");
  });

  it("специализированные намерения разбор не перехватывает", () => {
    // «Создай тесты», «напиши аудит безопасности» — чужие задачи со своими
    // агентами. Перехватив их, узкий разбор повторил бы ту же ошибку, от
    // которой спасает, только в другую сторону.
    for (const s of [
      "Создай тесты для модуля авторизации",
      "Напиши отчёт по уязвимостям",
      "Сделай деплой в продакшн",
      "Создай ветку и закоммить изменения",
    ]) {
      expect(quickIntent(s), s).toBeNull();
    }
  });

  it("длинный текст отдаётся модели", () => {
    // В простыне найдётся сразу всё, и разбор по словам станет вредным.
    const long = "Создай " + "очень подробное описание задачи ".repeat(30);
    expect(quickIntent(long)).toBeNull();
  });

  it("пустая строка ничего не решает", () => {
    expect(quickIntent("")).toBeNull();
    expect(quickIntent("   ")).toBeNull();
  });
});

describe("Классификатор знает про создание кода", () => {
  const orch = src("src/agents/orchestrator-intent.ts");

  it("промпт описывает generate_code", () => {
    // ЭТОГО НЕ БЫЛО, и именно отсюда шёл отказ QA-агента.
    const prompt = orch.slice(orch.indexOf("Классифицируй запрос ровно одним словом"));
    expect(prompt.slice(0, 2500)).toContain("generate_code —");
    expect(prompt.slice(0, 2500)).toContain("СОЗДАТЬ");
  });

  it("каждая метка из списка хоть как-то объяснена модели", () => {
    // Необъяснённая метка не будет выбрана — а значит задачи, которым она
    // предназначена, уедут в чужого агента. Молча.
    const prompt = orch.slice(
      orch.indexOf("Классифицируй запрос ровно одним словом"),
      orch.indexOf("Ответь только этим словом"),
    );
    for (const label of ["answer", "generate_code", "generate_ui", "security_scan", "qa_check", "evolution_audit"]) {
      expect(prompt, `метка ${label} не объяснена`).toContain(`${label} —`);
    }
  });

  it("разбор по форме идёт до обращения к модели", () => {
    const fn = orch.slice(orch.indexOf("export async function classifyTaskIntent"));
    const quick = fn.indexOf("quickIntent(request.payload");
    const model = fn.indexOf('runModel<{ response?: string }>');
    expect(quick).toBeGreaterThan(0);
    expect(quick).toBeLessThan(model);
  });
});
