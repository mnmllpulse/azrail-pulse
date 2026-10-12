import { existsSync, readFileSync } from 'node:fs';

let failed = false;
function fail(message) { console.error(`OBSERVABILITY ARCHITECTURE FAIL: ${message}`); failed = true; }
function read(path) { if (!existsSync(path)) { fail(`missing ${path}`); return ''; } return readFileSync(path, 'utf8'); }
function has(source, markers, label) { for (const marker of markers) if (!source.includes(marker)) fail(`${label}: missing ${marker}`); }

const schema = read('schema.sql');
const migration = read('migrations/019-observability-trace-links.sql');
const obs = read('src/lib/observability-context.ts');
const eventStream = read('src/lib/event-stream.ts');
const index = read('src/index.ts');
const missionCoordinator = read('src/agents/mission-coordinator.ts');
const orchestrator = read('src/agents/orchestrator.ts');
const history = read('src/agents/orchestrator-history.ts');
const execution = read('src/core/execution-engine.ts');
const journal = read('src/core/execution-journal.ts');
const router = read('src/lib/model-router.ts');
const billing = read('src/lib/billing.ts');
const approval = read('src/lib/approval-engine.ts');
const connectors = read('src/unified/connectors.ts');
const workspace = read('src/lib/workspace-head.ts');

for (const source of [schema, migration]) has(source, [
  'CREATE TABLE IF NOT EXISTS trace_links',
  'request_id TEXT NOT NULL',
  'trace_id TEXT NOT NULL',
  'mission_id TEXT',
  'task_id TEXT',
  'tool_call_id TEXT',
  'approval_id TEXT',
  'connector_call_id TEXT',
  'model_call_id TEXT',
  'idx_trace_links_trace',
], source === schema ? 'schema' : 'migration 019');

has(obs, [
  'export interface TraceContext',
  'requestId: string',
  'traceId: string',
  'traceparent',
  'export function requestTrace',
  'export function taskTrace',
  'export function childTrace',
  'export async function linkTrace',
  'export async function listTraceLinks',
  'observability.link_failed',
], 'observability context');

// A diagnostics failure must not abort/replay an authoritative mutation.
if (!/export async function linkTrace[\s\S]*?try \{[\s\S]*?\.run\(\);[\s\S]*?catch \(error\)/.test(obs))
  fail('trace sidecar writes must be best-effort and fail open for business correctness');
if (obs.includes('request_id=excluded.request_id') || obs.includes('trace_id=excluded.trace_id'))
  fail('an immutable entity trace must not be silently rebound to another request');

has(eventStream, [
  'requestId?: string', 'traceId?: string', 'toolCallId?: string',
  'connectorCallId?: string', 'modelCallId?: string',
  'listTraceEvents', "JOIN trace_links t ON t.entity_type='event'",
], 'event stream');

has(index, [
  'const ingressTrace = requestTrace(request)',
  'X-Request-Id', 'X-Trace-Id',
  'requestId: trace.requestId', 'traceId: trace.traceId',
  'body._requestId = trace.requestId', 'body._traceId = trace.traceId',
  'observability\\/traces', 'listTraceLinks', 'listTraceEvents',
], 'HTTP ingress');
if (!index.includes('principal.role !== "admin"')) fail('trace traversal endpoint must remain operator/admin scoped');

has(orchestrator, ['taskTrace(request', '_requestId', '_traceId'], 'orchestrator');
has(history, ['linkTrace', '"task"', 'taskTrace(request'], 'task history');
has(missionCoordinator, ['requestId: trace.requestId', 'traceId: trace.traceId', '_requestId: trace.requestId', '_traceId: trace.traceId'], 'mission coordinator');
has(execution, ['toolCallId: callId', 'toolCtx', 'trace: ctx'], 'execution engine');
has(journal, ['"tool_call"', 'toolCallId: id', 'mission_check'], 'execution journal');
has(router, ['trace?: TraceContext', 'req.trace'], 'model router');
has(billing, ['"model_call"', 'modelCallId:id', 'trace?:TraceContext'], 'billing/model-call correlation');
has(approval, ['"approval"', 'loadTraceLink', 'input.trace'], 'approval correlation');
has(connectors, ["'connector_call'", 'connectorCallId', 'requestTrace(request)'], 'connector correlation');
has(workspace, ['trace?: TraceContext', 'type:"publication.workspace.published"', ',trace}'], 'publication correlation');

if (failed) process.exit(1);
console.log('OBSERVABILITY ARCHITECTURE PASS: request -> trace -> mission/task -> model/tool -> approval/connector -> event/publication correlation is wired.');
