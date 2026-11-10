import { describe, expect, it } from "vitest";
import { zipStore } from "../src/lib/zip-store";
import { siteFromZip } from "../ui/zip-site";

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

  it("архив без html не открывает экран", async () => {
    const packed = zipStore([{ path: "notes.txt", data: utf8("только текст") }]);
    expect(await siteFromZip(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength))).toBeNull();
  });
});
