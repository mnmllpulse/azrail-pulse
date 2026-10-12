import { describe, it, expect } from "vitest";
import { listZip, readEntry, ZipError } from "../src/lib/zip-reader";
import { loadAttachments, attachmentsToText } from "../src/lib/attachments";
import { makeZip } from "./stubs/make-zip";

/** R2 понарошку, отдающий архив байтами. */
function r2zip(key: string, buf: ArrayBuffer) {
  return {
    AZRAIL_R2: {
      get: async (k: string) => (k === key ? { arrayBuffer: async () => buf } : null),
    },
  } as never;
}

const zipRef = (fileName = "project.zip") => [
  { r2Key: "u/p.zip", fileName, inputType: "zip" as const },
];

describe("Разбор ZIP", () => {
  it("находит файлы и их размеры", () => {
    const zip = makeZip([
      { path: "README.md", content: "# Проект" },
      { path: "src/index.ts", content: "export const x = 1;" },
    ]);
    const { entries, total } = listZip(zip);
    expect(total).toBe(2);
    expect(entries.map((e) => e.path)).toEqual(["README.md", "src/index.ts"]);
    expect(entries[1].size).toBe(new TextEncoder().encode("export const x = 1;").length);
  });

  it("распаковывает сжатое содержимое", async () => {
    // Длинный текст — чтобы deflate реально сжал, а не сохранил как есть.
    const body = "const value = 42;\n".repeat(200);
    const zip = makeZip([{ path: "a.ts", content: body }]);
    const { entries } = listZip(zip);
    const bytes = await readEntry(zip, entries[0]);
    expect(new TextDecoder().decode(bytes)).toBe(body);
  });

  it("читает и несжатые записи", async () => {
    const zip = makeZip([{ path: "a.txt", content: "как есть", method: 0 }]);
    const { entries } = listZip(zip);
    expect(new TextDecoder().decode(await readEntry(zip, entries[0]))).toBe("как есть");
  });

  it("каталоги не попадают в перечень", () => {
    const zip = makeZip([
      { path: "src/", content: "" },
      { path: "src/a.ts", content: "x" },
    ]);
    expect(listZip(zip).entries.map((e) => e.path)).toEqual(["src/a.ts"]);
  });

  it("имена в кириллице не ломаются", async () => {
    const zip = makeZip([{ path: "документы/заметка.txt", content: "привет" }]);
    const { entries } = listZip(zip);
    expect(entries[0].path).toBe("документы/заметка.txt");
    expect(new TextDecoder().decode(await readEntry(zip, entries[0]))).toBe("привет");
  });

  it("не-ZIP отвергается внятно, а не падает на мусоре", () => {
    const junk = new TextEncoder().encode("это просто текст, а не архив").buffer;
    expect(() => listZip(junk)).toThrow(ZipError);
    try {
      listZip(junk);
    } catch (e) {
      expect((e as Error).message).toContain("не ZIP");
    }
  });

  it("подпись EOCD внутри файла не сбивает разбор", async () => {
    // Дыра, которую комментарий не ловит: последовательность PK\x05\x06
    // может оказаться в данных обычного файла. Разбор с НАЧАЛА найдёт её
    // первой и примет за конец каталога. Искать надо с конца.
    const trap = new Uint8Array(200);
    trap.set([0x50, 0x4b, 0x05, 0x06], 40); // подпись EOCD внутри данных
    const zip = makeZip([
      { path: "data.txt", content: trap, method: 0 },
      { path: "a.ts", content: "настоящий код" },
    ]);
    const { entries } = listZip(zip);
    expect(entries.map((e) => e.path)).toEqual(["data.txt", "a.ts"]);
    expect(new TextDecoder().decode(await readEntry(zip, entries[1]))).toBe("настоящий код");
  });

  it("архив с комментарием в конце всё равно читается", () => {
    // EOCD ищется с конца; комментарий сдвигает его — частая причина,
    // по которой наивный разбор находит сигнатуру не там.
    const zip = makeZip([{ path: "a.txt", content: "x" }], { comment: "собрано чем-то" });
    expect(listZip(zip).entries[0].path).toBe("a.txt");
  });
});

describe("ZIP как вложение задачи", () => {
  it("содержимое доезжает до агента", async () => {
    // То, на чём всё стояло: человек прикрепляет проект и слышит
    // «пришли файлы по отдельности».
    const zip = makeZip([
      { path: "README.md", content: "# mnmllpulse" },
      { path: "src/index.ts", content: "export default { fetch() {} };" },
    ]);
    const out = await loadAttachments(r2zip("u/p.zip", zip), zipRef());
    const text = attachmentsToText(out);

    expect(text, "старый отказ должен исчезнуть").not.toContain("по отдельности");
    expect(text).toContain("mnmllpulse");
    expect(text).toContain("export default");
  });

  it("оглавление идёт первым и содержит все файлы", async () => {
    const zip = makeZip(
      Array.from({ length: 60 }, (_, i) => ({ path: `src/f${i}.ts`, content: `// ${i}` })),
    );
    const out = await loadAttachments(r2zip("u/p.zip", zip), zipRef());

    expect(out[0].fileName).toContain("оглавление");
    expect(out[0].text).toContain("Файлов: 60");
    expect(out[0].text, "перечень обязан быть полным").toContain("src/f59.ts");
  });

  it("бюджет ограничивает содержимое, но остаток назван", async () => {
    const big = "x".repeat(8 * 1024);
    const zip = makeZip(
      Array.from({ length: 60 }, (_, i) => ({ path: `src/f${i}.ts`, content: `${big}${i}` })),
    );
    const out = await loadAttachments(r2zip("u/p.zip", zip), zipRef());
    const read = out.filter((a) => a.text && a.fileName.includes("→"));

    expect(read.length, "весь репозиторий в окно не влезает").toBeLessThan(60);
    expect(out.at(-1)!.skipped, "иначе агент решит, что видит проект целиком")
      .toContain("не прочитаны");
  });

  it("служебные папки не засоряют перечень", async () => {
    const zip = makeZip([
      { path: "src/a.ts", content: "нужное" },
      { path: "node_modules/left-pad/index.js", content: "чужое" },
      { path: "__MACOSX/._a.ts", content: "мусор" },
      { path: ".git/config", content: "служебное" },
    ]);
    const out = await loadAttachments(r2zip("u/p.zip", zip), zipRef());
    const text = attachmentsToText(out);

    expect(text).toContain("src/a.ts");
    expect(text).not.toContain("left-pad");
    expect(text).not.toContain("__MACOSX");
  });

  it("описание проекта читается раньше прочего", async () => {
    // Бюджет может кончиться; тогда важно, что успело попасть внутрь.
    const filler = "y".repeat(2 * 1024);
    const zip = makeZip([
      ...Array.from({ length: 50 }, (_, i) => ({ path: `src/z${i}.ts`, content: filler })),
      { path: "package.json", content: '{"name":"azrail"}' },
    ]);
    const out = await loadAttachments(r2zip("u/p.zip", zip), zipRef());
    expect(out.some((a) => a.fileName.includes("package.json") && a.text)).toBe(true);
  });

  it("двоичное внутри архива не выдаётся за текст", async () => {
    const zip = makeZip([
      { path: "logo.png", content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
      { path: "a.ts", content: "код" },
    ]);
    const out = await loadAttachments(r2zip("u/p.zip", zip), zipRef());
    expect(out.some((a) => a.fileName.includes("logo.png") && a.text)).toBe(false);
    expect(out[0].text, "но в перечне оно быть должно").toContain("logo.png");
  });

  it("битый архив не роняет задачу", async () => {
    const junk = new TextEncoder().encode("не архив").buffer;
    const out = await loadAttachments(r2zip("u/p.zip", junk), zipRef());
    expect(out[0].skipped).toContain("не ZIP");
  });

  it("пропавший архив назван по имени", async () => {
    const out = await loadAttachments(r2zip("другой", new ArrayBuffer(0)), zipRef());
    expect(out[0].skipped).toContain("не найден");
  });

  it("tar и rar получают честный отказ, а не молчание", async () => {
    const out = await loadAttachments(r2zip("u/p.zip", new ArrayBuffer(0)), [
      { r2Key: "u/p.zip", fileName: "project.tar.gz", inputType: "zip" },
    ]);
    expect(out[0].text).toBeUndefined();
    expect(out[0].skipped).toContain("ZIP");
  });
});
