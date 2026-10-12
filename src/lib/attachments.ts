import type { Env, AttachmentRef } from "../types";
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
    text: `Файлов: ${total}. Показано: ${visible.length}.\n\n${listing}${hiddenNote}`,
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
