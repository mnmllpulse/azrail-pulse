import type { StepRecord } from "./execution-types";
import type { TaskResult } from "../types";
import { pendingLocalChecks, testsMissingAfterCodeEdit, type LocalCheck } from "./local-verify";

export interface LocalGateArgs {
  history: StepRecord[];
  missionId: string;
  iteration: number;
  nudges: { verify: number; test: number };
  run: (check: LocalCheck) => Promise<unknown>;
  note: (type: string, data: Record<string, unknown>) => Promise<void>;
}

export type LocalGateOutcome = { kind: "retry" } | { kind: "result"; value: TaskResult } | null;

/**
 * Ворота перед «готово» для работы на компьютере: напоминание про тесты после
 * правки кода и проверка фактом (чтение назад) для каждой мутации.
 * null — пропустить дальше; retry — вернуть агента в работу; result — закончить.
 */
export async function localGate(args: LocalGateArgs): Promise<LocalGateOutcome> {
  const { history, missionId, iteration, nudges } = args;
  if (nudges.test > 0 && testsMissingAfterCodeEdit(history)) {
    nudges.test--;
    history.push({ tool: "loop", input: {}, ok: false, result: "Ты правил код, но после последней правки не запускал проверку. Запусти тесты или сборку проекта командой из local_overview. Упали — исправь и запусти снова. Если запускать нечего или нельзя — так и скажи в итоге." });
    return { kind: "retry" };
  }
  const checks = pendingLocalChecks(history);
  if (!checks.length) return null;
  const problems: string[] = [];
  const unreachable: string[] = [];
  for (const check of checks) {
    try {
      const out = (await args.run(check)) as { status?: string; output?: string; error?: string };
      if (out?.status !== "done") unreachable.push(`${check.label}: ${out?.error ?? "агент не ответил"}`);
      else {
        const miss = check.test(out.output ?? "");
        if (miss) problems.push(miss);
      }
    } catch (err) {
      unreachable.push(`${check.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const bad = [...problems, ...unreachable];
  history.push({ tool: "verify", input: {}, ok: !bad.length, result: bad.length ? `Проверка фактом: ${bad.join("; ")}` : `Проверка фактом пройдена: ${checks.map((c) => c.label).join("; ")}` });
  await args.note(problems.length ? "local.verify_failed" : unreachable.length ? "local.unverified" : "local.verified", { reason: bad.join("; ") || `${checks.length} проверок`, iteration });
  if (problems.length && nudges.verify > 0) {
    nudges.verify--;
    history.push({ tool: "loop", input: {}, ok: false, result: `Результат не подтверждён: ${problems.join("; ")}. Исправь или объясни, что мешает. «Готово» без подтверждения не пиши.` });
    return { kind: "retry" };
  }
  const base = { agent: "execution-engine", data: { missionId, steps: history } };
  if (problems.length) {
    const reason = problems.join("; ");
    return { kind: "result", value: { ...base, status: "failed", summary: `Результат не подтверждён: ${reason}`, error: "local_verify_failed", quality: { status: "failed", reason, gates: [{ name: "local_verify", status: "failed", detail: reason }] } } as TaskResult };
  }
  if (unreachable.length) {
    const reason = unreachable.join("; ");
    return { kind: "result", value: { ...base, status: "done", summary: `Сделано, но не проверено: ${reason}`, quality: { status: "unverified", reason, gates: [{ name: "local_verify", status: "blocked", detail: reason }] } } as TaskResult };
  }
  return null;
}
