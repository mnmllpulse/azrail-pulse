// AZRAIL — перенос рабочей области в песочницу.
//
// НАЙДЕНО ПРИ ПОДГОТОВКЕ ИЗМЕРИТЕЛЯ, и это не мелочь.
//
// Рабочая область проекта живёт в R2 (lib/workspace.ts, префикс
// projects/<id>/workspace/). Контейнер песочницы — отдельная машина, которая
// этих файлов НИКОГДА НЕ ВИДЕЛА. То есть инструмент write_file писал в одно
// место, а sandbox_exec выполнял команды в другом, где написанного нет.
//
// Следствие, которое до сих пор не было названо вслух: прогнать тесты на
// том, что агент только что написал, было НЕЧЕМ. sandbox_test уходит в QA
// Agent и гоняет GitHub Actions — то есть проверяет то, что закоммичено в
// репозиторий, а не то, что лежит в рабочей области. Пока миссия не сделала
// коммит, её работа не проверяется вообще ничем, кроме мнения модели.
//
// Без этого файла измеритель качества невозможен в принципе: измерять
// «стало ли лучше» можно только прогнав тесты на изменённых файлах.

import type { Env } from "../types";
import { listFilesPage, readFile } from "../lib/workspace";
import { log } from "../lib/resilience";
import { getContainer, SANDBOX_LIMITS } from "./sandbox";

/** Корень рабочей области внутри контейнера. */
export const SANDBOX_WORKDIR = "/workspace";

export interface SyncResult {
  files: number;
  bytes: number;
  skipped: Array<{ path: string; reason: string }>;
}

/**
 * Загрузка SDK по требованию — ровно по той же причине, что и в sandbox.ts:
 * статический импорт тянет `cloudflare:workers`, модуль, существующий только
 * внутри воркера, и от этого падает загрузка файла в тестах.
 */
async function loadSdk() {
  const mod = (await import("@cloudflare/sandbox")) as unknown as {
    getSandbox: (ns: unknown, name: string) => {
      writeFile: (path: string, content: string) => Promise<unknown>;
      mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<unknown>;
    };
  };
  return mod;
}

/**
 * Залить файлы проекта из R2 в контейнер.
 *
 * Не инкрементально: заливается всё, что есть в рабочей области. Считать
 * разницу пришлось бы по хешам, а хранить их негде — и цена ошибки тут
 * несимметрична: лишняя заливка стоит секунд, пропущенный файл даёт прогон
 * тестов на устаревшем коде, то есть ЛОЖНЫЙ результат измерения. Из двух
 * зол выбрано медленное, а не врущее.
 */
export async function syncWorkspaceToSandbox(
  env: Env,
  projectId: string,
  opts?: { sandboxName?: string; workdir?: string; maxFiles?: number },
): Promise<SyncResult> {
  const ns = getContainer(env);
  if (!ns) throw new Error("Песочница недоступна: биндинг AZRAIL_SANDBOX не настроен.");

  const workdir = opts?.workdir ?? SANDBOX_WORKDIR;
  const maxFiles = opts?.maxFiles ?? 400;
  const { getSandbox } = await loadSdk();
  const box = getSandbox(ns, opts?.sandboxName ?? projectId);

  const page = await listFilesPage(env, projectId, maxFiles);
  if (page.truncated) throw new Error("Синхронизация неполна: превышен лимит файлов.");
  const files = page.files;
  const skipped: Array<{ path: string; reason: string }> = [];
  let bytes = 0;
  let written = 0;

  await box.mkdir(workdir, { recursive: true });

  for (const entry of files) {
    // Потолок на файл — тот же, что у вывода команды: огромный файл в
    // контейнере не нужен никому, а память воркера кончается тихо.
    if (entry.size > SANDBOX_LIMITS.MAX_FILE_BYTES) {
      throw new Error(`Файл ${entry.path} превышает лимит синхронизации ${SANDBOX_LIMITS.MAX_FILE_BYTES} байт.`);
    }
    const file = await readFile(env, projectId, entry.path);
    if (!file) {
      // Файл исчез между листингом и чтением — редко, но возможно.
      // Молча пропустить нельзя: это расхождение, о котором надо знать.
      throw new Error(`Файл ${entry.path} исчез при синхронизации.`);
    }
    await box.writeFile(`${workdir}/${entry.path}`, file.content);
    bytes += new TextEncoder().encode(file.content).byteLength;
    if (bytes > 16*1024*1024) throw new Error("Синхронизация превышает 16 МиБ.");
    written++;
  }

  log("info", "sandbox.workspace_synced", { projectId, files: written, bytes, skipped: skipped.length });
  return { files: written, bytes, skipped };
}
