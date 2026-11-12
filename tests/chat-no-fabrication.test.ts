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

describe("история чата не содержит служебных блоков", () => {
  it("СОСТОЯНИЕ СВЯЗЕЙ добавляется к запросу модели только после сохранения реплики", () => {
    const source = readFileSync("src/index.ts", "utf8");
    const saved = source.indexOf('await addMessage(env, cid, "user"');
    const appended = source.indexOf("message += supplements;");
    expect(saved).toBeGreaterThan(0);
    expect(appended).toBeGreaterThan(saved);
  });
});

describe("картинка из вложения чата становится образцом для рисования", () => {
  const source = readFileSync("ui/app.ts", "utf8");
  it("вложенное изображение загружается как образец и вложение очищается после сборки", () => {
    expect(source).toContain("async function attachedImageReference()");
    expect(source).toContain("const chosen=imageReference||attachedId;");
    expect(source).toContain("if(attachedId)clearAttachments();");
  });
});
