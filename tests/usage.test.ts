import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { extractUsage, UsageLedger, renderUsage } from "../src/lib/usage";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

describe("Извлечение расхода из ответа", () => {
  it("классическая форма Workers AI", () => {
    expect(
      extractUsage({ response: "ok", usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 } }),
    ).toEqual({ promptTokens: 100, completionTokens: 40, totalTokens: 140 });
  });

  it("форма с input/output", () => {
    // Форм ответа у Workers AI несколько, и это уже стоило проекту пяти
    // запусков из шести (router.empty_response). Здесь та же ловушка.
    expect(extractUsage({ usage: { input_tokens: 10, output_tokens: 5 } })).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it("не сообщено — это null, а НЕ ноль", () => {
    // Ноль в отчёте выглядит как «вызов был бесплатным», тогда как на
    // деле мы просто не знаем. Подставленный ноль занизит итог и не
    // заметится никогда.
    expect(extractUsage({ response: "ok" })).toBeNull();
    expect(extractUsage({ usage: {} })).toBeNull();
    expect(extractUsage(null)).toBeNull();
    expect(extractUsage("строка")).toBeNull();
  });

  it("мусор в полях не считается расходом", () => {
    expect(extractUsage({ usage: { prompt_tokens: "сто", completion_tokens: -5 } })).toBeNull();
  });

  it("сумма достраивается, если её не прислали", () => {
    expect(extractUsage({ usage: { prompt_tokens: 7, completion_tokens: 3 } })?.totalTokens).toBe(10);
  });
});

describe("Копилка миссии", () => {
  it("считает вызовы, токены и задачи", () => {
    const l = new UsageLedger();
    l.record({ intent: "plan", model: "a", usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }, attempts: 1 });
    l.record({ intent: "analyze_spec", model: "b", usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 }, attempts: 1 });
    l.record({ intent: "analyze_spec", model: "b", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, attempts: 1 });

    const t = l.totals();
    expect(t.calls).toBe(3);
    expect(t.totalTokens).toBe(47);
    expect(t.byIntent.analyze_spec.calls).toBe(2);
    expect(t.byModel.b.totalTokens).toBe(32);
  });

  it("перебор моделей считается отдельно от вызовов", () => {
    // Неудачные попытки — это СОСТОЯВШИЕСЯ обращения, которые ничего не
    // дали. Считая только успешные, отчёт показывал бы расход меньше, чем
    // он был, — ровно то тихое занижение, на которое проект уже напарывался.
    const l = new UsageLedger();
    l.record({ intent: "verify", model: "c", usage: null, attempts: 3 });
    const t = l.totals();
    expect(t.calls).toBe(1);
    expect(t.modelInvocations).toBe(3);
  });

  it("вызовы без отчёта о расходе считаются отдельно", () => {
    const l = new UsageLedger();
    l.record({ intent: "scout", model: "a", usage: null, attempts: 1 });
    l.record({ intent: "scout", model: "a", usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }, attempts: 1 });
    const t = l.totals();
    expect(t.callsWithoutUsage).toBe(1);
    expect(t.totalTokens, "неотчитавшийся вызов не должен давать фиктивных токенов").toBe(10);
  });

  it("пустая копилка — не ошибка", () => {
    expect(new UsageLedger().totals().calls).toBe(0);
  });
});

describe("Отчёт о расходе", () => {
  it("неполнота данных называется вслух", () => {
    // Отчёт, умолчавший о том, что половина вызовов не отчиталась, хуже
    // отсутствия отчёта: по нему будут делать выводы.
    const l = new UsageLedger();
    l.record({ intent: "plan", model: "a", usage: null, attempts: 1 });
    const text = renderUsage(l.totals());
    expect(text).toContain("без отчёта о расходе: 1");
    expect(text).toContain("занижен");
  });

  it("перебор моделей виден в отчёте", () => {
    const l = new UsageLedger();
    l.record({ intent: "verify", model: "a", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, attempts: 4 });
    expect(renderUsage(l.totals())).toContain("с перебором");
  });

  it("вход и выход показаны раздельно", () => {
    // Раздувшийся вход — переполненный контекст; раздувшийся выход —
    // модель растекается. Это разные болезни и разное лечение.
    const l = new UsageLedger();
    l.record({ intent: "plan", model: "a", usage: { promptTokens: 900, completionTokens: 50, totalTokens: 950 }, attempts: 1 });
    const text = renderUsage(l.totals());
    expect(text).toContain("вход 900");
    expect(text).toContain("выход 50");
  });

  it("пустой отчёт говорит прямо", () => {
    expect(renderUsage(new UsageLedger().totals())).toBe("вызовов моделей не было");
  });
});

describe("Учёт встроен в систему, а не лежит мёртвым кодом", () => {
  it("считает сам маршрутизатор", () => {
    // Только здесь известно число ПЕРЕБРАННЫХ моделей: снаружи неудачные
    // попытки не видны, и учёт по месту вызова занизил бы расход.
    const router = src("src/lib/model-router.ts");
    expect(router).toContain("req.ledger?.record(");
    // Оба пути — и автовыбор, и закреплённая модель: иначе отчёт зависел
    // бы от того, каким способом модель была выбрана.
    expect(router.match(/req\.ledger\?\.record\(/g)?.length).toBe(2);
  });

  it("копилка заводится там, где запускается миссия", () => {
    // Заведённая внутри цикла, она считала бы один шаг и не отвечала бы
    // на вопрос «во что обошлась миссия» — то есть повторила бы судьбу
    // recallContext, которая была написана и никем не вызывалась.
    const missions = src("src/agents/mission-coordinator.ts");
    expect(missions.match(/usage: new UsageLedger\(`/g)?.length).toBe(2);
  });

  it("копилка доходит до каждого вызова цикла", () => {
    const engine = src("src/core/execution-engine.ts");
    expect(engine.match(/ledger: ctx\.usage/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("проверка результата тоже учитывается", () => {
    // Проверка — такой же вызов модели, как остальные; не попав в учёт,
    // она делала бы отчёт неполным.
    expect(src("src/core/checker.ts")).toContain("{ preferredModel, ledger }");
    expect(src("src/core/execution-engine.ts")).toContain("renderChanges(changes), ctx.usage)");
  });

  it("расход попадает в результат миссии и в карту", () => {
    const engine = src("src/core/execution-engine.ts");
    expect(engine).toContain('"usage.summary"');
    expect(engine).toContain("usage,");
    expect(src("public/index.html")).toContain("'usage.summary'");
  });
});
