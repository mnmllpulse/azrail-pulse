// AZRAIL — история версий проекта: чтение и восстановление.
//
// ПОЧЕМУ ЭТОТ ФАЙЛ ЕСТЬ: project_versions пишут UI Agent (saveArtifact) и
// Code Agent (saveVersion) с первых версий этих агентов, но ничего никогда
// не читало эти записи обратно — таблица только наполнялась. Половина
// «Stateful Checkpointing» из спецификации владельца была готова, вторая
// половина (восстановление) — нет.
//
// НАЙДЕНА НЕСТЫКОВКА при разборе существующего кода (не эта правка её
// создала, только учитывает): r2_object_key означает РАЗНОЕ у разных
// агентов.
//   - code-agent (saveVersion):  ключ указывает на ЕДИНСТВЕННЫЙ .md-файл.
//   - ui-agent   (saveArtifact): ключ — это ПРЕФИКС (оканчивается на "/"),
//                                 под ним лежат несколько файлов.
// Различаю по завершающему "/" — единственный устойчивый признак, уже
// присутствующий в данных, без миграции схемы и без правки двух рабочих
// и покрытых тестами функций записи.
//
// ЧЕГО ЭТА ФУНКЦИЯ НЕ ДЕЛАЕТ: restoreVersion ничего не перезаписывает и
// никуда не коммитит. Она возвращает файлы как есть (тот же контракт
// {path, content}[], что и у UI Agent) — что делать с ними дальше, решает
// человек. Ни Git Agent, ни Deploy Agent отсюда не вызываются: это ровно
// та граница, которую docs/product/ARCHITECTURE-v2.md проводит для самомодификации —
// восстановление контента проекта не должно тихо становиться деплоем.
//
// НЕ ПРОВЕРЕНО ЖИВЫМ R2: сигнатура list()/get() соответствует Workers R2
// API, но песочница, где писался этот файл, не имеет доступа к реальному
// Cloudflare R2 — как и OSV.dev-запросы в Security Agent в своё время.
// Проверить после деплоя через GET /api/projects/:id/versions на реальном
// проекте с версиями от UI/Code Agent.

import type { Env } from "../types";
import { log } from "./resilience";

export interface ProjectVersion {
  id: string;
  versionNumber: number;
  summary: string | null;
  createdByAgent: string | null;
  createdAt: string;
}

export interface RestoredFile {
  path: string;
  content: string;
}

export interface RestoredVersion {
  /** true, если взяты не все файлы версии: упёрлись в потолок. */
  truncated?: boolean;
  version: ProjectVersion;
  files: RestoredFile[];
}

interface VersionRow {
  id: string;
  version_number: number;
  summary: string | null;
  created_by_agent: string | null;
  created_at: string;
}

interface VersionRowWithKey extends VersionRow {
  r2_object_key: string;
}

function toVersion(row: VersionRow): ProjectVersion {
  return {
    id: row.id,
    versionNumber: row.version_number,
    summary: row.summary,
    createdByAgent: row.created_by_agent,
    createdAt: row.created_at,
  };
}

/** Список версий проекта, новые сверху. Ничего не трогает в R2. */
export async function listVersions(env: Env, projectId: string, limit = 50): Promise<ProjectVersion[]> {
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT id, version_number, summary, created_by_agent, created_at
     FROM project_versions
     WHERE project_id = ?
     ORDER BY version_number DESC
     LIMIT ?`,
  )
    .bind(projectId, limit)
    .all<VersionRow>();

  return results.map(toVersion);
}

/**
 * Достаёт файлы конкретной версии из R2. Возвращает null, если версии с
 * таким id у этого проекта нет (чужой id, опечатка) — это не ошибка,
 * а «не найдено», разница важна для HTTP-статуса на вызывающей стороне.
 */
export async function restoreVersion(env: Env, projectId: string, versionId: string): Promise<RestoredVersion | null> {
  const row = await env.AZRAIL_D1.prepare(
    `SELECT id, version_number, r2_object_key, summary, created_by_agent, created_at
     FROM project_versions WHERE project_id = ? AND id = ?`,
  )
    .bind(projectId, versionId)
    .first<VersionRowWithKey>();

  if (!row) return null;

  const version = toVersion(row);

  try {
    if (row.r2_object_key.endsWith("/")) {
      /* ui-agent: несколько файлов под общим префиксом.
       *
       * Работа ограничена по числу файлов и по объёму, чтения идут пачками.
       *
       * Раньше цикл шёл по всем объектам и читал их ПО ОДНОМУ, складывая
       * всё в память без потолка. Версия из пятисот файлов — это пятьсот
       * последовательных запросов к R2 (у Workers есть лимит подзапросов)
       * плюс весь их текст разом в памяти при лимите в 128 МБ. То есть
       * восстановление большой версии не «медленное», а падающее.
       *
       * Ровно так же чинился searchFiles: потолок на работу, чтение
       * пачками, и честное сообщение, если взято не всё.
       */
      const MAX_FILES = 300;
      const MAX_BYTES = 24 * 1024 * 1024; // с запасом под лимит памяти Worker
      const BATCH = 12;

      const objects: Array<{key:string;size:number}> = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined,listedBytes=0,truncated=false;
      do {
        const listed = await env.AZRAIL_R2.list({ prefix: row.r2_object_key, cursor });
        for (const obj of listed.objects) {
          if (objects.length >= MAX_FILES) { truncated=true; break; }
          if (!Number.isSafeInteger(obj.size) || obj.size < 0) throw new Error("Некорректный размер объекта версии.");
          if (obj.size > MAX_BYTES || listedBytes + obj.size > MAX_BYTES) { truncated=true; break; }
          objects.push({key:obj.key,size:obj.size});
          listedBytes += obj.size;
        }
        if(truncated) { cursor=undefined; break; }
        cursor = listed.truncated ? listed.cursor : undefined;
        if(listed.truncated && (!listed.cursor || seenCursors.has(listed.cursor))) throw new Error("Неполный список объектов версии.");
        if(listed.cursor) seenCursors.add(listed.cursor);
      } while (cursor);

      const files: RestoredFile[] = [];
      let bytes = 0;

      for (let i = 0; i < objects.length && bytes < MAX_BYTES; i += BATCH) {
        const batch = await Promise.all(
          objects.slice(i, i + BATCH).map(async ({key,size}) => {
            const body = await env.AZRAIL_R2.get(key);
            if (!body) return null;
            if (body.size !== size) throw new Error("Объект версии изменился во время восстановления.");
            const content=await body.text();
            const actualBytes=new TextEncoder().encode(content).byteLength;
            if(actualBytes!==size) throw new Error("Размер текстового объекта версии не совпадает с метаданными R2.");
            return { path: key.slice(row.r2_object_key.length), content, bytes:actualBytes };
          }),
        );
        for (const file of batch) {
          if (!file) { truncated=true; continue; }
          if (bytes + file.bytes > MAX_BYTES) { truncated = true; break; }
          bytes += file.bytes;
          files.push({path:file.path,content:file.content});
        }
      }

      // Неполноту говорим ВСЛУХ. Молча урезанное восстановление — это
      // проект, который выглядит целым и не работает, причём причину
      // придётся искать в коде, а не в сообщении.
      return { version, files, truncated };
    }

    // code-agent: один markdown-файл, ключ указывает прямо на него.
    const body = await env.AZRAIL_R2.get(row.r2_object_key);
    if (!body) return { version, files: [] };
    if(body.size>24*1024*1024)return {version,files:[],truncated:true};
    const name = row.r2_object_key.split("/").pop() ?? row.r2_object_key;
    return { version, files: [{ path: name, content: await body.text() }] };
  } catch (err) {
    log("error", "version.restore_failed", {
      projectId,
      versionId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
