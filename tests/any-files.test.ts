import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { attachmentsToText, loadAttachments, looksLikeText } from "../src/lib/attachments";
import { gunzip, listTar, looksLikeTar } from "../src/lib/tar-reader";
import { ZipError } from "../src/lib/zip-reader";

const enc = (s: string) => new TextEncoder().encode(s);

function tarBlock(name: string, content: Uint8Array, type = "0", prefix = ""): Uint8Array {
  const header = new Uint8Array(512);
  const put = (at: number, text: string) => header.set(enc(text), at);
  put(0, name);
  put(100, "0000644\0");
  put(108, "0000000\0");
  put(116, "0000000\0");
  put(124, content.length.toString(8).padStart(11, "0") + "\0");
  put(136, "00000000000\0");
  put(148, "        ");
  header[156] = type.charCodeAt(0);
  put(257, "ustar\0");
  put(345, prefix);
  const sum = header.reduce((n, v) => n + v, 0);
  put(148, sum.toString(8).padStart(6, "0") + "\0 ");
  const padded = new Uint8Array(Math.ceil(content.length / 512) * 512);
  padded.set(content);
  const out = new Uint8Array(512 + padded.length);
  out.set(header);
  out.set(padded, 512);
  return out;
}

function tar(files: Record<string, string>): Uint8Array {
  const blocks = Object.entries(files).map(([name, text]) => tarBlock(name, enc(text)));
  const out = new Uint8Array(blocks.reduce((n, b) => n + b.length, 0) + 1024);
  let pos = 0;
  for (const b of blocks) {
    out.set(b, pos);
    pos += b.length;
  }
  return out;
}

function r2(files: Record<string, Uint8Array>) {
  return {
    AZRAIL_R2: {
      get: async (key: string, options?: { range?: { offset?: number; length?: number } }) => {
        const data = files[key];
        if (!data) return null;
        const offset = options?.range?.offset ?? 0;
        const body = options?.range?.length !== undefined ? data.subarray(offset, offset + options.range.length) : data.subarray(offset);
        const copy = body.slice();
        return {
          size: data.length,
          text: async () => new TextDecoder().decode(copy),
          arrayBuffer: async () => copy.buffer,
        };
      },
    },
  } as never;
}

describe("tar и gzip", () => {
  it("читает оглавление и содержимое tar.gz", async () => {
    const archive = gzipSync(tar({ "pkg/src/a.ts": "export const a = 1;", "pkg/README.md": "# demo" }));
    const out = await loadAttachments(r2({ "u/p.tgz": new Uint8Array(archive) }), [{ r2Key: "u/p.tgz", fileName: "p.tgz", inputType: "unknown" }]);
    expect(out[0].text).toContain("pkg/src/a.ts");
    expect(out.map((o) => o.fileName)).toContain("p.tgz → pkg/README.md");
    expect(out.find((o) => o.fileName.endsWith("a.ts"))?.text).toBe("export const a = 1;");
  });

  it("читает несжатый tar", async () => {
    const out = await loadAttachments(r2({ "u/p.tar": tar({ "x.txt": "привет" }) }), [{ r2Key: "u/p.tar", fileName: "p.tar", inputType: "unknown" }]);
    expect(out.find((o) => o.fileName.endsWith("x.txt"))?.text).toBe("привет");
  });

  it("одиночный .gz с текстом отдаёт текст", async () => {
    const out = await loadAttachments(r2({ "u/a.log.gz": new Uint8Array(gzipSync(enc("строка лога"))) }), [{ r2Key: "u/a.log.gz", fileName: "a.log.gz", inputType: "unknown" }]);
    expect(out[0].text).toBe("строка лога");
    expect(out[0].fileName).toBe("a.log.gz → a.log");
  });

  it("gz с двоичным содержимым не выдаётся за текст", async () => {
    const out = await loadAttachments(r2({ "u/b.gz": new Uint8Array(gzipSync(new Uint8Array([0, 1, 2, 255, 0]))) }), [{ r2Key: "u/b.gz", fileName: "b.gz", inputType: "unknown" }]);
    expect(out[0].text).toBeUndefined();
    expect(out[0].skipped).toContain("не tar и не текст");
  });

  it("битый gzip и пустой файл дают причину", async () => {
    const bad = await loadAttachments(r2({ "u/c.gz": new Uint8Array([0x1f, 0x8b, 1, 2, 3, 4]) }), [{ r2Key: "u/c.gz", fileName: "c.gz", inputType: "unknown" }]);
    expect(bad[0].skipped).toContain("gzip");
    const empty = await loadAttachments(r2({ "u/d.tar": new Uint8Array(0) }), [{ r2Key: "u/d.tar", fileName: "d.tar", inputType: "unknown" }]);
    expect(empty[0].skipped).toBe("файл пуст");
  });

  it("gzip-бомба упирается в потолок", async () => {
    const bomb = new Uint8Array(gzipSync(new Uint8Array(2 * 1024 * 1024)));
    await expect(gunzip(bomb, 1024 * 1024)).rejects.toBeInstanceOf(ZipError);
  });

  it("испорченная контрольная сумма и обрезанный tar отклоняются", () => {
    const good = tar({ "a.txt": "x" });
    expect(looksLikeTar(good)).toBe(true);
    const broken = good.slice();
    broken[0] ^= 1;
    expect(() => listTar(broken)).toThrow(ZipError);
    const big = tar({ "b.txt": "x".repeat(2000) });
    expect(() => listTar(big.subarray(0, 900))).toThrow(ZipError);
  });

  it("небезопасный путь помечается и не читается", async () => {
    const out = await loadAttachments(r2({ "u/e.tar": tar({ "../evil.txt": "x", "ok.txt": "y" }) }), [{ r2Key: "u/e.tar", fileName: "e.tar", inputType: "unknown" }]);
    expect(out.some((o) => o.fileName.endsWith("evil.txt"))).toBe(false);
    expect(listTar(tar({ "../evil.txt": "x" })).entries[0].skipped).toContain("небезопасный");
    expect(out.find((o) => o.fileName.endsWith("ok.txt"))?.text).toBe("y");
  });
});

describe("определение текста по содержимому", () => {
  it("файл без расширения с текстом читается", async () => {
    const out = await loadAttachments(r2({ "u/Dockerfile": enc("FROM node:24\nCMD [\"node\"]") }), [{ r2Key: "u/Dockerfile", fileName: "Dockerfile", inputType: "unknown" }]);
    expect(out[0].text).toContain("FROM node:24");
  });

  it("текст с чужим расширением читается, двоичное — нет", async () => {
    const files = { "u/a.xyz": enc("просто текст"), "u/b.xyz": new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 1]) };
    const out = await loadAttachments(r2(files), [
      { r2Key: "u/a.xyz", fileName: "a.xyz", inputType: "unknown" },
      { r2Key: "u/b.xyz", fileName: "b.xyz", inputType: "unknown" },
    ]);
    expect(out[0].text).toBe("просто текст");
    expect(out[1].text).toBeUndefined();
    expect(out[1].skipped).toContain("двоичный");
  });

  it("looksLikeText терпит обрезанный на границе символ и отвергает нули и мусор", () => {
    const cyr = enc("ж".repeat(10));
    expect(looksLikeText(cyr.subarray(0, 9))).toBe(true);
    expect(looksLikeText(new Uint8Array([97, 0, 98]))).toBe(false);
    expect(looksLikeText(new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]))).toBe(false);
    expect(looksLikeText(new Uint8Array(0))).toBe(true);
  });
});

describe("секреты во вложениях", () => {
  it("значения секретов закрываются до отправки модели", () => {
    const text = attachmentsToText([{ fileName: "cfg.txt", text: "token=ghp_" + "a".repeat(36) + "\nname=ok" }]);
    expect(text).not.toContain("ghp_" + "a".repeat(36));
    expect(text).toContain("СКРЫТО");
    expect(text).toContain("name=ok");
  });
});
