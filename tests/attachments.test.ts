import { describe, it, expect } from "vitest";
import { loadAttachments, attachmentsToText } from "../src/lib/attachments";

/** R2 понарошку: отдаёт то, что в него положили. */
function r2(files: Record<string, string>) {
  return {
    AZRAIL_R2: {
      get: async (key: string) =>
        key in files ? { text: async () => files[key] } : null,
    },
  } as never;
}

describe("Вложения доезжают до задачи", () => {
  it("текст файла читается из хранилища", () => {
    return loadAttachments(r2({ "u/a.ts": "export const x = 1;" }), [
      { r2Key: "u/a.ts", fileName: "a.ts", inputType: "text" },
    ]).then((out) => {
      expect(out[0].text).toBe("export const x = 1;");
    });
  });

  it("пропавший архив назван причиной, а не молчанием", async () => {
    // Раньше здесь проверялся отказ «пришли файлы по отдельности» — он
    // снят: ZIP распаковывается в воркере, см. tests/zip.test.ts.
    // Осталось то, что не изменилось: если архива нет в хранилище,
    // человек должен прочесть причину, а не «не найдено исходных модулей».
    const out = await loadAttachments(r2({}), [
      { r2Key: "u/p.zip", fileName: "azrail-os.zip", inputType: "zip" },
    ]);
    expect(out[0].text).toBeUndefined();
    expect(out[0].skipped).toContain("не найден");
  });

  it("двоичный файл не выдаётся за текст", async () => {
    const out = await loadAttachments(r2({ "u/i.png": "\u0000PNG" }), [
      { r2Key: "u/i.png", fileName: "i.png", inputType: "image" },
    ]);
    expect(out[0].text).toBeUndefined();
    expect(out[0].skipped).toContain("не читается как текст");
  });

  it("пропавший файл не роняет задачу", async () => {
    // Человек уже отправил задачу; ронять её из-за вложения — хуже, чем
    // сказать, что именно не прочиталось.
    const out = await loadAttachments(r2({}), [
      { r2Key: "u/нет.ts", fileName: "нет.ts", inputType: "text" },
    ]);
    expect(out[0].skipped).toContain("не найден");
  });

  it("огромный файл обрезается и об этом сказано", async () => {
    const big = "x".repeat(400 * 1024);
    const out = await loadAttachments(r2({ "u/b.ts": big }), [
      { r2Key: "u/b.ts", fileName: "b.ts", inputType: "text" },
    ]);
    expect(out[0].text!.length).toBeLessThan(big.length);
    expect(out[0].skipped).toContain("КБ");
  });

  it("пачка файлов ограничена, остаток назван", async () => {
    const refs = Array.from({ length: 20 }, (_, i) => ({
      r2Key: `u/${i}.ts`, fileName: `${i}.ts`, inputType: "text" as const,
    }));
    const out = await loadAttachments(r2({}), refs);
    expect(out.some((a) => a.fileName.includes("и ещё"))).toBe(true);
  });

  it("непрочитанные попадают в текст задачи", () => {
    // Иначе агент решит, что файл не присылали, и ответит так, будто его
    // не было.
    const txt = attachmentsToText([
      { fileName: "a.zip", skipped: "архив — распаковка возможна только в песочнице" },
    ]);
    expect(txt).toContain("a.zip");
    expect(txt).toContain("НЕ ПРОЧИТАН");
  });

  it("без вложений ничего не добавляется", async () => {
    expect(await loadAttachments(r2({}), undefined)).toEqual([]);
    expect(attachmentsToText([])).toBe("");
  });
});

describe("Оба пути читают вложения", () => {
  const src = require("fs").readFileSync("src/index.ts", "utf8");

  it("одиночная задача", () => {
    // Искать одну строку мало: её можно подменить пустым массивом, и
    // тест пройдёт на сломанном коде. Проверяется, что прочитанное
    // ПОПАДАЕТ в payload — то есть доезжает до агента.
    // Срез ОГРАНИЧЕН обработчиком задачи с обеих сторон.
    //
    // Две попытки до этого проходили на сломанном коде. Первая начиналась
    // от строки "/api/task" — а она впервые встречается в списке
    // защищённых маршрутов, за четыреста строк до обработчика. Вторая
    // начиналась правильно, но не имела конца: срез доходил до миссии,
    // находил вызов ТАМ и объявлял задачу исправной.
    //
    // Тест, который нельзя провалить, ничего не проверяет.
    const head = src.indexOf('url.pathname === "/api/task" && request.method');
    const task = src.slice(head, src.indexOf("url.pathname.match(", head));
    expect(head, "обработчик задачи не найден").toBeGreaterThan(0);
    expect(task).toContain("loadAttachments(env, body.attachments)");
    expect(task, "прочитанное не попадает в payload").toMatch(
      /body\.payload\s*=[^;]*attachmentsToText/,
    );
  });

  it("самостоятельная миссия", () => {
    // Починить один путь и забыть второй — ровно так этот класс ошибок
    // и живёт долго.
    const mission = src.slice(src.lastIndexOf('"/api/mission" && request.method === "POST"'));
    expect(mission.slice(0, 1200)).toContain("attachmentsToText");
  });
});
