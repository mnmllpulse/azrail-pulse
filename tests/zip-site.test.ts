import { describe, expect, it } from "vitest";
import { zipStore } from "../src/lib/zip-store";
import { catalogPaths, holdArchive, openHeld, siteFromZip } from "../ui/zip-site";

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
  });

  it("архив без html не открывает экран", async () => {
    const packed = zipStore([{ path: "notes.txt", data: utf8("только текст") }]);
    expect(await siteFromZip(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength))).toBeNull();
  });
});
