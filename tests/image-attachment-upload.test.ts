import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateJsonObject } from "../src/lib/request-body";

const manager = readFileSync("ui/attachment-manager.ts", "utf8");

describe("картинка во вложении чата", () => {
  it("в запрос уходят только вложения с ключом хранилища", () => {
    expect(manager).toContain("i.state==='ready'&&i.ref?.r2Key");
  });
  it("картинка грузится в хранилище, если есть проект, а при сбое остаётся локальной", () => {
    expect(manager).toContain("isImage(item.file)&&!deps.getProjectId()");
    expect(manager).toContain("if(isImage(item.file)){item.state='ready'");
  });
  it("сервер по-прежнему отклоняет вложение без r2Key", () => {
    expect(() => validateJsonObject({ attachments: [{ fileName: "a.png", inputType: "image" }] })).toThrow("Некорректное вложение");
    expect(() => validateJsonObject({ attachments: [{ fileName: "a.png", inputType: "image", r2Key: "k" }] })).not.toThrow();
  });
});
