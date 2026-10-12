// AZRAIL — хранение прогонов измерителя.
//
// Одно число само по себе бесполезно: «61%» не значит ничего, пока не с чем
// сравнить. Смысл появляется в сравнении с предыдущим прогоном, поэтому
// прогоны обязаны переживать сессию — отсюда таблицы, а не вывод в лог.
//
// Хранится ИСХОД КАЖДОЙ ЗАДАЧИ, а не только итог. Суммарная оценка может
// вырасти при том, что две ранее решавшиеся задачи перестали решаться:
// по одному числу такое изменение выглядит улучшением, и увидеть его можно
// только по именам задач.

import type { Env } from "../types";
import { log } from "../lib/resilience";
import type { CaseOutcome, Report } from "./report";
import { verdictFor } from "./report";

export async function saveRun(
  env: Env,
  runId: string,
  report: Report,
  outcomes: CaseOutcome[],
  meta: { note?: string; startedAt: string },
): Promise<void> {
  await env.AZRAIL_D1.prepare(
    `INSERT INTO bench_runs (id, started_at, finished_at, score, measured, solved, failed, regressed, invalid, unmeasured, median_ms, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      runId,
      meta.startedAt,
      new Date().toISOString(),
      report.score,
      report.measured,
      report.solved,
      report.failed,
      report.regressed,
      report.invalid,
      report.unmeasured,
      report.medianDurationMs,
      meta.note ?? null,
    )
    .run();

  for (const o of outcomes) {
    // По одной строке, а не пачкой: D1 batch на два десятка строк экономит
    // доли секунды и добавляет путь, где одна кривая строка роняет весь
    // прогон целиком. Результат измерения дороже этой экономии.
    try {
      await env.AZRAIL_D1.prepare(
        `INSERT INTO bench_results (id, run_id, case_id, difficulty, verdict, before_ok, after_ok, before_passed, after_passed, mission_status, mission_id, duration_ms, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          runId,
          o.caseId,
          o.difficulty,
          verdictFor(o),
          o.before ? (o.before.ok ? 1 : 0) : null,
          o.after ? (o.after.ok ? 1 : 0) : null,
          o.before?.passed ?? null,
          o.after?.passed ?? null,
          o.missionStatus,
          o.missionId ?? null,
          o.durationMs,
          o.error ?? null,
        )
        .run();
    } catch (err) {
      log("error", "bench.result_write_failed", {
        runId,
        caseId: o.caseId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** Последние прогоны — для графика и для сравнения с предыдущим. */
export async function listRuns(env: Env, limit = 20) {
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT * FROM bench_runs ORDER BY started_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all();
  return results ?? [];
}

export async function loadOutcomes(env: Env, runId: string) {
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT case_id, difficulty, verdict, before_ok, after_ok, before_passed, after_passed, mission_status, duration_ms, error
       FROM bench_results WHERE run_id = ? ORDER BY case_id`,
  )
    .bind(runId)
    .all();
  return results ?? [];
}
