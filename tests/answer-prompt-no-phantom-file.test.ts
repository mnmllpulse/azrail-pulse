import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/agents/answer-agent.ts", "utf8");

describe("промпт ответа", () => {
  it("не провоцирует «Прочитано N из M» без файла", () => {
    expect(source).toContain("Без такой строки и без приложенного файла слово «Прочитано»");
  });
  it("не заводит речь о связях без блока", () => {
    expect(source).toContain("если блока нет — о состоянии связей не заговаривай");
  });
});

describe("вопросы о возможностях", () => {
  it("промпт требует прямого «да» вместо отказа и обрывков", () => {
    expect(source).toContain("Никогда не пиши «не умею рисовать»");
    expect(source).not.toContain("предложи формулировку «нарисуй …»");
  });
});
