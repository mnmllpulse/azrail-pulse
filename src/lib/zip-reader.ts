/**
 * ЧТЕНИЕ ZIP ПРЯМО В WORKER
 *
 * До этого архив честно отвергался: «распаковка возможна только в
 * песочнице». Отказ был правдивым, но основан на неверной посылке —
 * будто в Worker нечем распаковать deflate. Есть: `DecompressionStream`
 * с алгоритмом "deflate-raw" входит в рантайм, а разбор структуры ZIP —
 * это чтение чисел из буфера, полтораста строк без единой зависимости.
 *
 * Итог для человека: прикреплённый проект читается сразу, без контейнера
 * и без просьбы «пришли файлы по отдельности».
 *
 * ЧЕГО ЭТОТ МОДУЛЬ НЕ ДЕЛАЕТ:
 *   • не пишет архивы — только читает;
 *   • не поддерживает ZIP64 (архивы свыше 4 ГБ / 65535 файлов) и шифрование —
 *     про оба случая говорится прямо, а не выдаётся пустой результат;
 *   • не отдаёт двоичные файлы — они попадают в перечень, но без содержимого.
 */

/** Сигнатуры разделов ZIP. */
const SIG_EOCD = 0x06054b50; // конец центрального каталога
const SIG_CENTRAL = 0x02014b50; // запись центрального каталога
const SIG_LOCAL = 0x04034b50; // локальный заголовок файла

/** Комментарий архива по спецификации не длиннее 65535 байт. */
const MAX_COMMENT = 0xffff;

/** Маркер ZIP64: размер не помещается в 32 бита. */
const ZIP64_MARK = 0xffffffff;

/** Бит 0 флагов — файл зашифрован. */
const FLAG_ENCRYPTED = 0x1;

export interface ZipEntry {
  /** Путь внутри архива, как он записан. */
  path: string;
  /** Размер в распакованном виде. */
  size: number;
  /** Содержимое, если файл запрошен и распакован. */
  bytes?: Uint8Array;
  /** Почему содержимого нет. Заполнено ВСЕГДА, когда нет bytes. */
  skipped?: string;
}

export interface ZipListing {
  /** Все файлы архива: имена и размеры. Каталоги отброшены. */
  entries: ZipEntry[];
  /** Общее число файлов до отсечения по лимиту. */
  total: number;
}

/** Ошибка разбора архива. Отдельный тип, чтобы не путать с ошибкой сети. */
export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipError";
  }
}

/** Ищет EOCD с конца: он последний в файле, но за ним может быть комментарий. */
function findEocd(view: DataView): number {
  const min = Math.max(0, view.byteLength - MAX_COMMENT - 22);
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (view.getUint32(i, true) === SIG_EOCD && i + 22 + view.getUint16(i + 20, true) === view.byteLength) return i;
  }
  throw new ZipError("это не ZIP: не найден конец центрального каталога");
}

/** Имена в ZIP — UTF-8, если выставлен бит 11; иначе CP437. Читаем как UTF-8:
 *  архивы, собранные современными средствами, всегда помечены правильно. */
const decodeName = (b: Uint8Array) => new TextDecoder("utf-8").decode(b);

/**
 * Читает оглавление архива: имена и размеры, без распаковки содержимого.
 * Дёшево — разбирается только центральный каталог.
 */
export function listZip(buf: ArrayBuffer, maxEntries = 2000): ZipListing {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  const eocd = findEocd(view);
  const count = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);

  if (cdOffset === ZIP64_MARK || count === 0xffff) {
    throw new ZipError("архив в формате ZIP64 — не поддерживается");
  }

  const cdSize = view.getUint32(eocd + 12, true);
  if (view.getUint16(eocd + 4, true) || view.getUint16(eocd + 6, true) || view.getUint16(eocd + 8, true) !== count) throw new ZipError("многотомный ZIP не поддерживается");
  if (cdOffset + cdSize > eocd) throw new ZipError("границы центрального каталога повреждены");
  const cdEnd = cdOffset + cdSize;
  const entries: ZipEntry[] = [];
  let p = cdOffset;
  let total = 0;

  for (let i = 0; i < count; i++) {
    if (p + 46 > cdEnd || view.getUint32(p, true) !== SIG_CENTRAL) {
      throw new ZipError("центральный каталог повреждён");
    }

    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);

    if (p + 46 + nameLen + extraLen + commentLen > cdEnd) throw new ZipError("обрезана запись центрального каталога");
    const checksum = view.getUint32(p + 16, true);
    const path = decodeName(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    // Каталоги внутри архива содержимого не несут.
    if (path.endsWith("/")) continue;
    total++;
    if (entries.length >= maxEntries) continue;

    const entry: ZipEntry = { path, size };

    if (!path || path.startsWith("/") || path.includes("\\") || /^[A-Za-z]:/.test(path) || path.includes("\0") || path.split("/").some(s => s === ".." || s === ".")) entry.skipped = "небезопасный путь";
    else if (flags & FLAG_ENCRYPTED) entry.skipped = "файл зашифрован";
    else if (method !== 0 && method !== 8) entry.skipped = `способ сжатия ${method} не поддерживается`;
    else if (size === ZIP64_MARK || compSize === ZIP64_MARK) entry.skipped = "запись в формате ZIP64";
    else {
      // Смещения нужны только для распаковки — прячем их от вызывающего
      // кода за непубличными полями, чтобы их нельзя было принять за часть
      // описания файла.
      (entry as ZipEntry & { _crc: number })._crc = checksum;
      (entry as ZipEntry & { _off: number; _comp: number; _method: number })._off = localOffset;
      (entry as ZipEntry & { _off: number; _comp: number; _method: number })._comp = compSize;
      (entry as ZipEntry & { _off: number; _comp: number; _method: number })._method = method;
    }

    entries.push(entry);
  }

  return { entries, total };
}

/** Распаковка одного блока. "deflate-raw" — без заголовка zlib, как в ZIP. */
async function inflateRaw(data: Uint8Array, limit: number): Promise<Uint8Array> {
  // Blob принимает Uint8Array; приведение — обход конфликта версий
  // workers-types в этой связке зависимостей, тот же, что описан в upload.ts.
  const stream = (new Blob([data as unknown as ArrayBufferView]) as unknown as { stream(): ReadableStream })
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
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
        throw new ZipError("распакованный файл превышает лимит");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(size);
  let pos = 0;
  for (const chunk of chunks) { out.set(chunk, pos); pos += chunk.length; }
  return out;
}

/**
 * Достаёт содержимое одной записи.
 *
 * Локальный заголовок читается заново: длины имени и «extra» в нём могут
 * отличаться от тех же полей в центральном каталоге — это законно по
 * спецификации, и доверять здесь центральному каталогу нельзя.
 */
export async function readEntry(buf: ArrayBuffer, entry: ZipEntry, maxBytes = 1024 * 1024): Promise<Uint8Array> {
  const meta = entry as ZipEntry & { _off?: number; _comp?: number; _method?: number; _crc?: number };
  if (meta._off === undefined) throw new ZipError(entry.skipped ?? "запись нечитаема");

  if (entry.size > maxBytes) throw new ZipError("файл превышает лимит чтения");
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const off = meta._off;

  if (off + 30 > view.byteLength || view.getUint32(off, true) !== SIG_LOCAL) {
    throw new ZipError(`повреждён заголовок файла ${entry.path}`);
  }

  const nameLen = view.getUint16(off + 26, true);
  const extraLen = view.getUint16(off + 28, true);
  const start = off + 30 + nameLen + extraLen;
  const end = start + (meta._comp ?? 0);

  if (end > bytes.byteLength) throw new ZipError(`данные файла ${entry.path} обрезаны`);

  const raw = bytes.subarray(start, end);
  const out = meta._method === 0 ? raw : await inflateRaw(raw, Math.min(entry.size, maxBytes));
  if (out.length !== entry.size || out.length > maxBytes) throw new ZipError("размер файла не совпадает с каталогом");
  let crc = 0xffffffff;
  for (const byte of out) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  if (((crc ^ 0xffffffff) >>> 0) !== meta._crc) throw new ZipError("контрольная сумма CRC32 не совпадает");
  return out;
}
