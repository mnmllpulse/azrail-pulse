import { describe, it, expect } from "vitest";
import { coreEngineSource } from "./helpers/core-source";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ROUTING_POLICY, policyFor, tiersFor, MODEL_REGISTRY } from "../src/lib/model-registry";
import { route } from "../src/lib/model-router";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/**
 * НАЙДЕНО ПРИ РАЗБОРЕ МАРШРУТИЗАЦИИ.
 *
 * Изначальное предположение было «роутер экономит на качестве» — и оно
 * оказалось неверным: политика по умолчанию давно QUALITY_FIRST, а
 * CHEAP_FIRST стоит только у классификации и эмбеддингов, где он уместен.
 *
 * Настоящий дефект был в другом месте и хуже. Собственная работа цикла —
 * планирование, пересборка плана, разведка и ПРОВЕРКА РЕЗУЛЬТАТА — ходила
 * под интентом "chat". Политика chat требует только text_generation: то
 * есть модель без подтверждённого reasoning считалась пригодной решать,
 * выполнена задача или нет.
 */

describe("Собственная работа цикла названа своими именами", () => {
  it("проверка результата — отдельный интент, а не разговор", () => {
    // Проверяющий — последняя преграда между «модель сказала, что сделала»
    // и «засчитано». Отправлять туда модель по правилам обычного разговора
    // значит делать преграду декоративной.
    expect(src("src/core/checker.ts")).toContain('"verify"');
    expect(ROUTING_POLICY.verify.requires).toContain("reasoning");
  });

  it("планирование и пересборка — тоже рассуждение", () => {
    const engine = src("src/core/execution-planning.ts");
    const build = engine.slice(engine.indexOf("async buildPlan"));
    const replan = engine.slice(engine.indexOf("async replanTitles"));
    expect(build.slice(0, 800)).toContain('"plan"');
    expect(replan.slice(0, 1200)).toContain('"plan"');
    expect(ROUTING_POLICY.plan.requires).toContain("reasoning");
  });

  it("разведка ходит под своим интентом", () => {
    const engine = coreEngineSource();
    const block = engine.slice(engine.indexOf('let scoutReport = ""'));
    expect(block.slice(0, 1500)).toContain('"scout"');
    expect(ROUTING_POLICY.scout.requires).toContain("reasoning");
  });

  it("ни один из них не понижается на «мелких» задачах", () => {
    // Оценка сложности идёт по объёму входа, а объём — не сложность.
    // Короткое «перепиши слой авторизации» выглядит мелким. Для проверки и
    // планирования цена такой ошибки — вся миссия.
    for (const intent of ["verify", "plan", "scout"]) {
      const policy = policyFor(intent);
      expect(policy.allowDowngradeOnTrivial, `${intent} не должен понижаться`).toBeFalsy();
      expect(tiersFor(policy, "trivial")).toEqual(policy.prefer);
    }
  });
});

describe("Порядок классов моделей", () => {
  it("проверка и планирование начинают с сильнейшей", () => {
    expect(ROUTING_POLICY.verify.prefer[0]).toBe("frontier");
    expect(ROUTING_POLICY.plan.prefer[0]).toBe("frontier");
  });

  it("у разведки дешёвая — последняя, а не первая", () => {
    // Разведчик, неправильно понявший файл, отправит главный цикл не туда,
    // и стоить это будет не одного вызова, а всей миссии.
    const prefer = ROUTING_POLICY.scout.prefer;
    expect(prefer[0]).toBe("balanced");
    expect(prefer[prefer.length - 1]).toBe("fast");
  });

  it("экономия осталась там, где она уместна", () => {
    // Классификация — одно слово на выходе, и вызывается на каждом
    // свободнотекстовом запросе. Платить за неё сильнейшей моделью
    // бессмысленно: разницы в результате не будет.
    expect(ROUTING_POLICY.classify.prefer[0]).toBe("fast");
    expect(ROUTING_POLICY.embeddings.prefer[0]).toBe("fast");
  });
});

describe("Маршрут действительно строится", () => {
  it("для каждого нового интента находится хотя бы одна модель", () => {
    // Политика, под которую нет ни одной подходящей записи в реестре, —
    // это не строгость, а отказ работать. Такое обнаруживается в бою, а
    // не при чтении конфига.
    for (const intent of ["verify", "plan", "scout"]) {
      const decision = route(intent, { gatewayAvailable: true });
      expect(decision.candidates.length, `${intent}: не нашлось моделей`).toBeGreaterThan(0);
    }
  });

  it("выбор объясним", () => {
    // Объяснение — не украшение: если маршрут свернул не туда, видно, на
    // каком шаге.
    const decision = route("verify", { gatewayAvailable: true });
    expect(decision.reasoning.join(" ")).toContain("reasoning");
  });

  it("у всех кандидатов на проверку подтверждено рассуждение", () => {
    const decision = route("verify", { gatewayAvailable: true });
    for (const m of decision.candidates) {
      expect(m.capabilities, `${m.slug} без reasoning`).toContain("reasoning");
    }
  });

  it("реестр не пуст — иначе все проверки выше ничего не значат", () => {
    expect(MODEL_REGISTRY.length).toBeGreaterThan(0);
  });
});
