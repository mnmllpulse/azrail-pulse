import type { Env } from "../types";
import { log } from "../lib/resilience";

/**
 * ПЛАН МИССИИ.
 *
 * Зачем он вообще нужен, если цикл и так работает: раньше модель на каждом
 * шаге решала заново, глядя только на историю вызовов. Для задачи в три
 * шага это нормально. На длинной задаче цель размывается — известный
 * эффект, когда с ростом контекста внимание модели «растекается» и она
 * начинает делать не то, с чего начинала.
 *
 * План борется с этим двумя способами:
 *  1. Он СОСТАВЛЯЕТСЯ один раз в начале — то есть задача декомпозируется,
 *     пока контекст ещё чистый и цель видна целиком.
 *  2. Он ДОПИСЫВАЕТСЯ в конец каждого запроса к модели. Не в начало:
 *     начало запроса модель видит хуже всего к концу длинного диалога.
 *     Приём известен как «recitation» — проговаривание цели вслух.
 *
 * План лежит в D1, а не в памяти процесса: миссия должна переживать
 * выгрузку объекта, а прогресс — быть видимым снаружи.
 */

export interface PlanStep {
  id: string;
  position: number;
  title: string;
  status: "pending" | "doing" | "done" | "skipped";
  note?: string;
}

/** Потолок шагов плана. Больше двенадцати — это уже не план, а список
 *  задач, и модель начинает придумывать шаги ради длины. */
const MAX_STEPS = 12;
const MAX_PLAN_HISTORY_ROWS = 48;

/**
 * Restore the durable plan instead of generating a second plan after a crash.
 * `null` means no plan has ever been persisted. A thrown error means durable
 * plan state exists but cannot be trusted; callers should continue planless
 * rather than append another contradictory generation.
 */
export async function loadPlan(env: Env, missionId: string): Promise<PlanStep[] | null> {
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT id, position, title, status, note FROM mission_steps WHERE mission_id = ? ORDER BY rowid`,
  ).bind(missionId).all<{id:string;position:number;title:string;status:string;note:string|null}>();
  if (!results?.length) return null;
  if (results.length > MAX_PLAN_HISTORY_ROWS) throw new Error("История плана превышает безопасный предел.");

  let doing = 0;
  const allowed = new Set<PlanStep["status"]>(["pending", "doing", "done", "skipped"]);
  const steps = results.map((row) => {
    if (typeof row.id !== "string" || !row.id || !Number.isSafeInteger(row.position) || row.position < 0 || row.position >= MAX_STEPS)
      throw new Error("Повреждена структура сохранённого плана.");
    if (typeof row.title !== "string" || !row.title.trim() || row.title.length > 300 || !allowed.has(row.status as PlanStep["status"]))
      throw new Error("Повреждено содержимое сохранённого плана.");
    if (row.status === "doing") doing++;
    return { id: row.id, position: row.position, title: row.title, status: row.status as PlanStep["status"], ...(row.note ? { note: row.note } : {}) };
  });
  if (doing > 1) throw new Error("Сохранённый план содержит несколько активных шагов.");
  return steps;
}

/**
 * Разбор плана из ответа модели.
 *
 * Отдельная чистая функция, а не кусок внутри запроса: разбор чужого
 * вывода — самое хрупкое место, и его надо проверять тестами напрямую.
 *
 * Принимаются два вида: JSON-массив строк и просто нумерованный список.
 * Второе — потому что модели регулярно отвечают списком несмотря на
 * просьбу дать JSON, и ронять из-за этого миссию незачем.
 */
export type PlanNode = { title: string; dependsOn: number[]; explicit: boolean };

/** Заметка шага хранит явные рёбра, не подменяя человеческий текст. */
export function readDependencyNote(note: string | null | undefined): { dependsOn: string[]; text?: string } | null {
  if (!note || !note.startsWith("{")) return null;
  try {
    const body = JSON.parse(note) as { dependsOn?: unknown; text?: unknown };
    if (!Array.isArray(body.dependsOn) || body.dependsOn.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_.:-]{1,120}$/.test(id))) return null;
    const text = typeof body.text === "string" && body.text.trim() ? body.text.slice(0, 400) : undefined;
    return { dependsOn: body.dependsOn.slice(0, 12), ...(text ? { text } : {}) };
  } catch {
    return null;
  }
}

export function dependencyNote(dependsOn: string[], text?: string): string {
  const clean = text?.trim().slice(0, 400);
  const body = JSON.stringify({ dependsOn: dependsOn.slice(0, 12), ...(clean ? { text: clean } : {}) });
  return body.length > 500 ? JSON.stringify({ dependsOn: dependsOn.slice(0, 12) }) : body;
}

function mergeDependencyNote(previous: string | undefined, human: string | undefined): string | null {
  const edge = readDependencyNote(previous);
  if (!edge) return human ? human.slice(0, 500) : previous ?? null;
  return dependencyNote(edge.dependsOn, human ?? edge.text);
}

/**
 * Разбор плана из ответа модели.
 *
 * Строки и нумерованный список остаются прежним путём: рёбер нет, и граф
 * честно остаётся производным от порядка. Объекты с dependsOn — явный граф.
 * Номер в dependsOn указывает на более ранний шаг того же массива.
 */
export function parsePlanNodes(raw: string): PlanNode[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = unfenced.indexOf("[");
  const end = unfenced.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const parsed: unknown = JSON.parse(unfenced.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        const nodes: PlanNode[] = [];
        for (const item of parsed) {
          if (nodes.length >= MAX_STEPS) break;
          if (typeof item === "string" && item.trim()) {
            nodes.push({ title: item.trim().slice(0, 300), dependsOn: [], explicit: false });
            continue;
          }
          if (!item || typeof item !== "object" || !("title" in item)) continue;
          const title = String((item as { title: unknown }).title).trim().slice(0, 300);
          if (!title) continue;
          const rawDeps = (item as { dependsOn?: unknown }).dependsOn;
          const explicit = Array.isArray(rawDeps);
          const dependsOn = explicit
            ? rawDeps.filter((dep): dep is number => Number.isInteger(dep) && (dep as number) >= 0 && (dep as number) < nodes.length)
            : [];
          nodes.push({ title, dependsOn, explicit });
        }
        if (nodes.length) return nodes;
      }
    } catch {
      // Не JSON — идём к списку. Это ожидаемый путь, не сбой.
    }
  }
  return unfenced
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(?:\d+[.)]|[-*•])\s+/.test(line))
    .map((line) => line.replace(/^(?:\d+[.)]|[-*•])\s+/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_STEPS)
    .map((title) => ({ title: title.slice(0, 300), dependsOn: [], explicit: false }));
}

export function parsePlan(raw: string): string[] {
  return parsePlanNodes(raw).map((node) => node.title);
}

/** Сохранить план миссии. Возвращает сохранённые шаги. */
export async function savePlan(env: Env, missionId: string, titles: string[], edges?: number[][]): Promise<PlanStep[]> {
  const steps: PlanStep[] = titles.slice(0, MAX_STEPS).map((title, i) => ({
    id: crypto.randomUUID(),
    position: i,
    title: title.slice(0, 300),
    status: i === 0 ? "doing" : "pending",
  }));
  if (edges) {
    steps.forEach((step, index) => {
      const prior = (edges[index] ?? []).filter((dep) => Number.isInteger(dep) && dep >= 0 && dep < index);
      step.note = dependencyNote(prior.map((dep) => steps[dep].id));
    });
  }

  if (!steps.length) return [];

  try {
    // D1 batch is transactional. A partially persisted plan is worse than no
    // plan because recovery would then resume from a contradictory state.
    await env.AZRAIL_D1.batch(steps.map((s) => env.AZRAIL_D1.prepare(
      `INSERT INTO mission_steps (id, mission_id, position, title, status, note) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(s.id, missionId, s.position, s.title, s.status, s.note ?? null)));
    return steps;
  } catch (err) {
    // The batch may have committed and lost its response. Re-read durable
    // state before deciding the plan is unavailable; never append a second
    // generation merely because the acknowledgement was ambiguous.
    try {
      const durable = await loadPlan(env, missionId);
      if (durable?.length) return durable;
    } catch {}
    log("error", "plan.save_failed", {
      missionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** Отметить шаг выполненным и перевести следующий в работу. */
export async function advancePlan(env: Env, missionId: string, steps: PlanStep[], note?: string): Promise<PlanStep[]> {
  const current = steps.find((s) => s.status === "doing");
  if (!current) return steps;
  const next = steps.find((s) => s.status === "pending");
  const now = new Date().toISOString();
  const currentNote = mergeDependencyNote(current.note, note);

  try {
    const statements = [
      env.AZRAIL_D1.prepare(
        `UPDATE mission_steps SET status = 'done', note = ?, updated_at = ? WHERE id = ? AND mission_id = ? AND status = 'doing' RETURNING id`,
      ).bind(currentNote, now, current.id, missionId),
    ];
    if (next) statements.push(env.AZRAIL_D1.prepare(
      `UPDATE mission_steps SET status = 'doing', updated_at = ? WHERE id = ? AND mission_id = ? AND status = 'pending' RETURNING id`,
    ).bind(now, next.id, missionId));
    const result = await env.AZRAIL_D1.batch(statements) as Array<{results?:unknown[]}>;
    if (!result[0]?.results?.length || (next && !result[1]?.results?.length)) throw new Error("plan state changed during advance");

    current.status = "done";
    if (currentNote) current.note = currentNote;
    if (next) next.status = "doing";
    return steps;
  } catch (err) {
    // If the transaction committed and only its response was lost, durable
    // state is authoritative for the next model decision.
    try {
      const durable = await loadPlan(env, missionId);
      if (durable?.length) return durable;
    } catch {}
    log("error", "plan.advance_failed", {
      missionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return steps;
  }
}

/**
 * План в виде текста для запроса к модели.
 *
 * Текущий шаг помечен явно. Без пометки модель видит список и не понимает,
 * где находится, — а это и есть тот вопрос, ради которого план нужен.
 */
export function renderPlan(steps: PlanStep[]): string {
  if (!steps.length) return "";
  const marks: Record<PlanStep["status"], string> = {
    done: "[x]",
    doing: "[→]",
    pending: "[ ]",
    skipped: "[-]",
  };
  const body = steps.map((s) => `${marks[s.status]} ${s.position + 1}. ${s.title}`).join("\n");
  return `ПЛАН (→ отмечает текущий шаг):\n${body}`;
}

/** Сколько шагов плана закрыто — для честного показа прогресса. */
export function planProgress(steps: PlanStep[]): { done: number; total: number } {
  return {
    done: steps.filter((s) => s.status === "done" || s.status === "skipped").length,
    total: steps.length,
  };
}



/** Сколько раз за миссию разрешено пересобрать план.
 *
 *  Ревизия стоит вызова модели и шага. Без потолка цикл легко сползает в
 *  «планирую, как планировать»: каждая неудача порождает новый план, новый
 *  план порождает новую неудачу, и миссия расходует потолок шагов, не
 *  тронув ни одного файла. Два — это «ошибся в начале» и «ошибся ещё раз
 *  уже зная больше»; третий раз означает, что дело не в плане. */
export const MAX_REVISIONS = 2;

/**
 * Пересборка оставшейся части плана.
 *
 * ВЫПОЛНЕННОЕ НЕ ТРОГАЕТСЯ. Шаги со статусом done остаются как есть: это
 * сделанная работа, и переписывать её задним числом значит терять след
 * того, что происходило. Заменяются только pending и doing — то, что ещё
 * предстоит и что оказалось неверным.
 *
 * Отменённые помечаются skipped с причиной, а не удаляются. Через месяц
 * вопрос «почему миссия пошла не туда» решается по журналу, и исчезнувший
 * шаг делает его неотвечаемым.
 */
const titleKey = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Убирает пустые шаги и повторы уже выполненных или предыдущих шагов (по нормализованному тексту). */
export function dedupeTitles(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map(titleKey));
  const out: string[] = [];
  for (const raw of incoming) {
    const title = raw.trim();
    const key = titleKey(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}

export async function revisePlan(
  env: Env,
  missionId: string,
  steps: PlanStep[],
  newTitles: string[],
  reason: string,
): Promise<PlanStep[]> {
  const kept = steps.filter((s) => s.status === "done");
  const dropped = steps.filter((s) => s.status !== "done");

  const titles = dedupeTitles(kept.map((s) => s.title), newTitles).slice(0, MAX_STEPS - kept.length);
  if (!titles.length) {
    // Пустая замена оставила бы миссию совсем без плана — хуже, чем с
    // неверным: неверный хотя бы задаёт направление.
    return steps;
  }

  const fresh: PlanStep[] = titles.map((title, i) => ({
    id: crypto.randomUUID(),
    position: kept.length + i,
    title: title.slice(0, 300),
    status: i === 0 ? "doing" : "pending",
  }));

  const now = new Date().toISOString();
  const skipped = dropped.map((s) => ({...s, status: "skipped" as const, note: `отменён при пересборке плана: ${reason}`.slice(0, 500)}));
  try {
    const statements = [
      ...skipped.map((s) => env.AZRAIL_D1.prepare(
        `UPDATE mission_steps SET status = 'skipped', note = ?, updated_at = ? WHERE id = ? AND mission_id = ? AND status <> 'done' RETURNING id`,
      ).bind(s.note, now, s.id, missionId)),
      ...fresh.map((s) => env.AZRAIL_D1.prepare(
        `INSERT INTO mission_steps (id, mission_id, position, title, status) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      ).bind(s.id, missionId, s.position, s.title, s.status)),
    ];
    const result = await env.AZRAIL_D1.batch(statements) as Array<{results?:unknown[]}>;
    if (result.some((r) => !r?.results?.length)) throw new Error("plan state changed during revision");
    return [...kept, ...skipped, ...fresh];
  } catch (err) {
    try {
      const durable = await loadPlan(env, missionId);
      if (durable?.length) return durable;
    } catch {}
    log("error", "plan.revise_failed", {
      missionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return steps;
  }
}

/** Остались ли невыполненные шаги. Исчерпанный план — сигнал к ревизии:
 *  работа продолжается, а ориентира больше нет. */
export function planExhausted(steps: PlanStep[]): boolean {
  if (!steps.length) return false;
  return !steps.some((s) => s.status === "pending" || s.status === "doing");
}
