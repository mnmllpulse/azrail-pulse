import { describe, expect, it } from "vitest";
import { zipStore } from "../src/lib/zip-store";
import { archivesFromText, fileNamesInQuestion } from "../src/lib/attachments";
import { listZip, readEntry } from "../src/lib/zip-reader";
import { archiveMarks, askedPaths, bytesForArchive, catalogPaths, fileShotReady, holdArchive, holdPlain, matchHeldPath, openHeld, openOnlyPath, restoreFileShot, siteFromZip, snapFile } from "../ui/zip-site";

const utf8 = (value: string) => new TextEncoder().encode(value);

describe("Сайт из ZIP на живом экране", () => {
  it("берёт index.html и вставляет его css", async () => {
    const packed = zipStore([
      { path: "readme.md", data: utf8("заметка") },
      { path: "site/style.css", data: utf8("body{background:#111}") },
      { path: "site/index.html", data: utf8('<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><h1>Бюро</h1></body></html>') },
      { path: "site/deep/other.html", data: utf8("<h1>не эта</h1>") },
    ]);
    const html = await siteFromZip(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength));
    expect(html).toContain("<h1>Бюро</h1>");
    expect(html).toContain("background:#111");
    expect(html).not.toContain("не эта");
  });

  it("даёт список файлов и открывает выбранный", async () => {
    const packed = zipStore([
      { path: "src/app.ts", data: utf8("export const n = 1;") },
      { path: "index.html", data: utf8("<!doctype html><html><body><h1>Дом</h1></body></html>") },
      { path: "node_modules/left/index.js", data: utf8("skip") },
    ]);
    const buf = packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength);
    const paths = await catalogPaths(buf);
    expect(paths[0]).toBe("index.html");
    expect(paths).toContain("src/app.ts");
    expect(paths.some((path) => path.includes("node_modules"))).toBe(false);
    await holdArchive(buf);
    expect(await openHeld("src/app.ts")).toContain("export const n");
    expect(await openHeld("index.html")).toContain("Дом");
    expect(matchHeldPath("src/app.ts")).toBe("src/app.ts");
    expect(matchHeldPath("app.ts")).toBe("src/app.ts");
    expect(matchHeldPath("../secret.ts")).toBeNull();
    expect(matchHeldPath("нет-такого.ts")).toBeNull();
    expect(askedPaths("открой src/app.ts")).toEqual(fileNamesInQuestion("открой src/app.ts"));
    expect(openOnlyPath("Открой src/app.ts.")).toBe("src/app.ts");
    expect(openOnlyPath("прочитай src/app.ts и скажи, что не так")).toBeNull();
    const mark = "[АРХИВ r2=uploads/p1/abc-site.zip name=site.zip]";
    expect(archiveMarks(`вопрос\n${mark}`)).toEqual(archivesFromText(`вопрос\n${mark}`));
    snapFile("src/app.ts", "export const n = 1;");
    expect(fileShotReady()).toBe(true);
    expect(restoreFileShot("src/app.ts", "export const n = 2;")).toEqual({ path: "src/app.ts", text: "export const n = 1;" });
    expect(restoreFileShot("src/app.ts", "export const n = 1;")?.text).toBe("export const n = 2;");
  });

  it("кладёт правку в архив и оставляет служебные файлы за бортом", async () => {
    const packed = zipStore([
      { path: "src/app.ts", data: utf8("export const n = 1;") },
      { path: "readme.md", data: utf8("заметка") },
      { path: "node_modules/left/index.js", data: utf8("skip") },
    ]);
    const buf = packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength);
    await holdArchive(buf, "проект.zip");
    const revised = await bytesForArchive("src/app.ts", "export const n = 2;");
    expect(revised?.note).toContain("Собрано 2 из 3.");
    expect(revised?.name).toBe("проект-правка.zip");
    const again = revised!.bytes.buffer.slice(revised!.bytes.byteOffset, revised!.bytes.byteOffset + revised!.bytes.byteLength);
    const listing = listZip(again, 20);
    expect(listing.entries.map((entry) => entry.path).sort()).toEqual(["readme.md", "src/app.ts"]);
    const source = listing.entries.find((entry) => entry.path === "src/app.ts");
    expect(new TextDecoder().decode(await readEntry(again, source!, 1000))).toBe("export const n = 2;");
    const page = holdPlain([{ path: "index.html", text: "<h1>Было</h1>" }, { path: "styles.css", text: "body{}" }], "бюро.zip");
    expect(page).toEqual(["index.html", "styles.css"]);
    const site = await bytesForArchive("index.html", "<h1>Стало</h1>");
    expect(site?.note).toBe("Собрано 2 из 2.");
    const siteBuf = site!.bytes.buffer.slice(site!.bytes.byteOffset, site!.bytes.byteOffset + site!.bytes.byteLength);
    const html = listZip(siteBuf, 10).entries.find((entry) => entry.path === "index.html");
    expect(new TextDecoder().decode(await readEntry(siteBuf, html!, 1000))).toBe("<h1>Стало</h1>");
  });

  it("архив без html не открывает экран", async () => {
    const packed = zipStore([{ path: "notes.txt", data: utf8("только текст") }]);
    expect(await siteFromZip(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength))).toBeNull();
  });
});
