/**
 * Сборка настоящего ZIP для тестов.
 *
 * Готовый архив-фикстура не годится: по нему не видно, какой именно байт
 * проверяется, и его нельзя испортить прицельно. Здесь архив собирается
 * из байтов — значит, тест может построить и правильный, и сломанный.
 */
import { deflateRawSync, crc32 } from "node:zlib";

export interface ZipFile {
  path: string;
  content: string | Uint8Array;
  /** 0 — без сжатия, 8 — deflate (по умолчанию). */
  method?: 0 | 8;
}

const u8 = (v: string | Uint8Array) => (typeof v === "string" ? new TextEncoder().encode(v) : v);

export function makeZip(files: ZipFile[], opts: { comment?: string } = {}): ArrayBuffer {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const name = new TextEncoder().encode(f.path);
    const raw = u8(f.content);
    const method = f.method ?? 8;
    const data = method === 0 ? raw : new Uint8Array(deflateRawSync(raw));
    const sum = crc32(Buffer.from(raw));

    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, method, true);
    lv.setUint32(14, sum, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, method, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length;
  }

  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const comment = new TextEncoder().encode(opts.comment ?? "");
  const eocd = new Uint8Array(22 + comment.length);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, comment.length, true);
  eocd.set(comment, 22);

  const total = offset + cdSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const b of [...locals, ...centrals, eocd]) {
    out.set(b, p);
    p += b.length;
  }
  return out.buffer;
}
