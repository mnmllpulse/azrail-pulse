import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("кнопка «Остановить» в чате", () => {
  const html = readFileSync("ui/app.html", "utf8");
  const app = readFileSync("ui/app.ts", "utf8");

  it("стоит рядом с отправкой и по умолчанию скрыта", () => {
    expect(html).toMatch(/<button id="stop-run"[^>]*type="button"[^>]*hidden>/);
    expect(html.indexOf('id="stop-run"')).toBeLessThan(html.indexOf('id="submit"'));
  });

  it("повторяет состояние отмены миссии и жмёт её кнопку", () => {
    expect(app).toContain("$('stop-run').hidden=$('cancel').hidden;");
    expect(app).toContain("bind('stop-run',()=>$('cancel').click());");
    expect(app).toMatch(/\$\('cancel'\)\.hidden=true;\$\('stop-run'\)\.hidden=true;/);
  });
});
