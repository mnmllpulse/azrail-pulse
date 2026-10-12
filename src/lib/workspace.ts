import { workspacePrefix, storedWorkspacePath, logicalWorkspacePath } from "./workspace-head";
import type { Env } from "../types";
import { applyHunks, type Hunk } from "./patch";



export async function writeFile(env: Env, projectId: string, path: string, content: string) {
  const prefix = await workspacePrefix(env, projectId);
  const key = prefix + storedWorkspacePath(prefix, path);
  await env.AZRAIL_R2.put(key, content, { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
  return { key, path, bytes: new TextEncoder().encode(content).byteLength };
}

/**
 * Запись с защитой от нечаянной перезаписи.
 *
 * ЗАЧЕМ. write_file переписывает файл ЦЕЛИКОМ содержимым, которое модель
 * сгенерировала заново. Для нового файла это ровно то, что нужно. Для
 * существующего в пятьсот строк — способ потерять четыреста восемьдесят,
 * которых модель просто не держала в голове. Предупреждение об этом висело
 * в системном промпте, то есть проблему знали и надеялись на осторожность
 * модели.
 *
 * Надежда заменена отказом: существующий файл перезаписывается только при
 * явном overwrite: true. Отказ содержит подсказку про apply_patch — модели
 * нужен не запрет, а следующий шаг.
 *
 * ПОРОГ УСЫХАНИЯ. Даже с overwrite: true запись, ужимающая файл более чем
 * вчетверо, отклоняется: это почти всегда не «переписал», а «не дописал».
 * Порог обходится тем же overwrite вместе с явным shrink: true — то есть
 * осознанно, а не случайно.
 */
export async function writeFileGuarded(
  env: Env,
  projectId: string,
  path: string,
  content: string,
  opts: { overwrite?: boolean; shrink?: boolean } = {},
) {
  const existing = await readFile(env, projectId, path);

  if (existing && !opts.overwrite) {
    throw new Error(
      `Файл ${path} уже существует (${existing.content.length} символов). ` +
        `Полная перезапись сотрёт всё, чего нет в присланном тексте. ` +
        `Правь через apply_patch или edit_file. ` +
        `Если файл действительно нужно заменить целиком — повтори с overwrite: true.`,
    );
  }

  if (existing && opts.overwrite && !opts.shrink) {
    const was = existing.content.length;
    const now = content.length;
    if (was > 400 && now * 4 < was) {
      throw new Error(
        `Файл ${path} ужимается с ${was} до ${now} символов — больше чем вчетверо. ` +
          `Обычно это значит, что часть файла не дописана, а не что он стал короче. ` +
          `Если сокращение намеренное — повтори с overwrite: true и shrink: true.`,
      );
    }
  }

  const result = await writeFile(env, projectId, path, content);
  return { ...result, replaced: !!existing, previousBytes: existing ? new TextEncoder().encode(existing.content).byteLength : 0 };
}

export async function readFile(env: Env, projectId: string, path: string) {
  const prefix = await workspacePrefix(env, projectId);
  const key = prefix + storedWorkspacePath(prefix, path);
  const obj = await env.AZRAIL_R2.get(key);
  if (!obj) return null;
  return { path, content: await obj.text(), key };
}

/** Pagination is explicit so callers can distinguish a partial view from the whole project. */
export async function listFilesPage(env: Env, projectId: string, limit = 500) {
  const cap = Number.isFinite(limit) ? Math.max(1, Math.min(1000, Math.floor(limit))) : 500;
  const prefix = await workspacePrefix(env,projectId);
  const objects: R2Object[] = [];
  let cursor: string | undefined;
  let truncated = false;
  const seen = new Set<string>();
  do {
    const page = await env.AZRAIL_R2.list({prefix, limit:cap-objects.length, cursor});
    objects.push(...page.objects);
    truncated = !!page.truncated;
    if (!page.truncated || objects.length >= cap) break;
    if (!page.cursor || seen.has(page.cursor)) throw new Error("Incomplete R2 listing");
    seen.add(page.cursor); cursor = page.cursor;
  } while (true);
  return {files:objects.map(o => ({path:logicalWorkspacePath(prefix,o.key.slice(prefix.length)),size:o.size,uploaded:o.uploaded})), truncated};
}
export async function listFiles(env: Env, projectId: string, limit = 500) {
  return (await listFilesPage(env,projectId,limit)).files;
}

export async function editFile(env: Env, projectId: string, path: string, search: string, replacement: string) {
  const current = await readFile(env, projectId, path);
  if (!current) throw new Error(`Файл не найден: ${path}`);
  if (!search) throw new Error("search обязателен.");
  const index = current.content.indexOf(search);
  if (index === -1) throw new Error(`Фрагмент не найден в ${path}.`);

  // Неоднозначная замена — ОТКАЗ, а не «возьмём первое».
  //
  // Раньше при нескольких совпадениях молча правилось первое. Для модели
  // это худший из возможных ответов: она получает "ок", считает задачу
  // закрытой, а в файле осталось ещё два таких же места. Дальше она
  // перечитывает файл, видит незаменённое и либо правит по кругу, либо
  // решает, что инструмент сломан.
  //
  // Явный отказ дешевле: модель добавит контекста вокруг фрагмента и
  // попадёт точно. Ровно так же ведут себя нормальные инструменты правки.
  const second = current.content.indexOf(search, index + search.length);
  if (second !== -1) {
    const total = current.content.split(search).length - 1;
    throw new Error(
      `Фрагмент встречается в ${path} ${total} раз(а) — непонятно, какой править. ` +
        `Добавь окружающий текст, чтобы совпадение стало единственным.`,
    );
  }

  const next = current.content.slice(0, index) + replacement + current.content.slice(index + search.length);
  return writeFile(env, projectId, path, next);
}

/** Сколько файлов вообще разрешено прочитать за один поиск. */
const SEARCH_SCAN_CAP = 120;
/** Сколько чтений идёт одновременно. */
const SEARCH_BATCH = 12;

export async function searchFiles(env: Env, projectId: string, needle: string, limit = 50) {
  // Единая форма ответа при любом исходе: разные формы возврата из одной
  // функции — то, на чём tsc поймал этот код, и правильно сделал.
  if (!needle) return { matches: [], scannedAll: true, scanned: 0 };

  /* Работа ограничена по ЧТЕНИЯМ, а не по находкам.
   *
   * Раньше цикл шёл по всем файлам подряд и прерывался только набрав
   * limit совпадений. Поиск, который ничего не находит — самый обычный
   * случай — прочитывал все 500 файлов ПОСЛЕДОВАТЕЛЬНО. У Workers есть
   * потолок подзапросов (на бесплатном плане 50), так что такой поиск
   * либо упирался в него, либо тянулся десятки секунд и съедал время
   * всей миссии.
   *
   * Теперь потолок стоит на прочитанном, чтения идут пачками, а если
   * просмотрено не всё — это СКАЗАНО. Молча урезанный результат хуже
   * честно неполного: по нему делают вывод «такого в проекте нет».
   */
  const page = await listFilesPage(env, projectId, SEARCH_SCAN_CAP);
  const files = page.files;
  const cap = Number.isFinite(limit) ? Math.max(1,Math.min(500,Math.floor(limit))) : 50;
  const out: {path:string}[] = [];
  let scanned = 0, unreadable = 0, matchesTruncated = false;
  for (let i=0; i<files.length && out.length<cap; i+=SEARCH_BATCH) {
    const batch = files.slice(i,i+SEARCH_BATCH);
    const results = await Promise.all(batch.map(async f => {
      try {
        const file = await readFile(env,projectId,f.path);
        if (!file) { unreadable++; return null; }
        return file.content.includes(needle) ? f.path : null;
      } catch { unreadable++; return null; }
    }));
    scanned += batch.length;
    for (const hit of results) {
      if (hit && out.length < cap) out.push({path:hit});
      else if (hit) matchesTruncated = true;
    }
  }
  return {matches:out, scanned, unreadable,
    scannedAll:!page.truncated && scanned===files.length && unreadable===0,
    matchesTruncated:matchesTruncated || scanned<files.length || page.truncated};
}


/**
 * Правка файла набором привязанных кусков — всё или ничего.
 *
 * Логика применения живёт в lib/patch.ts и не знает про хранилище: так её
 * можно проверить на всех краевых случаях без R2. Здесь — только чтение,
 * применение и запись.
 */
export async function applyPatch(env: Env, projectId: string, path: string, hunks: Hunk[]) {
  const current = await readFile(env, projectId, path);
  if (!current) {
    // Патч по несуществующему файлу — не ошибка инструмента, а ошибка
    // выбора инструмента. Так и сказано, чтобы модель не пыталась
    // «починить» патч.
    throw new Error(`Файл не найден: ${path}. Новый файл создаётся через write_file, а не патчем.`);
  }

  const result = applyHunks(current.content, hunks);
  if (!result.ok) throw new Error(result.error);

  await writeFile(env, projectId, path, result.content);
  return {
    path,
    applied: result.applied,
    added: result.added,
    removed: result.removed,
    bytes: new TextEncoder().encode(result.content).byteLength,
  };
}
