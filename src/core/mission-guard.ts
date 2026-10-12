import { workspacePrefix, publishWorkspace, logicalWorkspacePath, workspacePath } from "../lib/workspace-head";
import type { ProjectLease } from "../lib/project-control";
import type { Env } from "../types";
import type { TraceContext } from "../lib/observability-context";
import { log } from "../lib/resilience";
import { cleanupUnpublishedR2, deleteR2KeysBestEffort } from "../lib/r2-consistency";

/**
 * ЗАЩИТА МИССИИ.
 *
 * Три дыры, найденные проверкой кода, а не догадками:
 *
 *  1. Миссия падала на пятом шаге из восьми — и файлы, записанные на
 *     первых четырёх, оставались. Проект в промежуточном состоянии, и
 *     никто об этом не говорил.
 *
 *  2. Цикл останавливали только три ОШИБКИ подряд. Повтор УСПЕШНОГО
 *     действия не ловился вообще: агент мог двадцать раз прочитать один
 *     файл, сжечь весь бюджет и отчитаться «потолок шагов» — хотя
 *     причина была видна на первом же повторе.
 *
 *  3. Тесты гонялись только в конце. Без замера ДО работы нельзя
 *     отличить «я починил» от «оно и так работало» и, что важнее, от
 *     «я сломал то, что работало».
 */

/* ── Обнаружение зацикливания ────────────────────────────────────── */

export interface StepFingerprint {
  tool: string;
  input: Record<string, unknown>;
  /** Успех шага. Нужен, чтобы неудачная правка не считалась изменением файла. */
  ok?: boolean;
}

/** Инструменты, которые меняют файл по input.path. */
export const MUTATING_TOOLS = new Set(["write_file", "edit_file", "apply_patch"]);

/**
 * Отпечаток шага: инструмент плюс его вход.
 *
 * Ключи входа СОРТИРУЮТСЯ перед сериализацией. Без этого {a:1,b:2} и
 * {b:2,a:1} дают разные строки, и повтор не распознаётся — а модель
 * порядок полей не гарантирует.
 */
export function fingerprint(step: StepFingerprint): string {
  const input = step.input ?? {};
  const keys = Object.keys(input).sort();
  const norm = keys.map((k) => `${k}=${JSON.stringify(input[k])}`).join("&");
  return `${step.tool}(${norm})`;
}

export interface LoopVerdict {
  looping: boolean;
  /** Сколько раз повторён отпечаток, включая текущий вызов. */
  repeats: number;
  reason: string;
}

/** После скольких одинаковых вызовов считаем это зацикливанием. */
const REPEAT_LIMIT = 3;

/**
 * Проверить, не топчется ли цикл на месте.
 *
 * Считаются ТОЧНЫЕ повторы: тот же инструмент с тем же входом. Чтение
 * одного файла дважды — нормально (между ними могла быть правка).
 * Трижды подряд с тем же входом — уже симптом.
 *
 * Намеренно НЕ считается «тот же инструмент с другим входом»: перебор
 * файлов через list_files → read_file → read_file — это нормальная
 * работа, а не зацикливание.
 */
export function detectLoop(history: StepFingerprint[], next: StepFingerprint): LoopVerdict {
  const fp = fingerprint(next);

  /* Повторы считаются только ПОСЛЕ последней успешной правки того же файла.
   *
   * Раньше счёт шёл по всей истории: read → edit → read → edit → read
   * одного файла давало «зацикливание» на третьем чтении, хотя каждое
   * чтение видело новый текст. Это нормальный цикл правки, а не тупик. */
  const path = typeof next.input?.path === "string" ? next.input.path : null;
  let from = 0;
  if (path && !MUTATING_TOOLS.has(next.tool)) {
    for (let k = history.length - 1; k >= 0; k--) {
      const h = history[k];
      if (MUTATING_TOOLS.has(h.tool) && h.ok !== false && h.input?.path === path) {
        from = k + 1;
        break;
      }
    }
  }
  const repeats = history.slice(from).filter((h) => fingerprint(h) === fp).length + 1;

  if (repeats >= REPEAT_LIMIT) {
    return {
      looping: true,
      repeats,
      reason:
        `Шаг «${fp}» повторяется ${repeats}-й раз с тем же входом. ` +
        `Результат не меняется — нужен другой подход, а не повтор.`,
    };
  }
  return { looping: false, repeats, reason: "" };
}

/* ── Снимок и откат ──────────────────────────────────────────────── */

export interface Snapshot {
  versionId: string;
  r2Key: string;
  files: number;
}

/** Read all pages before changing anything; never treat a partial listing as complete. */
async function listSnapshotObjects(env: Env, prefix: string) {
  const objects: Array<{ key: string; size: number }> = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  let bytes = 0;
  do {
    const page = await env.AZRAIL_R2.list({ prefix, limit: 300, cursor });
    objects.push(...page.objects);
    bytes += page.objects.reduce((n, o) => n + o.size, 0);
    if (objects.length > 1000 || bytes > 16 * 1024 * 1024) throw new Error("Snapshot budget exceeded (1000 files / 16 MiB)");
    if (!page.truncated) break;
    if (!page.cursor || seen.has(page.cursor)) throw new Error("Incomplete R2 listing");
    seen.add(page.cursor);
    cursor = page.cursor;
  } while (true);
  return { objects };
}

/**
 * Снять состояние рабочей области перед миссией.
 *
 * missionId is optional for compatibility with standalone callers/tests. When
 * supplied, the version row and mission->snapshot link are published in the
 * same D1 batch. This closes the crash window where a snapshot version existed
 * but recovery did not know it belonged to the mission and could take a second
 * baseline after partial mutations.
 */
export async function snapshotWorkspace(
  env: Env,
  projectId: string,
  note: string,
  missionId?: string,
): Promise<Snapshot | null> {
  const written:string[]=[];
  let versionId="",key="",publicationAttempted=false;
  try {
    const prefix = await workspacePrefix(env,projectId);
    const listed = await listSnapshotObjects(env, prefix);
    if (!listed.objects.length) return null;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    key = `projects/${projectId}/snapshots-v2/${stamp}-${crypto.randomUUID()}/`;

    // Копируем содержимое, а не ссылку: объект в рабочей области будет
    // перезаписан миссией, и ссылка на него после этого указывала бы на
    // уже изменённые данные — то есть снимок не был бы снимком.
    for (const obj of listed.objects) {
      const body = await env.AZRAIL_R2.get(obj.key);
      if (!body) throw new Error("Snapshot source disappeared");
      const target=key + logicalWorkspacePath(prefix, obj.key.slice(prefix.length));
      await env.AZRAIL_R2.put(target, new Uint8Array(await body.arrayBuffer()));
      written.push(target);
    }

    versionId = crypto.randomUUID();
    publicationAttempted=true;
    try {
      const versionStmt=env.AZRAIL_D1.prepare(
        `INSERT INTO project_versions (id, project_id, version_number, r2_object_key, summary, created_by_agent)
         SELECT ?, ?, COALESCE(MAX(version_number), 0) + 1, ?, ?, 'execution-engine'
         FROM project_versions WHERE project_id = ?`,
      ).bind(versionId, projectId, key, `Снимок до миссии: ${note.slice(0, 200)}`, projectId);
      if(missionId){
        const linkStmt=env.AZRAIL_D1.prepare(`INSERT INTO mission_snapshots(mission_id,r2_key)
          SELECT ?,? WHERE EXISTS(SELECT 1 FROM project_versions WHERE id=? AND project_id=?)`).bind(missionId,key,versionId,projectId);
        // D1 batch is transactional: success means both rows committed. A
        // pre-existing link makes the batch fail instead of silently creating a
        // second baseline that recovery would never use.
        await env.AZRAIL_D1.batch([versionStmt,linkStmt]);
      } else {
        await versionStmt.run();
      }
    } catch(error) {
      const cleanup=await cleanupUnpublishedR2(
        env,written,
        async()=>{
          const version=await env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM project_versions WHERE id=? AND project_id=?").bind(versionId,projectId).first();
          if(!version)return false;
          if(!missionId)return true;
          const link=await env.AZRAIL_D1.prepare("SELECT r2_key FROM mission_snapshots WHERE mission_id=?").bind(missionId).first<{r2_key:string}>();
          return link?.r2_key===key;
        },
        "snapshot.publish_cleanup",{projectId,missionId,versionId,key},
      );
      if(cleanup.published!==true) throw error;
      log("warn","snapshot.publish_response_lost",{projectId,missionId,versionId,key});
    }

    return { versionId, r2Key:key, files: listed.objects.length };
  } catch (err) {
    // If copying failed before D1 publication was attempted, the random prefix
    // is definitely unreachable and can be removed without a D1 read.
    if(!publicationAttempted && written.length) await deleteR2KeysBestEffort(env,written,"snapshot.stage_cleanup",{projectId,missionId,key});
    // Снимок не удался — миссия всё равно идёт. Отсутствие страховки
    // хуже, чем её наличие, но лучше, чем отказ делать работу.
    log("warn", "snapshot.failed", {
      projectId,
      missionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Вернуть рабочую область к снимку.
 *
 * ВАЖНО: файлы, появившиеся во время миссии и отсутствовавшие в снимке,
 * УДАЛЯЮТСЯ. Иначе откат неполон: остались бы половинчатые новые файлы,
 * на которые ничего не ссылается, и разбираться в этом пришлось бы
 * руками.
 */
export async function rollbackWorkspace(
  env: Env,
  projectId: string,
  snapshotKey: string,
  lease: ProjectLease,
  trace?: TraceContext,
): Promise<{ restored: number; removed: number } | null> {
  try {
    const prefix = await workspacePrefix(env,projectId);

    if (!(snapshotKey.startsWith(`projects/${projectId}/snapshots/`) || snapshotKey.startsWith(`projects/${projectId}/snapshots-v2/`)) || !snapshotKey.endsWith("/")) throw new Error("Invalid snapshot scope");
    const snap = await listSnapshotObjects(env, snapshotKey);
    if (!snap.objects.length) throw new Error("Empty or missing snapshot; rollback refused");
    const wanted = new Map<string, Uint8Array>();
    for (const obj of snap.objects) {
      const body = await env.AZRAIL_R2.get(obj.key);
      if (!body) throw new Error("Snapshot object missing; rollback refused");
      const path = workspacePath(obj.key.slice(snapshotKey.length));
      if(snapshotKey.includes("/snapshots/") && /%[0-9a-f]{2}/i.test(path))
        throw new Error("Legacy snapshot has ambiguous path encoding; review before restoring");
      wanted.set(path, new Uint8Array(await body.arrayBuffer()));
    }

    const current = await listSnapshotObjects(env, prefix);
    const removed=current.objects.filter(obj=>!wanted.has(logicalWorkspacePath(prefix,obj.key.slice(prefix.length)))).length;
    await publishWorkspace(env,projectId,[...wanted].map(([path,content])=>({path,content})),lease,trace);
    const restored=wanted.size;
    return { restored, removed };
  } catch (err) {
    log("error", "rollback.failed", {
      projectId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/* ── Сравнение тестов до и после ─────────────────────────────────── */

export interface TestComparison {
  /** Стало ли хуже: то, что проходило, перестало. */
  regressed: boolean;
  /** Починено ли то, что падало. */
  fixed: boolean;
  summary: string;
}

/**
 * Сравнить замеры тестов до и после работы.
 *
 * Критерий взят из практики оценки агентов на реальных задачах и строже
 * очевидного:
 *   — целевое: падало до → проходит после;
 *   — И ВСЁ ОСТАЛЬНОЕ: проходило до → проходит после.
 *
 * Второе условие важнее первого. Агент, починивший одно и сломавший три,
 * формально решил задачу — и именно этот случай надо ловить.
 */
export function compareTests(
  before: { passed: number; failed: number } | null,
  after: { passed: number; failed: number } | null,
): TestComparison {
  if (!before || !after) {
    return {
      regressed: false,
      fixed: false,
      summary: before
        ? "Замер после работы не получен — сравнить не с чем."
        : "Замера до работы не было: нельзя отличить починку от того, что всё и так работало.",
    };
  }

  const regressed = after.passed < before.passed || after.failed > before.failed;
  const fixed = before.failed > 0 && after.failed === 0;

  if (regressed) {
    return {
      regressed: true,
      fixed: false,
      summary:
        `Стало хуже: было ${before.passed} пройдено / ${before.failed} упало, ` +
        `стало ${after.passed} / ${after.failed}. Сломано то, что работало.`,
    };
  }
  if (fixed) {
    return { regressed: false, fixed: true, summary: `Починено: ${before.failed} падавших тестов теперь проходят.` };
  }
  if (before.failed === 0 && after.failed === 0) {
    return {
      regressed: false,
      fixed: false,
      summary: "Тесты проходили и до работы, и после — задача не про них либо не проверяется тестами.",
    };
  }
  return {
    regressed: false,
    fixed: false,
    summary: `Без изменений: ${after.failed} тест(ов) падало до работы и падает после.`,
  };
}
