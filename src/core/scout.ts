// AZRAIL — параллельная разведка.
//
// ЗАЧЕМ. Разбор проекта съедает контекст главного цикла. Чтобы понять, где
// лежит нужное, модель делает list_files, потом read_file, потом ещё
// read_file — и каждый ответ ложится в историю целиком. К моменту, когда
// пора принимать решение, история забита содержимым файлов, половина из
// которых оказалась ни при чём, а сама задача — далеко в начале запроса,
// там, где модель помнит хуже всего.
//
// Разведчики работают ПАРАЛЛЕЛЬНО и КАЖДЫЙ СО СВОИМ контекстом. В главный
// цикл возвращается не содержимое файлов, а несколько строк вывода на
// каждый вопрос. Читают все, пишет по-прежнему один — главный цикл.
//
// ЧЕСТНО О ЦЕНЕ. Разведка — это дополнительные вызовы модели: один на
// составление вопросов плюс до двух на каждого разведчика. Она окупается
// на задачах, где надо сперва разобраться, и является чистой тратой там,
// где всё очевидно. Поэтому включается не всегда — см. shouldScout.

import { log } from "../lib/resilience";

/**
 * Инструменты, доступные разведчику. Список — БЕЛЫЙ, и это принципиально.
 *
 * Разведчик не должен менять проект: параллельно работающие писатели
 * затирают правки друг друга, а отследить, кто что сделал, уже нельзя.
 * Запрет держится этим списком, а не просьбой в промпте: промпт — это
 * пожелание, а список — условие, которое нечем обойти.
 */
export const SCOUT_TOOLS = ["read_file", "list_files", "search_files"] as const;
export type ScoutTool = (typeof SCOUT_TOOLS)[number];

export function isScoutTool(name: string): name is ScoutTool {
  return (SCOUT_TOOLS as readonly string[]).includes(name);
}

/** Сколько вопросов задаётся разом. Больше трёх — это уже не разведка, а
 *  вторая миссия рядом с первой, и стоит она столько же. */
export const MAX_SCOUTS = 3;

/** Шагов у одного разведчика. Два: посмотреть и уточнить. Разведчик,
 *  которому нужно больше, решает не свою задачу. */
export const MAX_SCOUT_STEPS = 2;

/** Потолок на вывод одного разведчика. Смысл всей затеи — вернуть в
 *  главный контекст ВЫВОД, а не содержимое файлов; без потолка разведчик
 *  перескажет файл целиком и сэкономит ровно ничего. */
export const FINDING_LIMIT = 700;

export interface ScoutFinding {
  question: string;
  /** Что выяснено. Пусто — значит не выяснено, и так и написано. */
  finding: string;
  ok: boolean;
  steps: number;
  error?: string;
}

export interface ScoutDeps {
  /** Один вопрос к модели. Возвращает текст ответа. */
  ask: (prompt: string, system: string) => Promise<string>;
  /** Вызов инструмента. Реализация обязана сама отклонять чужие имена. */
  runTool: (tool: ScoutTool, input: Record<string, unknown>) => Promise<unknown>;
}

const SCOUT_SYSTEM = `Ты — разведчик. Твоя работа — выяснить ОДИН факт о проекте и коротко доложить.
Ты НЕ МЕНЯЕШЬ файлы. Доступны только чтение и поиск.

Отвечай строго JSON, без markdown-обёрток.
Чтобы посмотреть: {"tool":"read_file","input":{"path":"..."}}
Чтобы доложить:   {"finding":"что выяснено, 2-4 предложения"}

Докладывай факты с путями файлов и именами, а не пересказ впечатлений.
Если выяснить не удалось — доложи именно это, не выдумывай.`;

interface ScoutDecision {
  tool?: string;
  input?: Record<string, unknown>;
  finding?: string;
}

function parseScout(text: string): ScoutDecision | null {
  const cleaned = (text ?? "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const tryParse = (s: string): ScoutDecision | null => {
    try {
      const v = JSON.parse(s) as ScoutDecision;
      if (!v || typeof v !== "object") return null;
      if (!v.tool && typeof v.finding !== "string") return null;
      return v;
    } catch {
      return null;
    }
  };
  const direct = tryParse(cleaned);
  if (direct) return direct;

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start !== -1 && end > start ? tryParse(cleaned.slice(start, end + 1)) : null;
}

/**
 * Один разведчик: короткий цикл вокруг одного вопроса.
 *
 * Своя история, свой контекст. Ничего из прочитанного здесь в главный
 * цикл не попадает — только итоговые несколько строк. В этом вся суть:
 * тысяча строк файла превращается в предложение «обработчик лежит в
 * src/routes/api.ts, функция handleTask».
 */
export async function runScout(
  deps: ScoutDeps,
  question: string,
  context: string,
): Promise<ScoutFinding> {
  const history: string[] = [];

  for (let step = 0; step < MAX_SCOUT_STEPS; step++) {
    let decision: ScoutDecision | null;
    try {
      const answer = await deps.ask(
        `ВОПРОС: ${question}\n\n${context}\n\n` +
          (history.length ? `УЖЕ ПОСМОТРЕЛ:\n${history.join("\n")}\n\n` : "") +
          `Шаг ${step + 1} из ${MAX_SCOUT_STEPS}. ` +
          (step === MAX_SCOUT_STEPS - 1 ? "Это последний шаг — доложи, что выяснил." : "Верни JSON."),
        SCOUT_SYSTEM,
      );
      decision = parseScout(answer);
    } catch (err) {
      // Упавший разведчик не должен ронять миссию: он вспомогательный.
      return {
        question,
        finding: "",
        ok: false,
        steps: step,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (!decision) {
      return { question, finding: "", ok: false, steps: step + 1, error: "неразбираемый ответ" };
    }

    if (typeof decision.finding === "string" && decision.finding.trim()) {
      return {
        question,
        finding: decision.finding.trim().slice(0, FINDING_LIMIT),
        ok: true,
        steps: step + 1,
      };
    }

    if (!decision.tool || !isScoutTool(decision.tool)) {
      // Разведчик попросил инструмент вне белого списка. Это не ошибка
      // модели, а попытка выйти за роль — и отвечать надо отказом, а не
      // молчанием: молчание она истолкует как «инструмента нет».
      history.push(`ОТКАЗАНО: ${decision.tool ?? "без инструмента"} — разведчик только читает.`);
      continue;
    }

    try {
      const result = await deps.runTool(decision.tool, decision.input ?? {});
      const text = typeof result === "string" ? result : JSON.stringify(result);
      // Обрезка ЗДЕСЬ, а не при докладе: длинный файл не должен раздувать
      // даже собственный контекст разведчика — ему хватит начала.
      history.push(`${decision.tool}: ${text.slice(0, 2000)}`);
    } catch (err) {
      history.push(`${decision.tool}: ошибка — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { question, finding: "", ok: false, steps: MAX_SCOUT_STEPS, error: "не уложился в шаги" };
}

/**
 * Запуск разведчиков параллельно.
 *
 * allSettled, а не all: один упавший разведчик не должен отменять выводы
 * остальных. Смысл параллельности в том, что вопросы независимы — значит
 * и их неудачи независимы тоже.
 */
export async function runScouts(
  deps: ScoutDeps,
  questions: string[],
  context: string,
): Promise<ScoutFinding[]> {
  const limited = questions.slice(0, MAX_SCOUTS);
  const settled = await Promise.allSettled(limited.map((q) => runScout(deps, q, context)));

  return settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { question: limited[i], finding: "", ok: false, steps: 0, error: String(r.reason) },
  );
}

/** Выводы текстом для главного запроса. */
export function renderFindings(findings: ScoutFinding[]): string {
  const useful = findings.filter((f) => f.ok && f.finding);
  if (!useful.length) return "";

  const lines = useful.map((f) => `• ${f.question}\n  ${f.finding}`);
  const failed = findings.length - useful.length;

  /* Неудачи НАЗЫВАЮТСЯ. Молча показать два вывода из трёх — значит дать
   * модели считать картину полной. Она построит решение на том, что
   * третий вопрос остался без ответа, даже не зная, что он задавался. */
  const tail = failed ? `\n(вопросов без ответа: ${failed} — считай их невыясненными)` : "";
  return `РАЗВЕДКА (выводы, добытые параллельно; содержимое файлов читай сам):\n${lines.join("\n")}${tail}`;
}

/**
 * Стоит ли вообще посылать разведку.
 *
 * Она окупается на задачах, где сперва надо разобраться, и является чистой
 * тратой там, где всё очевидно. Дешёвые признаки, без обращения к модели:
 *
 *  - в проекте меньше горстки файлов — разбирать нечего, карты хватит;
 *  - шагов у миссии мало — разведка съест те, что нужны на работу;
 *  - задача явно точечная («поменяй заголовок», «добавь строку») —
 *    тут разбираться не в чем.
 */
export function shouldScout(args: { fileCount: number; maxIterations: number; goal: string }): boolean {
  if (args.fileCount < 5) return false;
  if (args.maxIterations < 6) return false;
  if (args.goal.trim().length < 25) return false;
  return true;
}

/** Вопросы для разведки из цели и карты проекта. */
export async function planScoutQuestions(
  deps: Pick<ScoutDeps, "ask">,
  goal: string,
  repoMap: string,
): Promise<string[]> {
  try {
    const answer = await deps.ask(
      `ЗАДАЧА: ${goal}\n\n${repoMap}\n\n` +
        `Какие ${MAX_SCOUTS} вопроса о проекте нужно прояснить, прежде чем браться за задачу? ` +
        `Вопросы должны быть НЕЗАВИСИМЫ друг от друга: на них будут отвечать одновременно и порознь. ` +
        `Каждый отвечается чтением и поиском по файлам.\n` +
        `Ответь строго JSON-массивом строк.`,
      "Ты планируешь разведку кодовой базы. Отвечай только JSON-массивом строк.",
    );
    const cleaned = answer.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end <= start) return [];
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_SCOUTS);
  } catch (err) {
    log("warn", "scout.questions_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
