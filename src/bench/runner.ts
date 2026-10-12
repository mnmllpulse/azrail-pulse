// AZRAIL — прогон набора задач.
//
// Что делает по одной задаче:
//   1. заводит временный проект и кладёт в него файлы кейса;
//   2. заливает их в контейнер и гоняет тесты — ЗАМЕР ДО;
//   3. запускает обычную миссию с текстом задачи;
//   4. снова заливает и гоняет тесты — ЗАМЕР ПОСЛЕ;
//   5. пишет исход.
//
// Шаг 2 обязателен и он же чаще всего отбрасывает кейс: задача, где тесты
// зелены до начала работы, даёт успех при любом поведении агента, включая
// полное бездействие. Без этой проверки набор тихо завышает оценку — и
// заметить это по итоговому числу невозможно.
//
// Зависимости передаются снаружи (runMission, execInSandbox, syncWorkspace),
// а не импортируются здесь. Причина простая: иначе раннер нельзя проверить
// ничем, кроме реального контейнера и настоящих вызовов модели, то есть
// проверять его не будут никогда. Измеритель, которому нельзя доверять,
// хуже отсутствующего.

import type { Env, TaskResult } from "../types";
import { writeFile } from "../lib/workspace";
import { parseTestOutput } from "../core/sandbox";
import { log } from "../lib/resilience";
import type { BenchCase } from "./cases";
import { validateCases } from "./cases";
import { buildReport, type CaseOutcome, type Report } from "./report";

export interface BenchDeps {
  /** Запуск миссии. В бою — ExecutionEngine, в тестах — заглушка. */
  runMission: (args: { projectId: string; goal: string; maxIterations: number }) => Promise<TaskResult>;
  /** Команда в песочнице проекта. */
  execInSandbox: (projectId: string, command: string) => Promise<{ exitCode: number; output: string }>;
  /** Заливка рабочей области в контейнер. */
  syncWorkspace: (projectId: string) => Promise<unknown>;
  /** Подготовка кейса kind:"git". Необязательна: без неё такие кейсы
   *  честно помечаются непрогнанными, а не выдают выдуманный исход. */
  prepareGit?: (projectId: string, repo: string, commit: string, setup?: string) => Promise<void>;
  now?: () => number;
}

export interface BenchRunOptions {
  /** Ограничить прогон этими id — для быстрой проверки одной задачи. */
  only?: string[];
  /** Префикс временных проектов. Разный у каждого прогона: иначе второй
   *  прогон видел бы файлы первого и мерил бы не то. */
  runId: string;
}

/** Куда складывать файлы кейса внутри контейнера — тот же корень, что и
 *  у синхронизации рабочей области. */
const WORKDIR = "/workspace";

async function measure(
  deps: BenchDeps,
  projectId: string,
  verify: string,
): Promise<{ ok: boolean; passed: number; failed: number } | null> {
  try {
    await deps.syncWorkspace(projectId);
    const res = await deps.execInSandbox(projectId, `cd ${WORKDIR} && ${verify}`);
    const parsed = parseTestOutput(res.output, res.exitCode);

    /* Код возврата — последнее слово.
     *
     * Разбор вывода нужен ради чисел (сколько прошло, сколько упало), но
     * решает не он: прогонщик может напечатать что угодно ободряющее и
     * выйти с ненулевым кодом. Ровно этим и обманывается модель, читающая
     * вывод глазами, — измеритель не должен обманываться так же. */
    const ok = res.exitCode === 0 && parsed.failed === 0;
    return { ok, passed: parsed.passed, failed: parsed.failed };
  } catch (err) {
    log("warn", "bench.measure_failed", {
      projectId,
      error: err instanceof Error ? err.message : String(err),
    });
    // null, а не {ok:false}: «не смогли прогнать» и «тесты упали» — разные
    // вещи, и слить их значит записать сбой инфраструктуры в провалы агента.
    return null;
  }
}

export async function runBenchCase(
  env: Env,
  deps: BenchDeps,
  testCase: BenchCase,
  runId: string,
): Promise<CaseOutcome> {
  const now = deps.now ?? Date.now;
  const started = now();
  const projectId = `bench-${runId}-${testCase.id}`;
  const base: CaseOutcome = {
    caseId: testCase.id,
    difficulty: testCase.difficulty,
    before: null,
    after: null,
    missionStatus: "error",
    durationMs: 0,
  };

  try {
    if (testCase.kind === "inline") {
      for (const f of testCase.files) {
        await writeFile(env, projectId, f.path, f.content);
      }
    } else {
      if (!deps.prepareGit) {
        return { ...base, durationMs: now() - started, error: "кейсы на репозиториях не настроены" };
      }
      await deps.prepareGit(projectId, testCase.repo, testCase.commit, testCase.setup);
    }

    const before = await measure(deps, projectId, testCase.verify);

    /* Негодный кейс не запускает миссию.
     *
     * Тесты зелены до начала работы — измерять нечего, а прогон стоил бы
     * полного цикла вызовов модели ради заведомо бессмысленного числа. */
    if (before?.ok) {
      return {
        ...base,
        before,
        after: before,
        missionStatus: "error",
        durationMs: now() - started,
        error: "тесты зелены ДО работы — кейс ничего не измеряет",
      };
    }

    const result = await deps.runMission({
      projectId,
      goal: testCase.task,
      maxIterations: testCase.maxIterations,
    });

    const after = await measure(deps, projectId, testCase.verify);

    return {
      ...base,
      before,
      after,
      missionStatus: result.status,
      missionId: (result.data as { missionId?: string } | undefined)?.missionId,
      durationMs: now() - started,
      /* Расход миссии — ровно как его сообщила сама миссия.
       *
       * Отсутствие остаётся null и НЕ становится нулём: ноль означал бы
       * «решено без единого вызова», и задача попала бы в статистику как
       * бесплатная, занизив цену решения по всему прогону. */
      modelCalls:
        (result.data as { usage?: { calls?: number } } | undefined)?.usage?.calls ?? null,
    };
  } catch (err) {
    return {
      ...base,
      durationMs: now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface BenchRunResult {
  runId: string;
  report: Report;
  outcomes: CaseOutcome[];
  /** Проблемы формата набора. Непустой список означает, что часть числа
   *  получена по кривым кейсам, и это должно быть видно, а не скрыто. */
  problems: string[];
}

/**
 * Прогон набора.
 *
 * ПОСЛЕДОВАТЕЛЬНО, а не параллельно, и это осознанно: каждая задача — это
 * полная миссия с вызовами моделей и записями. Пять штук параллельно
 * упираются в лимит расхода, и половина прогона возвращает 429 — то есть
 * измеритель начинает мерить лимит вместо качества.
 */
export async function runBench(
  env: Env,
  deps: BenchDeps,
  cases: BenchCase[],
  opts: BenchRunOptions,
): Promise<BenchRunResult> {
  const problems = validateCases(cases);
  const selected = opts.only?.length ? cases.filter((c) => opts.only!.includes(c.id)) : cases;

  const outcomes: CaseOutcome[] = [];
  for (const c of selected) {
    const outcome = await runBenchCase(env, deps, c, opts.runId);
    outcomes.push(outcome);
    log("info", "bench.case_done", {
      runId: opts.runId,
      caseId: c.id,
      missionStatus: outcome.missionStatus,
      before: outcome.before?.ok ?? null,
      after: outcome.after?.ok ?? null,
    });
  }

  return { runId: opts.runId, report: buildReport(outcomes), outcomes, problems };
}
