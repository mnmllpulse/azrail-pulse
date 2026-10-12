import type { Env } from "../types";
import { childTrace, linkTrace, type TraceContext } from "./observability-context";

export type EventDomain =
  | "mission"
  | "agent"
  | "tool"
  | "approval"
  | "connector"
  | "verification"
  | "recovery"
  | "publication"
  | "system";

export interface EventIntegrityProof {
  algorithm: "sha256";
  scope: string;
  prevHash: string;
  hash: string;
}

export interface EventEnvelope {
  seq: number;
  id: string;
  schemaVersion: 1;
  domain: EventDomain;
  type: string;
  accountId?: string;
  projectId?: string;
  missionId?: string;
  taskId?: string;
  approvalId?: string;
  requestId?: string;
  traceId?: string;
  toolCallId?: string;
  connectorCallId?: string;
  modelCallId?: string;
  subjectType: string;
  subjectId: string;
  actor?: string;
  payload?: unknown;
  integrity?: EventIntegrityProof;
  createdAt: number;
}

export interface EmitEventInput {
  id?: string;
  domain: EventDomain;
  type: string;
  accountId?: string;
  projectId?: string;
  missionId?: string;
  taskId?: string;
  approvalId?: string;
  trace?: Partial<TraceContext>;
  subjectType: string;
  subjectId: string;
  actor?: string;
  payload?: unknown;
  createdAt?: number;
}

const TOKEN = /^[a-z0-9][a-z0-9._:-]{1,159}$/i;
const SUBJECT_TYPE = /^[a-z0-9][a-z0-9._:-]{1,79}$/i;
const HASH = /^[a-f0-9]{64}$/;
const GENESIS_HASH = "0".repeat(64);
const MAX_INTEGRITY_RETRIES = 5;

function assertToken(value: string, label: string, pattern: RegExp): string {
  const normalized = value.trim();
  if (!pattern.test(normalized)) throw new Error(`Invalid event ${label}.`);
  return normalized;
}

function payloadJson(payload: unknown): string | null {
  if (payload === undefined) return null;
  const encoded = JSON.stringify(payload);
  if (encoded.length > 64_000) throw new Error("Event payload exceeds 64KB.");
  return encoded;
}

function integrityScope(input: Pick<EmitEventInput,"accountId"|"projectId"|"missionId"|"approvalId"|"subjectType"|"subjectId">): string {
  const scope = input.projectId
    ? `project:${input.projectId}`
    : input.missionId
      ? `mission:${input.missionId}`
      : input.accountId
        ? `account:${input.accountId}`
        : input.approvalId
          ? `approval:${input.approvalId}`
          : `${input.subjectType}:${input.subjectId}`;
  if (scope.length < 3 || scope.length > 768) throw new Error("Invalid event integrity scope.");
  return scope;
}

function integrityMaterial(input: {
  scope:string; prevHash:string; id:string; domain:EventDomain; type:string;
  accountId:string|null; projectId:string|null; missionId:string|null; taskId:string|null; approvalId:string|null;
  subjectType:string; subjectId:string; actor:string|null; payloadJson:string|null; createdAt:number;
}): string {
  return JSON.stringify([
    1,"sha256",input.scope,input.prevHash,input.id,input.domain,input.type,
    input.accountId,input.projectId,input.missionId,input.taskId,input.approvalId,
    input.subjectType,input.subjectId,input.actor,input.payloadJson,input.createdAt,
  ]);
}

async function sha256Hex(value:string):Promise<string>{
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,"0")).join("");
}

async function latestIntegrityHash(env:Env,scope:string):Promise<string>{
  const row=await env.AZRAIL_D1.prepare(
    `SELECT i.event_hash FROM event_integrity i
     JOIN event_stream e ON e.id=i.event_id
     WHERE i.scope=? ORDER BY e.seq DESC LIMIT 1`,
  ).bind(scope).first<{event_hash?:string}>();
  const hash=row?.event_hash?.toLowerCase();
  if(!hash)return GENESIS_HASH;
  if(!HASH.test(hash))throw new Error("Corrupt event integrity head.");
  return hash;
}

function isIntegrityHeadRace(error:unknown):boolean{
  const message=error instanceof Error?error.message:String(error);
  return /event_integrity/i.test(message)&&/scope/i.test(message)&&/prev_hash/i.test(message)&&/(unique|constraint)/i.test(message);
}

function rowToEnvelope(row: Record<string, unknown>): EventEnvelope {
  let payload: unknown = undefined;
  const raw = row.payload_json;
  if (typeof raw === "string") {
    try { payload = JSON.parse(raw); } catch { payload = raw; }
  }
  const integrity = row.event_hash && row.integrity_scope && row.prev_hash ? {
    algorithm:"sha256" as const,
    scope:String(row.integrity_scope),
    prevHash:String(row.prev_hash),
    hash:String(row.event_hash),
  } : undefined;
  return {
    seq: Number(row.seq),
    id: String(row.id),
    schemaVersion: 1,
    domain: String(row.domain) as EventDomain,
    type: String(row.type),
    ...(row.account_id ? { accountId: String(row.account_id) } : {}),
    ...(row.project_id ? { projectId: String(row.project_id) } : {}),
    ...(row.mission_id ? { missionId: String(row.mission_id) } : {}),
    ...(row.task_id ? { taskId: String(row.task_id) } : {}),
    ...(row.approval_id ? { approvalId: String(row.approval_id) } : {}),
    ...(row.request_id ? { requestId: String(row.request_id) } : {}),
    ...(row.trace_id ? { traceId: String(row.trace_id) } : {}),
    ...(row.tool_call_id ? { toolCallId: String(row.tool_call_id) } : {}),
    ...(row.connector_call_id ? { connectorCallId: String(row.connector_call_id) } : {}),
    ...(row.model_call_id ? { modelCallId: String(row.model_call_id) } : {}),
    subjectType: String(row.subject_type),
    subjectId: String(row.subject_id),
    ...(row.actor ? { actor: String(row.actor) } : {}),
    ...(raw !== null && raw !== undefined ? { payload } : {}),
    ...(integrity ? { integrity } : {}),
    createdAt: Number(row.created_at),
  };
}

const SELECT_FIELDS = `e.seq,e.id,e.domain,e.type,e.account_id,e.project_id,e.mission_id,e.task_id,e.approval_id,
  e.subject_type,e.subject_id,e.actor,e.payload_json,e.created_at,
  t.request_id,t.trace_id,t.tool_call_id,t.connector_call_id,t.model_call_id,
  i.scope AS integrity_scope,i.prev_hash,i.event_hash`;
const EVENT_JOINS = `LEFT JOIN trace_links t ON t.entity_type='event' AND t.entity_id=e.id
  LEFT JOIN event_integrity i ON i.event_id=e.id`;

export async function emitEvent(env: Env, input: EmitEventInput): Promise<EventEnvelope> {
  const id = input.id ?? crypto.randomUUID();
  const type = assertToken(input.type, "type", TOKEN);
  const subjectType = assertToken(input.subjectType, "subject type", SUBJECT_TYPE);
  const subjectId = input.subjectId.trim();
  if (!subjectId || subjectId.length > 512) throw new Error("Invalid event subject id.");
  const createdAt = input.createdAt ?? Date.now();
  if (!Number.isSafeInteger(createdAt) || createdAt <= 0) throw new Error("Invalid event timestamp.");
  const actor=input.actor?.slice(0,256)??null;
  const encodedPayload=payloadJson(input.payload);
  const scope=integrityScope({...input,subjectType,subjectId});
  let row:Record<string,unknown>|null=null;
  let proof:EventIntegrityProof|undefined;

  for(let attempt=1;attempt<=MAX_INTEGRITY_RETRIES;attempt++){
    const prevHash=await latestIntegrityHash(env,scope);
    const eventHash=await sha256Hex(integrityMaterial({
      scope,prevHash,id,domain:input.domain,type,
      accountId:input.accountId??null,projectId:input.projectId??null,missionId:input.missionId??null,
      taskId:input.taskId??null,approvalId:input.approvalId??null,subjectType,subjectId,actor,
      payloadJson:encodedPayload,createdAt,
    }));
    try{
      const [eventResult,integrityResult]=await env.AZRAIL_D1.batch([
        env.AZRAIL_D1.prepare(
          `INSERT INTO event_stream(
            id,schema_version,domain,type,account_id,project_id,mission_id,task_id,approval_id,
            subject_type,subject_id,actor,payload_json,created_at
           ) VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?,?)
           RETURNING seq,id,domain,type,account_id,project_id,mission_id,task_id,approval_id,subject_type,subject_id,actor,payload_json,created_at`,
        ).bind(
          id,input.domain,type,input.accountId??null,input.projectId??null,input.missionId??null,input.taskId??null,
          input.approvalId??null,subjectType,subjectId,actor,encodedPayload,createdAt,
        ),
        env.AZRAIL_D1.prepare(
          `INSERT INTO event_integrity(event_id,scope,algorithm,prev_hash,event_hash,created_at)
           VALUES(?,?,'sha256',?,?,?) RETURNING event_id`,
        ).bind(id,scope,prevHash,eventHash,createdAt),
      ]) as Array<{results?:Record<string,unknown>[]}>;
      row=eventResult?.results?.[0]??null;
      if(!row||!integrityResult?.results?.length)throw new Error("Event integrity publication was not committed.");
      proof={algorithm:"sha256",scope,prevHash,hash:eventHash};
      break;
    }catch(error){
      if(attempt<MAX_INTEGRITY_RETRIES&&isIntegrityHeadRace(error))continue;
      throw error;
    }
  }
  if (!row||!proof) throw new Error("Event was not persisted with integrity proof.");

  const trace = input.trace?.traceId && input.trace.requestId
    ? childTrace(input.trace as TraceContext, {
        missionId: input.missionId ?? input.trace.missionId,
        taskId: input.taskId ?? input.trace.taskId,
        approvalId: input.approvalId ?? input.trace.approvalId,
      })
    : undefined;
  if (trace) await linkTrace(env, "event", id, trace);

  return {
    ...rowToEnvelope(row),
    integrity:proof,
    ...(trace?.requestId ? { requestId: trace.requestId } : {}),
    ...(trace?.traceId ? { traceId: trace.traceId } : {}),
    ...(trace?.toolCallId ? { toolCallId: trace.toolCallId } : {}),
    ...(trace?.connectorCallId ? { connectorCallId: trace.connectorCallId } : {}),
    ...(trace?.modelCallId ? { modelCallId: trace.modelCallId } : {}),
  };
}

export async function verifyEventIntegrityScope(env:Env,scope:string,limit=5000):Promise<{ok:boolean;checked:number;firstSeq?:number;lastSeq?:number;brokenAt?:number}>{
  const bounded=Math.max(1,Math.min(Math.trunc(limit),20_000));
  const {results}=await env.AZRAIL_D1.prepare(
    `SELECT e.seq,e.id,e.domain,e.type,e.account_id,e.project_id,e.mission_id,e.task_id,e.approval_id,
            e.subject_type,e.subject_id,e.actor,e.payload_json,e.created_at,
            i.scope,i.prev_hash,i.event_hash
     FROM event_integrity i JOIN event_stream e ON e.id=i.event_id
     WHERE i.scope=? ORDER BY e.seq ASC LIMIT ?`,
  ).bind(scope,bounded+1).all<Record<string,unknown>>();
  const rows=results??[];
  if(rows.length>bounded)return {ok:false,checked:bounded,brokenAt:Number(rows[bounded]?.seq??0)};
  let previous=GENESIS_HASH;
  let checked=0;
  for(const row of rows){
    const prevHash=String(row.prev_hash??'').toLowerCase();
    const actual=String(row.event_hash??'').toLowerCase();
    if(!HASH.test(prevHash)||!HASH.test(actual)||prevHash!==previous)return {ok:false,checked,brokenAt:Number(row.seq)};
    const expected=await sha256Hex(integrityMaterial({
      scope:String(row.scope),prevHash,id:String(row.id),domain:String(row.domain) as EventDomain,type:String(row.type),
      accountId:row.account_id?String(row.account_id):null,projectId:row.project_id?String(row.project_id):null,
      missionId:row.mission_id?String(row.mission_id):null,taskId:row.task_id?String(row.task_id):null,
      approvalId:row.approval_id?String(row.approval_id):null,subjectType:String(row.subject_type),subjectId:String(row.subject_id),
      actor:row.actor?String(row.actor):null,payloadJson:row.payload_json===null||row.payload_json===undefined?null:String(row.payload_json),
      createdAt:Number(row.created_at),
    }));
    if(expected!==actual)return {ok:false,checked,brokenAt:Number(row.seq)};
    previous=actual;checked++;
  }
  return {ok:true,checked,...(rows.length?{firstSeq:Number(rows[0].seq),lastSeq:Number(rows.at(-1)?.seq)}:{})};
}

export async function listProjectEvents(
  env: Env,
  projectId: string,
  options: { after?: number; limit?: number } = {},
): Promise<{ events: EventEnvelope[]; cursor: number; hasMore: boolean }> {
  const after = Math.max(0, Math.trunc(options.after ?? 0));
  const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? 200), 500));
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM event_stream e ${EVENT_JOINS}
     WHERE e.project_id=? AND e.seq>? ORDER BY e.seq ASC LIMIT ?`,
  ).bind(projectId, after, limit + 1).all<Record<string, unknown>>();
  const rows = results ?? [];
  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit).map(rowToEnvelope);
  return { events, cursor: events.at(-1)?.seq ?? after, hasMore };
}

export async function listMissionStream(
  env: Env,
  missionId: string,
  options: { after?: number; limit?: number } = {},
): Promise<{ events: EventEnvelope[]; cursor: number; hasMore: boolean }> {
  const after = Math.max(0, Math.trunc(options.after ?? 0));
  const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? 200), 500));
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM event_stream e ${EVENT_JOINS}
     WHERE e.mission_id=? AND e.seq>? ORDER BY e.seq ASC LIMIT ?`,
  ).bind(missionId, after, limit + 1).all<Record<string, unknown>>();
  const rows = results ?? [];
  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit).map(rowToEnvelope);
  return { events, cursor: events.at(-1)?.seq ?? after, hasMore };
}

export async function listTraceEvents(
  env: Env,
  traceId: string,
  options: { after?: number; limit?: number } = {},
): Promise<{ events: EventEnvelope[]; cursor: number; hasMore: boolean }> {
  if (!/^[a-f0-9]{32}$/i.test(traceId)) throw new Error("Invalid trace id.");
  const after = Math.max(0, Math.trunc(options.after ?? 0));
  const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? 200), 500));
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM event_stream e ${EVENT_JOINS}
     WHERE t.trace_id=? AND e.seq>? ORDER BY e.seq ASC LIMIT ?`,
  ).bind(traceId.toLowerCase(), after, limit + 1).all<Record<string, unknown>>();
  const rows = results ?? [];
  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit).map(rowToEnvelope);
  return { events, cursor: events.at(-1)?.seq ?? after, hasMore };
}
