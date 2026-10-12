import type { Env } from "../types";
import { log } from "./resilience";

export interface TraceContext {
  requestId: string;
  traceId: string;
  missionId?: string;
  taskId?: string;
  toolCallId?: string;
  approvalId?: string;
  connectorCallId?: string;
  modelCallId?: string;
}

export type TracePatch = Partial<Omit<TraceContext, "requestId" | "traceId">> & Partial<Pick<TraceContext, "requestId" | "traceId">>;

const UUIDISH = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const TRACE_HEX = /^[a-f0-9]{32}$/i;

function cleanId(value: string | null | undefined, fallback: () => string): string {
  const candidate = String(value ?? "").trim();
  return candidate && UUIDISH.test(candidate) ? candidate : fallback();
}

function newTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function traceparentTraceId(value: string | null): string | null {
  if (!value) return null;
  const parts = value.trim().toLowerCase().split("-");
  if (parts.length !== 4) return null;
  const [version, traceId, parentId, flags] = parts;
  if (!/^[a-f0-9]{2}$/.test(version) || version === "ff") return null;
  if (!TRACE_HEX.test(traceId) || /^0+$/.test(traceId)) return null;
  if (!/^[a-f0-9]{16}$/.test(parentId) || /^0+$/.test(parentId)) return null;
  if (!/^[a-f0-9]{2}$/.test(flags)) return null;
  return traceId;
}

export function requestTrace(request: Request): TraceContext {
  return {
    requestId: cleanId(request.headers.get("x-request-id"), () => crypto.randomUUID()),
    traceId: traceparentTraceId(request.headers.get("traceparent")) ?? newTraceId(),
  };
}

export function taskTrace(request: { _requestId?: string; _traceId?: string; _taskId?: string; projectId?: string }, patch: TracePatch = {}): TraceContext {
  return {
    requestId: cleanId(patch.requestId ?? request._requestId, () => crypto.randomUUID()),
    traceId: TRACE_HEX.test(String(patch.traceId ?? request._traceId ?? ""))
      ? String(patch.traceId ?? request._traceId).toLowerCase()
      : newTraceId(),
    ...(patch.missionId ? { missionId: patch.missionId } : {}),
    ...(patch.taskId ?? request._taskId ? { taskId: patch.taskId ?? request._taskId } : {}),
    ...(patch.toolCallId ? { toolCallId: patch.toolCallId } : {}),
    ...(patch.approvalId ? { approvalId: patch.approvalId } : {}),
    ...(patch.connectorCallId ? { connectorCallId: patch.connectorCallId } : {}),
    ...(patch.modelCallId ? { modelCallId: patch.modelCallId } : {}),
  };
}

export function childTrace(base: TraceContext, patch: TracePatch = {}): TraceContext {
  return {
    ...base,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    requestId: patch.requestId ?? base.requestId,
    traceId: patch.traceId ?? base.traceId,
  } as TraceContext;
}

export function traceLog(trace: Partial<TraceContext> | undefined): Record<string, string> {
  if (!trace) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(trace)) if (typeof value === "string" && value) out[key] = value;
  return out;
}

export async function linkTrace(
  env: Env,
  entityType: string,
  entityId: string,
  trace: Partial<TraceContext> | undefined,
): Promise<void> {
  if (!trace?.traceId || !trace.requestId) return;
  if (!TRACE_HEX.test(trace.traceId) || !UUIDISH.test(trace.requestId)) return;
  try {
    await env.AZRAIL_D1.prepare(
      `INSERT INTO trace_links(
        entity_type,entity_id,request_id,trace_id,mission_id,task_id,tool_call_id,approval_id,connector_call_id,model_call_id,created_at
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(entity_type,entity_id) DO UPDATE SET
         mission_id=COALESCE(trace_links.mission_id,excluded.mission_id),
         task_id=COALESCE(trace_links.task_id,excluded.task_id),
         tool_call_id=COALESCE(trace_links.tool_call_id,excluded.tool_call_id),
         approval_id=COALESCE(trace_links.approval_id,excluded.approval_id),
         connector_call_id=COALESCE(trace_links.connector_call_id,excluded.connector_call_id),
         model_call_id=COALESCE(trace_links.model_call_id,excluded.model_call_id)`,
    ).bind(
      entityType.slice(0, 80),
      entityId.slice(0, 512),
      trace.requestId,
      trace.traceId.toLowerCase(),
      trace.missionId ?? null,
      trace.taskId ?? null,
      trace.toolCallId ?? null,
      trace.approvalId ?? null,
      trace.connectorCallId ?? null,
      trace.modelCallId ?? null,
      Date.now(),
    ).run();
  } catch (error) {
    // Observability is diagnostic metadata: losing a link is visible in logs,
    // but it must never replay or abort the authoritative business operation.
    log("warn", "observability.link_failed", {
      entityType: entityType.slice(0, 80),
      entityId: entityId.slice(0, 160),
      requestId: trace.requestId,
      traceId: trace.traceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function loadTraceLink(env: Env, entityType: string, entityId: string): Promise<TraceContext | null> {
  const row = await env.AZRAIL_D1.prepare(
    `SELECT request_id,trace_id,mission_id,task_id,tool_call_id,approval_id,connector_call_id,model_call_id
     FROM trace_links WHERE entity_type=? AND entity_id=?`,
  ).bind(entityType, entityId).first<Record<string, string | null>>();
  if (!row?.request_id || !row.trace_id) return null;
  return {
    requestId: row.request_id,
    traceId: row.trace_id,
    ...(row.mission_id ? { missionId: row.mission_id } : {}),
    ...(row.task_id ? { taskId: row.task_id } : {}),
    ...(row.tool_call_id ? { toolCallId: row.tool_call_id } : {}),
    ...(row.approval_id ? { approvalId: row.approval_id } : {}),
    ...(row.connector_call_id ? { connectorCallId: row.connector_call_id } : {}),
    ...(row.model_call_id ? { modelCallId: row.model_call_id } : {}),
  };
}
export interface TraceLinkRecord {
  entityType: string;
  entityId: string;
  requestId: string;
  traceId: string;
  missionId?: string;
  taskId?: string;
  toolCallId?: string;
  approvalId?: string;
  connectorCallId?: string;
  modelCallId?: string;
  createdAt: number;
}

export async function listTraceLinks(env: Env, traceId: string, limit = 500): Promise<TraceLinkRecord[]> {
  if (!TRACE_HEX.test(traceId)) throw new Error("Invalid trace id.");
  const capped = Math.max(1, Math.min(Math.trunc(limit), 1000));
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT entity_type,entity_id,request_id,trace_id,mission_id,task_id,tool_call_id,approval_id,connector_call_id,model_call_id,created_at
     FROM trace_links WHERE trace_id=? ORDER BY created_at ASC,entity_type ASC,entity_id ASC LIMIT ?`,
  ).bind(traceId.toLowerCase(), capped).all<Record<string, unknown>>();
  return (results ?? []).map((row) => ({
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    requestId: String(row.request_id),
    traceId: String(row.trace_id),
    ...(row.mission_id ? { missionId: String(row.mission_id) } : {}),
    ...(row.task_id ? { taskId: String(row.task_id) } : {}),
    ...(row.tool_call_id ? { toolCallId: String(row.tool_call_id) } : {}),
    ...(row.approval_id ? { approvalId: String(row.approval_id) } : {}),
    ...(row.connector_call_id ? { connectorCallId: String(row.connector_call_id) } : {}),
    ...(row.model_call_id ? { modelCallId: String(row.model_call_id) } : {}),
    createdAt: Number(row.created_at),
  }));
}
