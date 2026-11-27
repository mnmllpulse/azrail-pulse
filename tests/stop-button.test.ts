import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("остановка задачи кнопкой отправки", () => {
  const html = readFileSync("ui/app.html", "utf8");
  const app = readFileSync("ui/app.ts", "utf8");
  const css = readFileSync("ui/premium-workspace.css", "utf8");

  it("отдельной кнопки нет: отправка сама становится квадратом", () => {
    expect(html).not.toContain('id="stop-run"');
    expect(app).toContain("function setStopMode(on:boolean)");
    expect(app).toContain("button.dataset.mode='stop'");
    expect(css).toContain('.send-button[data-mode="stop"]');
  });

  it("режим повторяет доступность отмены миссии и снимается в конце", () => {
    expect(app).toContain("setStopMode(!$('cancel').hidden);");
    expect(app).toMatch(/\$\('cancel'\)\.hidden=true;setStopMode\(false\);/);
  });

  it("в режиме остановки клик отменяет задачу, а не отправляет форму", () => {
    expect(app).toMatch(/\$\('submit'\)\.addEventListener\('click',event=>\{if\(\$\('submit'\)\.dataset\.mode!=='stop'\)return;event\.preventDefault\(\);event\.stopImmediatePropagation\(\);\$\('cancel'\)\.click\(\);\},true\)/);
  });
});
