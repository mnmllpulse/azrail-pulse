import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("чат не выдумывает созданные файлы и картинки", () => {
  const source = readFileSync("src/agents/answer-agent.ts", "utf8");
  it("промпт запрещает заявлять о создании файла или картинки", () => {
    expect(source).toContain("Никогда не пиши «файл создан», «нарисовано», «готово»");
  });
  it("промпт требует вывести содержимое простого файла блоком кода", () => {
    expect(source).toContain("выведи содержимое блоком кода и прямо скажи, что файла нет");
  });
});
