import { describe, it, expect } from "vitest";
import { coreEngineSource } from "./helpers/core-source";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");
const engine = coreEngineSource();

/** Блок обработки регрессии тестов целиком. */
const block = (() => {
  const from = engine.indexOf("if (comparison.regressed)");
  return engine.slice(from, engine.indexOf("Рефлексия: опыт должен пережить миссию", from));
})();

describe("Регрессия тестов откатывается, а не выносится на обсуждение", () => {
  it("откат делается сам, без вопроса человеку", () => {
    // Раньше миссия замирала с вопросом «откатить или продолжить?». Для
    // работы с телефона это худший исход: агент трудился десять минут,
    // сломал тесты и встал ждать, пока ты дойдёшь до экрана.
    expect(block).toContain("rollbackWorkspace(this.env, ctx.projectId, snapshotKey, lease!, ctx)");
    expect(block).toContain('"tests.rolled_back"');
  });

  it("после отката миссия продолжается, а не заканчивается", () => {
    // Смысл не в самом откате, а во второй попытке: откатить и встать —
    // это тот же простой, только молча.
    const retry = block.slice(0, block.indexOf("return {"));
    expect(retry).toContain("continue;");
  });

  it("попытка ровно одна", () => {
    // Цикл «сломал — откатил — сломал иначе» сжигает весь бюджет шагов, и
    // каждый его виток выглядит как прогресс.
    expect(block).toContain("claimRegressionRetry(this.env,ctx.missionId,1)");
    expect(engine).toContain("loadMissionRecoveryState(this.env,ctx.missionId)");
    expect(engine).not.toContain("let regressions = 0;");
  });

  it("вторая регрессия зовёт человека и объясняет почему", () => {
    // Дело уже не в подходе, а в понимании задачи — вот тут человек
    // действительно нужен, и он должен знать, что первый откат был.
    expect(block).toContain('status: "needs_input"');
    expect(block).toContain("Автоматический откат/повтор уже использован либо его durable-счётчик недоступен");
  });

  it("без снимка откат не выдумывается", () => {
    // Откатывать некуда — честнее спросить, чем сделать вид, что откатили.
    expect(block).toContain("snapshotKey && ctx.projectId");
  });
});

describe("Модель узнаёт об откате", () => {
  it("откат попадает в историю шагов", () => {
    // Без этой записи следующий шаг строится на убеждении, что правки на
    // месте, и модель продолжит достраивать поверх того, чего больше нет.
    expect(block).toContain('tool: "rollback"');
  });

  it("сказано прямо: написанного больше нет", () => {
    expect(block).toContain("больше нет");
    expect(block).toContain("СЛОМАЛИ тесты");
  });

  it("запрет на повтор того же подхода сформулирован", () => {
    // «Попробуй ещё раз» модель понимает как «сделай то же самое
    // аккуратнее». Нужен явный запрет и требование разобраться.
    expect(block).toContain("не повторяй его");
  });

  it("шаг отмечен как неуспешный", () => {
    // ok: true означал бы для счётчика неудач, что всё идёт хорошо, —
    // а тесты только что сломались.
    const record = block.slice(block.indexOf('tool: "rollback"'));
    expect(record.slice(0, 200)).toContain("ok: false");
  });
});

describe("Событие отката видно", () => {
  it("в карте миссии", () => {
    expect(src("public/index.html")).toContain("'tests.rolled_back'");
  });

  it("в тексте события названо, что именно откачено", () => {
    // «Откатено» без чисел — это сообщение, по которому нельзя проверить,
    // что откат вообще что-то сделал.
    expect(block).toContain("undone.restored");
    expect(block).toContain("undone.removed");
  });

  it("неудавшийся откат не выдаётся за удавшийся", () => {
    expect(block).toContain("Откат не удался");
  });
});
