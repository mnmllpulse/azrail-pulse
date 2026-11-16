import { ZipError, type ZipEntry, type ZipListing } from "./zip-reader";

/** Потолок распакованного размера: gzip-бомба не должна съесть память воркера. */
export const TAR_MAX_OUT = 64 * 1024 * 1024;

const BLOCK = 512;

/** gzip: две магические байта 1f 8b. */
export const isGzip = (b: Uint8Array) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

export async function gunzip(data: Uint8Array, limit = TAR_MAX_OUT): Promise<Uint8Array> {
  const stream = (new Blob([data as unknown as ArrayBuffer]) as unknown as { stream(): ReadableStream })
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        throw new ZipError(`распакованный архив больше ${Math.round(limit / 1024 / 1024)} МБ`);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ZipError) throw error;
    throw new ZipError("gzip повреждён или не является gzip");
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(size);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.byteLength;
  }
  return out;
}

const text = (b: Uint8Array, from: number, len: number) => {
  let end = from;
  while (end < from + len && b[end] !== 0) end++;
  return new TextDecoder("utf-8").decode(b.subarray(from, end));
};

const octal = (b: Uint8Array, from: number, len: number) => {
  const raw = text(b, from, len).trim();
  return raw ? parseInt(raw, 8) : 0;
};

function checksumOk(b: Uint8Array, at: number): boolean {
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 32 : b[at + i];
  return sum === octal(b, at + 148, 8);
}

/** Похоже ли начало данных на tar: валидная контрольная сумма первого заголовка. */
export function looksLikeTar(b: Uint8Array): boolean {
  return b.length >= BLOCK && checksumOk(b, 0) && /^[\x20-\x7e]/.test(String.fromCharCode(b[0]));
}

interface TarEntry extends ZipEntry {
  _off: number;
}

/** Путь из pax-заголовка вида «27 path=dir/file\n». */
function paxPath(data: string): string | undefined {
  let pos = 0;
  while (pos < data.length) {
    const space = data.indexOf(" ", pos);
    if (space < 0) break;
    const len = Number(data.slice(pos, space));
    if (!Number.isFinite(len) || len <= 0) break;
    const record = data.slice(space + 1, pos + len - 1);
    if (record.startsWith("path=")) return record.slice(5);
    pos += len;
  }
  return undefined;
}

/** Оглавление tar без копирования данных. Каталоги, ссылки и устройства отбрасываются. */
export function listTar(b: Uint8Array, maxEntries = 2000): ZipListing {
  if (!looksLikeTar(b)) throw new ZipError("это не tar: заголовок не проходит проверку");
  const entries: ZipEntry[] = [];
  let total = 0;
  let pos = 0;
  let longName: string | undefined;
  let zeroBlocks = 0;

  while (pos + BLOCK <= b.length) {
    if (b.subarray(pos, pos + BLOCK).every((v) => v === 0)) {
      if (++zeroBlocks >= 2) break;
      pos += BLOCK;
      continue;
    }
    zeroBlocks = 0;
    if (!checksumOk(b, pos)) throw new ZipError("tar повреждён: контрольная сумма заголовка не совпала");

    const size = octal(b, pos + 124, 12);
    const type = String.fromCharCode(b[pos + 156] || 48);
    const dataAt = pos + BLOCK;
    const next = dataAt + Math.ceil(size / BLOCK) * BLOCK;
    if (size < 0 || dataAt + size > b.length) throw new ZipError("tar обрезан: данные файла выходят за конец архива");

    if (type === "L") {
      longName = text(b, dataAt, size);
    } else if (type === "x") {
      longName = paxPath(new TextDecoder("utf-8").decode(b.subarray(dataAt, dataAt + size))) ?? longName;
    } else if (type === "0" || type === "\0" || type === "7") {
      const prefix = text(b, pos + 345, 155);
      const name = text(b, pos, 100);
      const path = (longName ?? (prefix ? `${prefix}/${name}` : name)).replace(/^\.\//, "");
      longName = undefined;
      total++;
      if (entries.length < maxEntries) {
        const entry: TarEntry = { path, size, _off: dataAt };
        if (path.startsWith("/") || path.split("/").includes("..")) entry.skipped = "небезопасный путь в архиве";
        entries.push(entry);
      }
    } else {
      longName = undefined;
    }
    pos = next;
  }

  return { entries, total };
}

export function readTarEntry(b: Uint8Array, entry: ZipEntry, maxBytes: number): Uint8Array {
  const off = (entry as TarEntry)._off;
  if (off === undefined) throw new ZipError(entry.skipped ?? "запись нечитаема");
  if (entry.size > maxBytes) throw new ZipError("файл превышает лимит чтения");
  return b.subarray(off, off + entry.size);
}
