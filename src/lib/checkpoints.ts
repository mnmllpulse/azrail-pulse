import type { Env } from "../types";

export class UncertainToolError extends Error {
  constructor(cause: unknown) { super("Результат шага неопределён; повтор остановлен: " + (cause instanceof Error ? cause.message : String(cause))); }
}

export type MissionCheckpoint = {
  step: number;
  tool: string;
  input_json: string;
  result_json: string | null;
  status: string;
  /** Present on rows loaded from D1 after migration 012. */
  receipt_attempt_id?: string | null;
  receipt_tool?: string | null;
  receipt_input_json?: string | null;
  receipt_result_json?: string | null;
  receipt_status?: string | null;
};

export type ReplayableCheckpoint = MissionCheckpoint & {
  input: Record<string, unknown>;
  result: unknown;
};

type DurablePair = {
  checkpoint_status: string | null;
  checkpoint_tool: string | null;
  checkpoint_input_json: string | null;
  checkpoint_result_json: string | null;
  receipt_attempt_id: string | null;
  receipt_status: string | null;
  receipt_tool: string | null;
  receipt_input_json: string | null;
  receipt_result_json: string | null;
};

function sameNullableJson(a: string | null, b: string | null): boolean {
  return a === b;
}

function receiptFieldsPresent(point: MissionCheckpoint): boolean {
  return Object.prototype.hasOwnProperty.call(point, "receipt_attempt_id");
}

function validateReceiptParity(point: MissionCheckpoint): void {
  // Hand-built checkpoint objects used by pure validator callers from older
  // releases do not carry receipt fields. Rows loaded from D1 always do, so a
  // missing receipt in real recovery state fails closed.
  if (!receiptFieldsPresent(point)) return;
  if (!point.receipt_attempt_id) throw new Error(`Checkpoint шага ${point.step} не имеет durable tool receipt.`);
  if (point.receipt_tool !== point.tool || point.receipt_input_json !== point.input_json ||
      point.receipt_status !== point.status || !sameNullableJson(point.receipt_result_json ?? null, point.result_json)) {
    throw new Error(`Checkpoint шага ${point.step} расходится с durable tool receipt.`);
  }
}

/**
 * Validate durable checkpoint state before replay/resume.
 *
 * Recovery is an integrity boundary: a malformed row must never be treated as
 * evidence that a side effect completed. RC12 additionally requires an
 * independent receipt, so a single damaged row cannot prove an external effect.
 */
export function validateReplayableCheckpoints(
  points: MissionCheckpoint[],
  maxIterations?: number,
): ReplayableCheckpoint[] {
  let previousStep = -1;
  return points.map((point) => {
    if (!Number.isSafeInteger(point.step) || point.step < 0 || point.step <= previousStep) {
      throw new Error(`Повреждён порядок checkpoint шага ${String(point.step)}.`);
    }
    if (maxIterations !== undefined && point.step >= maxIterations) {
      throw new Error(`Checkpoint шага ${point.step} выходит за предел миссии.`);
    }
    previousStep = point.step;

    if (typeof point.tool !== "string" || !point.tool.trim() || point.tool.length > 128) {
      throw new Error(`Checkpoint шага ${point.step} содержит некорректный инструмент.`);
    }
    if (!["completed", "failed"].includes(point.status)) {
      throw new Error(`Checkpoint шага ${point.step} имеет неопределённый статус ${point.status}.`);
    }
    validateReceiptParity(point);

    let input: Record<string, unknown>;
    try {
      const parsed = JSON.parse(point.input_json) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("input must be an object");
      input = parsed as Record<string, unknown>;
    } catch {
      throw new Error(`Checkpoint шага ${point.step} содержит повреждённый input.`);
    }

    if (point.result_json === null) {
      throw new Error(`Checkpoint шага ${point.step} не содержит durable result.`);
    }
    let result: unknown;
    try {
      result = JSON.parse(point.result_json);
    } catch {
      throw new Error(`Checkpoint шага ${point.step} содержит повреждённый result.`);
    }

    return { ...point, input, result };
  });
}

/**
 * Extract approval-gated connector calls from a validated replay. A mission in
 * waiting_approval without at least one durable approval gate is inconsistent
 * state and must not be resumed automatically.
 */
export function requiredApprovalCallIds(points: ReplayableCheckpoint[]): string[] {
  const ids = new Set<string>();
  for (const point of points) {
    if (point.tool !== "connector_call" || point.status !== "completed") continue;
    if (!point.result || typeof point.result !== "object" || Array.isArray(point.result)) {
      throw new Error(`Checkpoint внешнего действия шага ${point.step} повреждён.`);
    }
    const result = point.result as { id?: unknown; approvalRequired?: unknown };
    if (typeof result.approvalRequired !== "boolean") {
      throw new Error(`Checkpoint внешнего действия шага ${point.step} не содержит признака approval.`);
    }
    if (!result.approvalRequired) continue;
    if (typeof result.id !== "string" || !result.id) {
      throw new Error(`Checkpoint внешнего действия шага ${point.step} не содержит callId.`);
    }
    ids.add(result.id);
  }
  if (!ids.size) throw new Error("Durable checkpoint подтверждения отсутствует.");
  return [...ids];
}

async function readPair(env: Env, mission: string, step: number): Promise<DurablePair | null> {
  return env.AZRAIL_D1.prepare(`SELECT
      c.status AS checkpoint_status,
      c.tool AS checkpoint_tool,
      c.input_json AS checkpoint_input_json,
      c.result_json AS checkpoint_result_json,
      r.attempt_id AS receipt_attempt_id,
      r.status AS receipt_status,
      r.tool AS receipt_tool,
      r.input_json AS receipt_input_json,
      r.result_json AS receipt_result_json
    FROM mission_checkpoints c
    LEFT JOIN mission_tool_receipts r ON r.mission_id=c.mission_id AND r.step=c.step
    WHERE c.mission_id=? AND c.step=?`)
    .bind(mission, step).first<DurablePair>();
}

function pairMatches(
  pair: DurablePair | null,
  attemptId: string,
  tool: string,
  inputJson: string,
  status: string,
  resultJson: string | null,
): boolean {
  return !!pair &&
    pair.checkpoint_status === status && pair.receipt_status === status &&
    pair.checkpoint_tool === tool && pair.receipt_tool === tool &&
    pair.checkpoint_input_json === inputJson && pair.receipt_input_json === inputJson &&
    pair.receipt_attempt_id === attemptId &&
    pair.checkpoint_result_json === resultJson && pair.receipt_result_json === resultJson;
}

async function setPairStatus(
  env: Env,
  mission: string,
  step: number,
  status: "completed" | "failed" | "uncertain",
  resultJson: string,
): Promise<void> {
  const at = Date.now();
  await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare("UPDATE mission_checkpoints SET status=?,result_json=?,updated_at=? WHERE mission_id=? AND step=? AND status='running'")
      .bind(status, resultJson, at, mission, step),
    env.AZRAIL_D1.prepare("UPDATE mission_tool_receipts SET status=?,result_json=?,updated_at=? WHERE mission_id=? AND step=? AND status='running'")
      .bind(status, resultJson, at, mission, step),
  ]);
}

/**
 * Execute one tool step behind a two-row durable receipt.
 *
 * `attemptId` can be supplied by the caller so event/tool-call telemetry and
 * the recovery receipt share the same identity. Existing callers may omit it.
 * A lost D1 acknowledgement after a successful effect is never allowed to
 * downgrade proven `completed` state to `uncertain`/`failed`.
 */
export async function checkpointTool<T>(
  env: Env,
  mission: string,
  step: number,
  tool: string,
  input: unknown,
  work: () => Promise<T>,
  mayHaveEffects = true,
  attemptId = crypto.randomUUID(),
): Promise<T> {
  if (!attemptId || attemptId.length > 256) throw new Error("Некорректный attemptId шага.");
  const inputJson = JSON.stringify(input) ?? "null";
  const old = await readPair(env, mission, step);
  if (old) throw new Error("Шаг уже записан; требуется восстановление контекста миссии.");

  const startedAt = Date.now();
  try {
    await env.AZRAIL_D1.batch([
      env.AZRAIL_D1.prepare("INSERT INTO mission_checkpoints(mission_id,step,tool,input_json,status,updated_at) VALUES(?,?,?,?,'running',?)")
        .bind(mission, step, tool, inputJson, startedAt),
      env.AZRAIL_D1.prepare("INSERT INTO mission_tool_receipts(mission_id,step,attempt_id,tool,input_json,status,started_at,updated_at) VALUES(?,?,?,?,?,'running',?,?)")
        .bind(mission, step, attemptId, tool, inputJson, startedAt, startedAt),
    ]);
  } catch (error) {
    // An acknowledgement may be lost after both INSERTs committed. Never start
    // the external effect when durable reservation state is ambiguous.
    try {
      const pair = await readPair(env, mission, step);
      if (pairMatches(pair, attemptId, tool, inputJson, "running", null)) {
        throw new UncertainToolError("Durable reservation committed, but acknowledgement was lost; work was not started.");
      }
    } catch (verifyError) {
      if (verifyError instanceof UncertainToolError) throw verifyError;
      throw new UncertainToolError(verifyError);
    }
    throw error;
  }

  let value: T;
  try {
    value = await work();
  } catch (error) {
    const status = mayHaveEffects ? "uncertain" as const : "failed" as const;
    const errorJson = JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
    try {
      await setPairStatus(env, mission, step, status, errorJson);
      const pair = await readPair(env, mission, step);
      if (!pairMatches(pair, attemptId, tool, inputJson, status, errorJson)) {
        // If a concurrently observed durable completion exists, do not erase it.
        if (pair?.checkpoint_status === "completed" && pair.receipt_status === "completed") {
          throw new UncertainToolError("Конфликт durable результата шага; автоматический повтор остановлен.");
        }
        throw new Error("Не удалось доказать durable статус ошибочного шага.");
      }
    } catch (persistError) {
      if (mayHaveEffects) throw new UncertainToolError(persistError);
      throw persistError;
    }
    if (mayHaveEffects) throw new UncertainToolError(error);
    throw error;
  }

  const resultJson = JSON.stringify(value) ?? "null";
  let finalizeError: unknown = null;
  try {
    await setPairStatus(env, mission, step, "completed", resultJson);
  } catch (error) {
    finalizeError = error;
  }

  // RC13 always re-reads the durable proof, not only when D1 threw. A cron
  // reconciler or another recovery path can move a stale `running` receipt to
  // `uncertain` between the tool effect and finalization; UPDATE ... WHERE
  // status='running' would then report success at the protocol level but change
  // zero rows. Returning success without verifying would lie about the durable
  // state and allow the mission to advance past an unproven effect.
  let pair: DurablePair | null;
  try {
    pair = await readPair(env, mission, step);
  } catch (verifyError) {
    throw new UncertainToolError(finalizeError ?? verifyError);
  }
  if (pairMatches(pair, attemptId, tool, inputJson, "completed", resultJson)) return value;

  // Updating the D1 receipt is itself idempotent and has no external effect.
  // If both rows are still running, one retry can close the record without
  // re-running the tool. A second ambiguous response is verified below.
  if (pairMatches(pair, attemptId, tool, inputJson, "running", null)) {
    try { await setPairStatus(env, mission, step, "completed", resultJson); } catch (error) { finalizeError ??= error; }
    try { pair = await readPair(env, mission, step); } catch (verifyError) { throw new UncertainToolError(verifyError); }
    if (pairMatches(pair, attemptId, tool, inputJson, "completed", resultJson)) return value;
  }

  // Do not overwrite a completed row with uncertain. Conditional UPDATEs in
  // setPairStatus only touch `running`, so this preserves any proof that may
  // have become visible between reads. A stale-receipt quarantine is likewise
  // preserved and surfaced to the mission as uncertain instead of false success.
  if (mayHaveEffects) {
    try { await setPairStatus(env, mission, step, "uncertain", JSON.stringify({ error: "completion acknowledgement unresolved" })); } catch { /* fail closed */ }
    throw new UncertainToolError(finalizeError ?? "Durable completion proof is missing or was quarantined.");
  }
  throw finalizeError instanceof Error ? finalizeError : new Error("Не удалось доказать durable завершение шага.");
}

/**
 * Convert abandoned `running` tool receipts into explicit `uncertain` state.
 *
 * A Worker can disappear after reserving a step and before persisting its
 * outcome. Retrying such a step is unsafe because the external effect may have
 * happened. RC13 therefore quarantines only old, still-parity-matched pairs and
 * never claims they failed cleanly. The transition is conditional on BOTH rows
 * still being running, so a late successful finalizer wins if it committed first.
 */
export async function quarantineStaleRunningToolReceipts(
  env: Env,
  now = Date.now(),
  staleMs = 60 * 60_000,
  limit = 100,
): Promise<{ quarantined: number; attempts: string[] }> {
  const bounded = Math.max(1, Math.min(200, Math.floor(limit)));
  const cutoff = now - Math.max(10 * 60_000, staleMs);
  const {results} = await env.AZRAIL_D1.prepare(`SELECT
      r.mission_id,r.step,r.attempt_id
    FROM mission_tool_receipts r
    JOIN mission_checkpoints c ON c.mission_id=r.mission_id AND c.step=r.step
    WHERE r.status='running' AND c.status='running'
      AND r.updated_at<? AND c.updated_at<?
      AND r.tool=c.tool AND r.input_json=c.input_json
    ORDER BY r.updated_at ASC LIMIT ?`)
    .bind(cutoff,cutoff,bounded).all<{mission_id:string;step:number;attempt_id:string}>();

  const attempts:string[]=[];
  const reason=JSON.stringify({error:"stale_running_receipt_quarantined",reconcileRequired:true});
  for(const row of results ?? []) {
    const at=Date.now();
    const [checkpoint,receipt]=await env.AZRAIL_D1.batch([
      env.AZRAIL_D1.prepare(`UPDATE mission_checkpoints SET status='uncertain',result_json=?,updated_at=?
        WHERE mission_id=? AND step=? AND status='running'`)
        .bind(reason,at,row.mission_id,row.step),
      env.AZRAIL_D1.prepare(`UPDATE mission_tool_receipts SET status='uncertain',result_json=?,updated_at=?
        WHERE mission_id=? AND step=? AND attempt_id=? AND status='running'`)
        .bind(reason,at,row.mission_id,row.step,row.attempt_id),
    ]);
    const c=Number(checkpoint.meta?.changes ?? 0),r=Number(receipt.meta?.changes ?? 0);
    if(c===1 && r===1) attempts.push(row.attempt_id);
    else if(c!==r) {
      // This should be impossible for a parity-matched selection unless a
      // legacy/out-of-band writer touched one table. Leave an explicit signal;
      // recovery validation will fail closed on the mismatch.
      throw new Error(`Tool receipt parity changed while quarantining ${row.mission_id}:${row.step}.`);
    }
  }
  return {quarantined:attempts.length,attempts};
}

export async function loadCheckpoints(env: Env, mission: string): Promise<MissionCheckpoint[]> {
  return (await env.AZRAIL_D1.prepare(`SELECT
      c.step,c.tool,c.input_json,c.result_json,c.status,
      r.attempt_id AS receipt_attempt_id,
      r.tool AS receipt_tool,
      r.input_json AS receipt_input_json,
      r.result_json AS receipt_result_json,
      r.status AS receipt_status
    FROM mission_checkpoints c
    LEFT JOIN mission_tool_receipts r ON r.mission_id=c.mission_id AND r.step=c.step
    WHERE c.mission_id=? ORDER BY c.step`).bind(mission).all<MissionCheckpoint>()).results;
}
