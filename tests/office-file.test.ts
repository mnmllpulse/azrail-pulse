import { describe, expect, it } from "vitest";
import { diagramModel } from "../ui/diagram";
import { sourcesFrom } from "../src/lib/chat-context";
import { buildOffice } from "../src/lib/office-file";
import { officePlain } from "../src/lib/office-text";

describe("Файлы и схема из чата", () => {
  it("pdf содержит кириллицу в карте символов", () => {
    const file = buildOffice("Сделай pdf\nПривет");
    const text = new TextDecoder().decode(file.bytes);
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("041f");
    expect(file.name.endsWith(".pdf")).toBe(true);
  });

  it("xlsx и pptx читаются обратно", async () => {
    const sheet = buildOffice("Сделай xlsx\nимя, сумма");
    const slides = buildOffice("Сделай презентацию\nПервый тезис");
    expect(await officePlain(sheet.bytes.buffer.slice(sheet.bytes.byteOffset, sheet.bytes.byteOffset + sheet.bytes.byteLength), "xlsx")).toContain("сумма");
    expect(await officePlain(slides.bytes.buffer.slice(slides.bytes.byteOffset, slides.bytes.byteOffset + slides.bytes.byteLength), "pptx")).toContain("Первый тезис");
  });

  it("схема берёт стрелку из фразы", () => {
    const model = diagramModel("Чат -> Файл");
    expect(model.nodes).toEqual(["Чат", "Файл"]);
    expect(model.edges).toEqual([["Чат", "Файл"]]);
  });

  it("поиск не придумывает пустой источник", () => {
    expect(sourcesFrom(["q", [], [], []], {})).toContain("не вернул");
    expect(sourcesFrom(["q", ["AZRAIL"], [], ["https://ru.wikipedia.org/wiki/AZRAIL"]], { AbstractText: "", AbstractURL: "" })).toContain("wikipedia.org");
  });
});
