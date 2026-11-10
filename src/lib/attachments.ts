import type { Env, AttachmentRef } from "../types";
import { officePlain } from "./office-text";
import { listZip, readEntry, ZipError } from "./zip-reader";

/**
 * ЧТЕНИЕ ВЛОЖЕНИЙ ОБРАТНО ИЗ R2
 *
 * Цепь рвалась в трёх местах сразу, и все три — молча:
 *   1. интерфейс отправлял `attachments`, сервер это поле не читал;
 *   2. `AttachmentRef` был объявлен в types.ts и нигде не использован;
 *   3. R2 трогали только healthcheck и самотест — ни одна строка кода
 *      никогда не читала загруженный файл обратно.
 *
 * Итог для человека: файл уходит, кружок крутится, приходит «не найдено
 * исходных модулей». Ничего не падало — просто содержимое не доезжало.
 *
 * ЧТО ЭТОТ МОДУЛЬ ДЕЛАЕТ. Читает то, что уже лежит в R2, и подмешивает
 * текст в задачу. ZIP распаковывается здесь же — см. lib/zip-reader.ts;
 * прежний отказ «только в песочнице» опирался на неверную посылку, будто
 * в Worker нечем распаковать deflate.
 *
 * Архив репозитория не влезает в окно модели целиком, поэтому правило
 * такое: ПЕРЕЧЕНЬ файлов отдаётся полностью, СОДЕРЖИМОЕ — в пределах
 * бюджета. Человек спрашивает «что внутри» чаще, чем «покажи всё».
 */

/** Потолок на текст одного файла. Больше не влезет в окно модели с пользой. */
const MAX_TEXT_BYTES = 256 * 1024;

/** Сколько вложений читать за раз: защита от «выделил всю папку». */
const MAX_FILES = 12;

/** Бюджет на один архив. Репозиторий — это сотни файлов; вывалить их
 *  целиком значит забить окно модели и вытеснить саму задачу. */
const ZIP_MAX_LISTED = 500;
const ZIP_MAX_READ = 40;
const ZIP_MAX_TOTAL = 192 * 1024;
const ZIP_MAX_ONE = 64 * 1024;

/** Шум сборки: в перечень не попадает — он ничего не говорит о проекте. */
const ZIP_NOISE = /(^|\/)(__MACOSX|node_modules|\.git|dist|build|coverage|\.wrangler)(\/|$)|(^|\/)\.DS_Store$/;

/** Файлы, по которым понятен проект. Читаются первыми, до общей очереди. */
const ZIP_PRIORITY = /(^|\/)(readme|package\.json|wrangler\.|tsconfig|schema\.sql|index\.|main\.|app\.)/i;

/** Расширения, которые имеет смысл читать как текст. */
const TEXT_EXT = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "md", "txt", "css", "html",
  "yml", "yaml", "toml", "sql", "sh", "py", "rs", "go", "java", "kt", "swift",
  "c", "h", "cpp", "hpp", "rb", "php", "xml", "svg", "csv", "env", "gitignore",
]);

/** Архивы: распознаём, чтобы сказать правду, а не молчать. */
const ARCHIVE_EXT = new Set(["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz"]);

/** Офисные пакеты — это ZIP с XML. PDF и картинки идут через Workers AI. */
const OFFICE_EXT = new Set(["docx", "xlsx", "pptx"]);
const MARKDOWN_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "xls", "xlsm", "xlsb", "ods", "odt"]);
const MARKDOWN_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  xls: "application/vnd.ms-excel",
  xlsm: "application/vnd.ms-excel.sheet.macroenabled.12",
  xlsb: "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
};
const RICH_MAX_BYTES = 10 * 1024 * 1024;

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export interface LoadedAttachment {
  fileName: string;
  /** Содержимое, если файл читаем как текст. */
  text?: string;
  /** Почему содержимого нет. Заполнено ВСЕГДА, когда нет text. */
  skipped?: string;
  bytes?: number;
}

/**
 * Разбирает архив: полный перечень плюс содержимое в пределах бюджета.
 *
 * Первым идёт перечень — он отвечает на вопрос «что внутри» даже тогда,
 * когда до содержимого дело не дошло. Дальше файлы: сначала те, по которым
 * понятен проект (README, package.json, конфиги, точки входа), потом
 * остальные от меньшего к большему — так в бюджет влезает больше разных
 * файлов, а не один толстый.
 */
async function readZip(buf: ArrayBuffer, archiveName: string): Promise<LoadedAttachment[]> {
  const { entries, total } = listZip(buf, ZIP_MAX_LISTED);
  const visible = entries.filter((e) => !ZIP_NOISE.test(e.path));

  if (visible.length === 0) {
    return [{ fileName: archiveName, skipped: "архив пуст или содержит только служебные файлы" }];
  }

  const listing = visible
    .map((e) => `  ${e.path}  (${e.size >= 1024 ? Math.round(e.size / 1024) + " КБ" : e.size + " Б"})`)
    .join("\n");

  const hiddenNote = total > visible.length ? `\n  …и ${total - visible.length} файлов вне показанного перечня (служебные или превышение лимита) — пропущены` : "";

  const out: LoadedAttachment[] = [{
    fileName: `${archiveName} — оглавление`,
    text: "",
  }];

  const readable = visible.filter((e) => !e.skipped && TEXT_EXT.has(extOf(e.path)));
  const queue = [...readable].sort((a, b) => {
    const pa = ZIP_PRIORITY.test(a.path) ? 0 : 1;
    const pb = ZIP_PRIORITY.test(b.path) ? 0 : 1;
    return pa !== pb ? pa - pb : a.size - b.size;
  });

  let budget = ZIP_MAX_TOTAL;
  let read = 0;

  for (const entry of queue) {
    if (read >= ZIP_MAX_READ || budget <= 0) break;
    if (entry.size > Math.min(ZIP_MAX_ONE, budget)) continue;

    try {
      const bytes = await readEntry(buf, entry, Math.min(ZIP_MAX_ONE, budget));
      const text = new TextDecoder("utf-8").decode(bytes);
      out.push({ fileName: `${archiveName} → ${entry.path}`, text, bytes: bytes.byteLength });
      budget -= bytes.byteLength;
      read++;
    } catch (err) {
      out.push({
        fileName: `${archiveName} → ${entry.path}`,
        skipped: err instanceof Error ? err.message : String(err),
      });
    }
  }

  out[0].text = `Прочитано ${read} из ${total}.\nФайлов: ${total}. Показано: ${visible.length}.\n\n${listing}${hiddenNote}`;

  const left = readable.length - read;
  if (left > 0) {
    // Иначе агент решит, что показанное — это весь проект, и станет
    // рассуждать о нём как о целом.
    out.push({
      fileName: `${archiveName} — остаток`,
      skipped: `ещё ${left} текстовых файлов не прочитаны: исчерпан бюджет (${ZIP_MAX_READ} файлов / ${Math.round(ZIP_MAX_TOTAL / 1024)} КБ). Назови нужный файл — прочитаю его отдельно`,
    });
  }

  return out;
}

/**
 * Читает вложения из R2.
 *
 * Не бросает: недоступное вложение — не повод ронять задачу, которую
 * человек уже отправил. Каждая неудача возвращается строкой в `skipped`,
 * чтобы агент видел причину и мог о ней сказать.
 */
export async function loadAttachments(
  env: Env,
  refs: AttachmentRef[] | undefined,
): Promise<LoadedAttachment[]> {
  if (!Array.isArray(refs) || refs.length === 0) return [];
  if (!env.AZRAIL_R2) {
    return refs.map((r) => ({ fileName: r.fileName, skipped: "хранилище файлов недоступно" }));
  }

  const out: LoadedAttachment[] = [];

  for (const ref of refs.slice(0, MAX_FILES)) {
    const name = ref.fileName || "без имени";
    const ext = extOf(name);

    if (ARCHIVE_EXT.has(ext)) {
      if (ext !== "zip") {
        // tar/gz/rar/7z — другие форматы, каждый со своей распаковкой.
        // Честный отказ лучше молчаливого пустого результата.
        out.push({ fileName: name, skipped: `формат «${ext}» не распаковывается; пришли ZIP` });
        continue;
      }
      if (!ref.r2Key) {
        out.push({ fileName: name, skipped: "нет ключа в хранилище" });
        continue;
      }
      try {
        const obj = await env.AZRAIL_R2.get(ref.r2Key);
        if (!obj) {
          out.push({ fileName: name, skipped: "файл не найден в хранилище" });
          continue;
        }
        if (obj.size > 50 * 1024 * 1024) throw new ZipError("архив превышает 50 МБ");
        out.push(...(await readZip(await obj.arrayBuffer(), name)));
      } catch (err) {
        const why = err instanceof ZipError ? err.message : err instanceof Error ? err.message : String(err);
        out.push({ fileName: name, skipped: why });
      }
      continue;
    }

    if (!ref.r2Key) {
      out.push({ fileName: name, skipped: "нет ключа в хранилище" });
      continue;
    }

    try {
      const obj = await env.AZRAIL_R2.get(ref.r2Key);
      if (!obj) {
        out.push({ fileName: name, skipped: "файл не найден в хранилище" });
        continue;
      }

      if (obj.size > RICH_MAX_BYTES && (OFFICE_EXT.has(ext) || MARKDOWN_EXT.has(ext))) {
        out.push({ fileName: name, skipped: "файл больше 10 МБ" });
        continue;
      }

      if (OFFICE_EXT.has(ext)) {
        const text = await officePlain(await obj.arrayBuffer(), ext);
        if (!text) out.push({ fileName: name, skipped: "в файле нет текста" });
        else out.push({ fileName: name, text, bytes: obj.size });
        continue;
      }

      if (MARKDOWN_EXT.has(ext)) {
        if (!env.AI?.toMarkdown) {
          out.push({ fileName: name, skipped: "разбор этого типа сейчас недоступен" });
          continue;
        }
        const converted = (await env.AI.toMarkdown([{
          name,
          blob: new Blob([await obj.arrayBuffer()], { type: MARKDOWN_MIME[ext] ?? "application/octet-stream" }),
        }])) as Array<{ data?: string; error?: string; format?: string }>;
        const row = converted[0];
        const text = row?.data?.trim() ?? "";
        if (!text || row?.format === "error") {
          out.push({ fileName: name, skipped: row?.error || "разбор не вернул текст" });
          continue;
        }
        out.push({ fileName: name, text: text.slice(0, 80_000), bytes: obj.size });
        continue;
      }

      // Двоичное читать как текст бессмысленно: модель получит мусор и
      // будет рассуждать о нём как о коде.
      const looksText = TEXT_EXT.has(ext) || (ref.mimeType ?? "").startsWith("text/");
      if (!looksText) {
        out.push({ fileName: name, skipped: `тип «${ext || "неизвестен"}» не читается как текст` });
        continue;
      }

      // Do not materialize a 50 MiB text upload just to keep the first 256 KiB.
      // R2 ranged reads bound memory and subrequest payload at the storage layer.
      const truncated = obj.size > MAX_TEXT_BYTES;
      const readable = truncated
        ? await env.AZRAIL_R2.get(ref.r2Key, { range: { offset: 0, length: MAX_TEXT_BYTES } })
        : obj;
      if (!readable) {
        out.push({ fileName: name, skipped: "файл исчез во время чтения" });
        continue;
      }
      const text = await readable.text();
      if (truncated) {
        out.push({
          fileName: name,
          text,
          bytes: obj.size,
          skipped: `показано первые ${Math.round(MAX_TEXT_BYTES / 1024)} КБ из ${Math.round(obj.size / 1024)} КБ`,
        });
        continue;
      }

      out.push({ fileName: name, text, bytes: obj.size });
    } catch (err) {
      out.push({ fileName: name, skipped: err instanceof Error ? err.message : String(err) });
    }
  }

  if (refs.length > MAX_FILES) {
    out.push({
      fileName: `…и ещё ${refs.length - MAX_FILES}`,
      skipped: `за раз читается не больше ${MAX_FILES} файлов`,
    });
  }

  return out;
}

/**
 * Сворачивает прочитанное в текст для задачи.
 *
 * Пропущенные файлы попадают сюда ТОЖЕ — иначе агент решит, что их не
 * присылали, и ответит так, будто их не было. Причина пропуска ему нужна
 * не меньше содержимого.
 */
export function attachmentsToText(loaded: LoadedAttachment[]): string {
  if (loaded.length === 0) return "";

  const parts = loaded.map((a) => {
    if (a.text) {
      const note = a.skipped ? `\n[${a.skipped}]` : "";
      return `--- ФАЙЛ: ${a.fileName} ---${note}\n${a.text}`;
    }
    return `--- ФАЙЛ: ${a.fileName} — НЕ ПРОЧИТАН: ${a.skipped ?? "причина неизвестна"} ---`;
  });

  return `\n\nПРИЛОЖЕННЫЕ ФАЙЛЫ (${loaded.length}):\n\n${parts.join("\n\n")}`;
}

const ARCHIVE_MARK = /\[АРХИВ r2=(\S+) name=([^\]]+)\]/g;
const NAMED_FILE = /(?:^|[\s`'"(])((?:[\w.-]+\/)+[\w.-]+\.[\w]+|[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|txt|css|html|yml|yaml|toml|sql|py|rs|go|xml|svg|csv))/giu;

/** Строка для сохранённой реплики: следующий вопрос сможет открыть этот же архив. */
export function zipArchiveNote(refs: AttachmentRef[] | undefined): string {
  if (!Array.isArray(refs)) return "";
  return refs
    .filter((ref) => ref.r2Key && ref.fileName.toLowerCase().endsWith(".zip") && !/[\r\n\]]/.test(ref.r2Key))
    .map((ref) => `[АРХИВ r2=${ref.r2Key} name=${ref.fileName.replace(/[\[\]]/g, "").trim()}]`)
    .join("\n");
}

export function archivesFromText(text: string): Array<{ r2Key: string; fileName: string }> {
  return [...text.matchAll(ARCHIVE_MARK)].map((item) => ({ r2Key: item[1], fileName: item[2].trim() }));
}

/** Имена из новой фразы, не из старого оглавления. */
export function fileNamesInQuestion(text: string): string[] {
  const found: string[] = [];
  for (const item of text.matchAll(NAMED_FILE)) {
    const path = item[1].replace(/^\.?\//, "");
    if (path.length > 180 || path.includes("..") || found.includes(path)) continue;
    found.push(path);
    if (found.length >= 3) break;
  }
  return found;
}

export function zipNamesInHistory(text: string): string[] {
  const names: string[] = [];
  for (const item of text.matchAll(/ФАЙЛ: ([^/\n]+?\.zip)/gi)) {
    const name = item[1].trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names.slice(0, 4);
}

export function censusLine(text: string): string | null {
  const found = text.match(/Прочитано (\d+) из (\d+)\./);
  if (!found || Number(found[1]) >= Number(found[2])) return null;
  return `Прочитано ${found[1]} из ${found[2]}.`;
}

export function uploadKeyForProject(key: string, projectId: string | undefined): boolean {
  if (!projectId || !/^[A-Za-z0-9_-]{1,128}$/.test(projectId)) return false;
  return key.startsWith(`uploads/${projectId}/`) && !key.includes("..");
}

/** Дочитывает названные пути из уже загруженного ZIP. */
export async function readNamedFromZip(
  env: Env,
  archive: { r2Key: string; fileName: string },
  paths: string[],
): Promise<LoadedAttachment[]> {
  if (!env.AZRAIL_R2 || paths.length === 0) return [];
  try {
    const obj = await env.AZRAIL_R2.get(archive.r2Key);
    if (!obj) return [{ fileName: archive.fileName, skipped: "архив уже не лежит в хранилище" }];
    if (obj.size > 50 * 1024 * 1024) return [{ fileName: archive.fileName, skipped: "архив превышает 50 МБ" }];
    const buf = await obj.arrayBuffer();
    const { entries } = listZip(buf, 8000);
    const out: LoadedAttachment[] = [];
    for (const want of paths) {
      const needle = want.toLowerCase();
      const exact = entries.find((entry) => entry.path.toLowerCase() === needle);
      const tail = entries
        .filter((entry) => entry.path.toLowerCase().endsWith(`/${needle}`))
        .sort((a, b) => a.path.length - b.path.length)[0];
      const entry = exact ?? tail;
      if (!entry) {
        out.push({ fileName: `${archive.fileName} → ${want}`, skipped: "в архиве нет такого пути" });
        continue;
      }
      if (entry.skipped || !TEXT_EXT.has(extOf(entry.path))) {
        out.push({ fileName: `${archive.fileName} → ${entry.path}`, skipped: entry.skipped ?? "этот тип из архива не читается как текст" });
        continue;
      }
      if (entry.size > MAX_TEXT_BYTES) {
        out.push({ fileName: `${archive.fileName} → ${entry.path}`, skipped: `файл больше ${Math.round(MAX_TEXT_BYTES / 1024)} КБ` });
        continue;
      }
      const bytes = await readEntry(buf, entry, MAX_TEXT_BYTES);
      out.push({
        fileName: `${archive.fileName} → ${entry.path}`,
        text: new TextDecoder("utf-8").decode(bytes),
        bytes: bytes.byteLength,
      });
    }
    return out;
  } catch (err) {
    return [{ fileName: archive.fileName, skipped: err instanceof Error ? err.message : String(err) }];
  }
}

/** Старый диалог без метки: ищем ZIP этого проекта по имени из переписки. */
export async function findOwnedZip(
  env: Env,
  projectId: string,
  names: string[],
): Promise<{ r2Key: string; fileName: string } | null> {
  if (!env.AZRAIL_R2 || !uploadKeyForProject(`uploads/${projectId}/x`, projectId) || names.length === 0) return null;
  const wanted = new Set(names.map((name) => sanitizeZipName(name)));
  let cursor: string | undefined;
  for (let page = 0; page < 3; page++) {
    const listed = await env.AZRAIL_R2.list({ prefix: `uploads/${projectId}/`, limit: 100, cursor });
    for (const object of listed.objects ?? []) {
      const key = object.key;
      if (!key.toLowerCase().endsWith(".zip") || !uploadKeyForProject(key, projectId)) continue;
      const leaf = key.slice(key.lastIndexOf("/") + 1);
      for (const name of wanted) {
        if (leaf.endsWith(`-${name}`) || leaf === name) return { r2Key: key, fileName: names.find((item) => sanitizeZipName(item) === name) ?? name };
      }
    }
    if (!listed.truncated || !listed.cursor) break;
    cursor = listed.cursor;
  }
  return null;
}

function sanitizeZipName(name: string): string {
  return name.replace(/\.{2,}/g, ".").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}
