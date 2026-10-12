import type { Env } from "../types";
import { AccessError } from "./accounts";
import { emitEvent } from "./event-stream";
import { log } from "./resilience";
import { childTrace, linkTrace, loadTraceLink, traceLog } from "./observability-context";
import type {
  ApprovalActionType,
  ApprovalRequestInput,
  ApprovalRequestRecord,
  ApprovalStatus,
} from "./approval-types";

const MAX_SUMMARY = 800;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE = new Set<ApprovalStatus>(["pending", "approved", "executing"]);

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) out[key] = stable((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

export async function approvalDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(stable(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function assertToken(value: string, label: string, max = 512): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\u0000-\u001f]/.test(trimmed)) throw new AccessError(`${label} некорректен.`, 400);
  return trimmed;
}

async function receipt(env: Env, approvalId: string, eventType: string, actor: string, payloadDigest: string, detail?: unknown) {
  await env.AZRAIL_D1.prepare(
    `INSERT INTO approval_receipts(id,approval_id,event_type,actor,payload_digest,detail_json,created_at)
     VALUES(?,?,?,?,?,?,?)`,
  ).bind(
    crypto.randomUUID(),
    approvalId,
    eventType,
    actor.slice(0, 256),
    payloadDigest,
    detail === undefined ? null : JSON.stringify(detail).slice(0, 4000),
    Date.now(),
  ).run();
}

async function approvalEvent(env: Env, row: ApprovalRequestRecord, eventType: string, actor: string, detail?: unknown) {
  const trace = await loadTraceLink(env, "approval", row.id).catch(() => null);
  try {
    await emitEvent(env, {
      domain: "approval",
      type: `approval.${eventType}`,
      accountId: row.account_id ?? undefined,
      projectId: row.project_id ?? undefined,
      missionId: row.mission_id ?? undefined,
      approvalId: row.id,
      trace: trace ? childTrace(trace, { approvalId: row.id, missionId: row.mission_id ?? trace.missionId }) : undefined,
      subjectType: "approval",
      subjectId: row.id,
      actor,
      payload: { actionType: row.action_type, risk: row.risk, status: row.status, detail: detail ?? null },
    });
  } catch (error) {
    log("warn", "approval.event_stream_failed", { approvalId: row.id, eventType, ...traceLog(trace ?? undefined), error: error instanceof Error ? error.message : String(error) });
  }
}

export async function requestApproval(env: Env, input: ApprovalRequestInput): Promise<ApprovalRequestRecord> {
  const now = Date.now();
  const expiresAt = input.expiresAt ?? now + DEFAULT_TTL_MS;
  if (!/^[a-f0-9]{64}$/i.test(input.payloadDigest)) throw new AccessError("Approval payload digest некорректен.", 400);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt - now > MAX_TTL_MS) throw new AccessError("Срок approval некорректен.", 400);
  const scopeType = assertToken(input.scopeType, "scopeType", 80);
  const scopeId = assertToken(input.scopeId, "scopeId");
  const requestedBy = assertToken(input.requestedBy, "requestedBy", 256);
  const summary = input.summary.trim().slice(0, MAX_SUMMARY) || input.actionType;

  const existing = await env.AZRAIL_D1.prepare(
    `SELECT * FROM approval_requests
     WHERE action_type=? AND scope_type=? AND scope_id=? AND payload_digest=?
       AND status IN ('pending','approved','executing') AND expires_at>?
     ORDER BY requested_at DESC LIMIT 1`,
  ).bind(input.actionType, scopeType, scopeId, input.payloadDigest, now).first<ApprovalRequestRecord>();
  if (existing) {
    if (input.trace) await linkTrace(env, "approval", existing.id, childTrace(input.trace, { approvalId: existing.id, missionId: input.missionId ?? input.trace.missionId }));
    return existing;
  }

  const id = crypto.randomUUID();
  await env.AZRAIL_D1.prepare(
    `INSERT INTO approval_requests(
      id,mission_id,account_id,project_id,action_type,risk,scope_type,scope_id,payload_digest,summary,status,
      requested_by,requested_at,expires_at,external_ref
     ) VALUES(?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,?)`,
  ).bind(
    id,
    input.missionId ?? null,
    input.accountId ?? null,
    input.projectId ?? null,
    input.actionType,
    input.risk,
    scopeType,
    scopeId,
    input.payloadDigest,
    summary,
    requestedBy,
    now,
    expiresAt,
    input.externalRef ?? null,
  ).run();
  if (input.trace) await linkTrace(env, "approval", id, childTrace(input.trace, { approvalId: id, missionId: input.missionId ?? input.trace.missionId }));
  await receipt(env, id, "requested", requestedBy, input.payloadDigest, { actionType: input.actionType, scopeType, scopeId });
  const created = await getApproval(env, id);
  if (!created) throw new Error("Approval request was not persisted.");
  await approvalEvent(env, created, "requested", requestedBy, { scopeType, scopeId });
  return created;
}

export async function getApproval(env: Env, id: string): Promise<ApprovalRequestRecord | null> {
  return env.AZRAIL_D1.prepare("SELECT * FROM approval_requests WHERE id=?").bind(id).first<ApprovalRequestRecord>();
}


export async function findApprovalByScope(
  env: Env,
  actionType: ApprovalActionType,
  scopeType: string,
  scopeId: string,
): Promise<ApprovalRequestRecord | null> {
  return env.AZRAIL_D1.prepare(
    `SELECT * FROM approval_requests WHERE action_type=? AND scope_type=? AND scope_id=? ORDER BY requested_at DESC LIMIT 1`,
  ).bind(actionType, scopeType, scopeId).first<ApprovalRequestRecord>();
}

export async function listApprovals(
  env: Env,
  options: { accountId?: string; projectId?: string; missionId?: string; status?: ApprovalStatus; limit?: number } = {},
): Promise<ApprovalRequestRecord[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  if (options.accountId) { where.push("account_id=?"); values.push(options.accountId); }
  if (options.projectId) { where.push("project_id=?"); values.push(options.projectId); }
  if (options.missionId) { where.push("mission_id=?"); values.push(options.missionId); }
  if (options.status) { where.push("status=?"); values.push(options.status); }
  const limit = Math.max(1, Math.min(options.limit ?? 100, 200));
  const sql = `SELECT * FROM approval_requests${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY requested_at DESC LIMIT ${limit}`;
  const rows = await env.AZRAIL_D1.prepare(sql).bind(...values).all<ApprovalRequestRecord>();
  return rows.results ?? [];
}

export async function decideApproval(
  env: Env,
  input: { id: string; actor: string; decision: "approved" | "rejected"; reason?: string; expectedDigest?: string },
): Promise<ApprovalRequestRecord> {
  const actor = assertToken(input.actor, "actor", 256);
  const current = await getApproval(env, input.id);
  if (!current) throw new AccessError("Approval не найден.", 404);
  if (input.expectedDigest && current.payload_digest !== input.expectedDigest) throw new AccessError("Approval больше не соответствует точным параметрам операции.", 409);
  if (current.expires_at <= Date.now()) {
    if (ACTIVE.has(current.status)) {
      await env.AZRAIL_D1.prepare("UPDATE approval_requests SET status='expired',decided_at=?,decided_by=? WHERE id=? AND status IN ('pending','approved')")
        .bind(Date.now(), "system:expiry", current.id).run();
      await receipt(env, current.id, "expired", "system:expiry", current.payload_digest);
      const expired = await getApproval(env, current.id);
      if (expired) await approvalEvent(env, expired, "expired", "system:expiry");
    }
    throw new AccessError("Срок approval истёк.", 409);
  }
  if (current.status === input.decision) return current;
  if (current.status !== "pending") throw new AccessError(`Approval уже имеет статус ${current.status}.`, 409);
  const now = Date.now();
  const changed = await env.AZRAIL_D1.prepare(
    `UPDATE approval_requests SET status=?,decided_by=?,decision_reason=?,decided_at=?
     WHERE id=? AND status='pending' AND payload_digest=? AND expires_at>? RETURNING id`,
  ).bind(input.decision, actor, input.reason?.slice(0, 800) ?? null, now, current.id, current.payload_digest, now).first<{ id: string }>();
  if (!changed) throw new AccessError("Approval изменился во время решения. Обновите список.", 409);
  await receipt(env, current.id, input.decision, actor, current.payload_digest, { reason: input.reason?.slice(0, 800) ?? null });
  const decided = (await getApproval(env, current.id))!;
  await approvalEvent(env, decided, input.decision, actor, { reason: input.reason?.slice(0, 800) ?? null });
  return decided;
}

export async function claimApproval(
  env: Env,
  input: { id: string; actionType: ApprovalActionType; scopeType: string; scopeId: string; payloadDigest: string; actor: string },
): Promise<ApprovalRequestRecord> {
  const row = await getApproval(env, input.id);
  if (!row) throw new AccessError("Approval не найден.", 404);
  if (row.action_type !== input.actionType || row.scope_type !== input.scopeType || row.scope_id !== input.scopeId || row.payload_digest !== input.payloadDigest) {
    throw new AccessError("Approval не соответствует точным параметрам операции.", 409);
  }
  if (row.expires_at <= Date.now()) throw new AccessError("Срок approval истёк.", 409);
  if (row.status !== "approved") throw new AccessError(`Approval не готов к исполнению: ${row.status}.`, 409);
  const changed = await env.AZRAIL_D1.prepare(
    "UPDATE approval_requests SET status='executing' WHERE id=? AND status='approved' AND payload_digest=? AND expires_at>? RETURNING id",
  ).bind(row.id, row.payload_digest, Date.now()).first<{ id: string }>();
  if (!changed) throw new AccessError("Approval уже использован или изменился.", 409);
  await receipt(env, row.id, "execution_claimed", input.actor, row.payload_digest);
  const claimed = (await getApproval(env, row.id))!;
  await approvalEvent(env, claimed, "execution_claimed", input.actor);
  return claimed;
}

export async function completeApproval(
  env: Env,
  input: { id: string; actor: string; outcome: "executed" | "failed" | "uncertain"; detail?: unknown },
): Promise<void> {
  const row = await getApproval(env, input.id);
  if (!row) throw new AccessError("Approval не найден.", 404);
  if (row.status !== "executing") throw new AccessError(`Approval execution status некорректен: ${row.status}.`, 409);
  const now = Date.now();
  const changed = await env.AZRAIL_D1.prepare(
    "UPDATE approval_requests SET status=?,executed_at=? WHERE id=? AND status='executing' RETURNING id",
  ).bind(input.outcome, now, row.id).first<{ id: string }>();
  if (!changed) throw new AccessError("Approval execution уже завершён.", 409);
  const event = input.outcome === "executed" ? "executed" : input.outcome === "uncertain" ? "execution_uncertain" : "execution_failed";
  await receipt(env, row.id, event, input.actor, row.payload_digest, input.detail);
  const completed = await getApproval(env, row.id);
  if (completed) await approvalEvent(env, completed, event, input.actor, input.detail);
}

export async function cancelApprovalByScope(
  env: Env,
  input: { actionType: ApprovalActionType; scopeType: string; scopeId: string; actor: string; reason?: string },
): Promise<void> {
  const rows = await env.AZRAIL_D1.prepare(
    `SELECT * FROM approval_requests WHERE action_type=? AND scope_type=? AND scope_id=?
     AND status IN ('pending','approved')`,
  ).bind(input.actionType, input.scopeType, input.scopeId).all<ApprovalRequestRecord>();
  for (const row of rows.results ?? []) {
    await env.AZRAIL_D1.prepare("UPDATE approval_requests SET status='cancelled',decided_at=?,decided_by=?,decision_reason=? WHERE id=? AND status IN ('pending','approved')")
      .bind(Date.now(), input.actor, input.reason?.slice(0, 800) ?? null, row.id).run();
    await receipt(env, row.id, "cancelled", input.actor, row.payload_digest, { reason: input.reason?.slice(0, 800) ?? null });
    const cancelled = await getApproval(env, row.id);
    if (cancelled) await approvalEvent(env, cancelled, "cancelled", input.actor, { reason: input.reason?.slice(0, 800) ?? null });
  }
}

export function actionForTool(tool: string): ApprovalActionType {
  if (tool === "delete_file") return "delete_file";
  if (tool === "open_pr") return "github_pr";
  return "external_write";
}
