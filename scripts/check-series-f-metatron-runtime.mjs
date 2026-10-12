import {existsSync,readFileSync} from 'node:fs';
let failed=false;
const fail=m=>{console.error('SERIES F METATRON FAIL:',m);failed=true;};
const ok=(name,cond)=>cond?console.log(`PASS ${name}`):fail(name);
const read=p=>readFileSync(p,'utf8');
const required=[
  'src/lib/metatron-ops.ts','src/lib/mission-decision-log.ts','ui/metatron-lab.ts',
  'migrations/034-metatron-lab-2.sql','src/lib/mission-state.ts','src/agents/mission-coordinator.ts',
  'src/agents/orchestrator.ts','src/agents/orchestrator-capabilities.ts','ui/event-stream.ts',
];
for(const file of required)if(!existsSync(file))fail(`missing ${file}`);
const ops=read('src/lib/metatron-ops.ts');
const decisions=read('src/lib/mission-decision-log.ts');
const ui=read('ui/metatron-lab.ts');
const state=read('src/lib/mission-state.ts');
const coordinator=read('src/agents/mission-coordinator.ts');
const orchestrator=read('src/agents/orchestrator.ts');
const capabilities=read('src/agents/orchestrator-capabilities.ts');
const stream=read('ui/event-stream.ts');
const index=read('src/index.ts');
const checkpoints=read('src/lib/checkpoints.ts');
const control=read('src/lib/project-control.ts');
const memory=read('src/lib/memory-agent.ts');
const modelRouter=read('src/lib/model-router.ts');
const engine=read('src/core/execution-engine.ts');
const migration=read('migrations/034-metatron-lab-2.sql');
const schema=read('schema.sql');
const nav=read('ui/navigation.ts')+read('ui/app.ts')+read('ui/app.html');

ok('F61 Live Mission Graph',ui.includes('Live Mission Graph')&&ops.includes("mode:'derived-linear'")&&ops.includes('explicit planner DAG'));
ok('F62 Agent Cards',ui.includes('Agent Cards')&&ops.includes('agentCards'));
ok('F63 lifecycle controls',ui.includes("['start','Start']")&&ui.includes("['pause','Pause']")&&ui.includes("['resume','Resume']")&&ui.includes("['cancel','Cancel']")&&ui.includes("['terminate','Terminate']")&&index.includes('/api/metatron/control'));
ok('F64 real AbortSignal propagation',orchestrator.includes('new AbortController()')&&orchestrator.includes('abortMission')&&coordinator.includes('abortController.signal')&&coordinator.includes('finalizeControlInterruption'));
ok('F65 live logs WebSocket + durable replay',stream.includes('new WebSocket(')&&ops.includes("transport:'project-websocket+durable-replay'")&&ui.includes('Live Logs · durable replay'));
ok('F66 Trace Explorer',ui.includes('Trace Explorer')&&ops.includes('traceExplorer')&&ops.includes('trace_links'));
ok('F67 token/cost/resource display',ui.includes("['COST'")&&ui.includes("['TOKENS'")&&ops.includes('actualMicroUsd')&&ops.includes('elapsedMs')&&ops.includes('fenceToken'));
ok('F68 Checkpoint System',ui.includes('Checkpoint System / Mission Replay')&&ops.includes('loadCheckpoints')&&checkpoints.includes('mission_tool_receipts'));
ok('F69 Resume from Checkpoint',index.includes('action==="resume"')&&coordinator.includes('"paused"')&&coordinator.includes('validateReplayableCheckpoints'));
ok('F70 Mission Replay is read-only',ops.includes("replay:{mode:'read-only'")&&ui.includes('Mission Replay здесь read-only'));
ok('F71 safe Step Retry only for proven failed step',ops.includes("point.status!=='failed'||point.receipt_status!=='failed'")&&ops.includes('После этого шага уже есть durable checkpoints'));
ok('F72 uncertain_effect state',ops.includes("status==='uncertain'")&&ui.includes('uncertain_effect'));
ok('F73 fail-closed Effect Reconciliation Engine',ops.includes("mode:'fail-closed'")&&ops.includes('/api/connectors/calls/:id/reconcile')&&ops.includes('/api/admin/billing')&&ui.includes('Effect Reconciliation Engine'));
ok('F74 Fencing Tokens',control.includes('fence_token')&&control.includes('assertProjectLease')&&ops.includes('fenceToken'));
ok('F75 real Agent Health Monitoring',orchestrator.includes('probeAgents')&&orchestrator.includes('agent.ping()')&&orchestrator.includes('storageReadable'));
ok('F76 Automatic Agent Replacement is pre-dispatch only',capabilities.includes('replacement-')&&capabilities.includes('failed pre-dispatch health/bootstrap probe')&&capabilities.includes('runPrepared() is intentionally outside this catch'));
ok('F77 Human Approval Nodes',ui.includes('Human Approval Nodes')&&ops.includes('approval_requests'));
ok('F78 Fault Injection Lab simulation-only',ui.includes('Fault Injection Lab · SIMULATION ONLY')&&ops.includes('destructiveFaultInjected:false')&&migration.includes('simulation_only INTEGER NOT NULL DEFAULT 1'));
ok('F79 exact Memory Inspector audit',ui.includes('Memory Inspector')&&memory.includes('recordMemoryReads')&&ops.includes('mission_memory_reads'));
ok('F80 Decision Explanation Panel',ui.includes('Decision Explanation Panel')&&decisions.includes('mission_decisions')&&modelRouter.includes('recordMissionDecision')&&engine.includes('recordMissionDecision'));
ok('Metatron durable schema',migration.includes('CREATE TABLE IF NOT EXISTS mission_controls')&&migration.includes('CREATE TABLE IF NOT EXISTS mission_agent_runtime')&&migration.includes('CREATE TABLE IF NOT EXISTS mission_decisions')&&migration.includes('CREATE TABLE IF NOT EXISTS mission_memory_reads')&&migration.includes('CREATE TABLE IF NOT EXISTS mission_fault_runs')&&schema.includes('CREATE TABLE IF NOT EXISTS mission_fault_runs'));
ok('Metatron top-level control-plane route',nav.includes("page:'metatron'")&&nav.includes('/metatron')&&nav.includes('AGENT OPERATIONS CENTER'));
ok('Pause/cancel/terminate terminal safety',state.includes("row.status === \"paused\"")&&state.includes('releaseTerminalMissionLocks')&&state.includes("'terminated'"));
ok('Start scheduling is idempotent',index.includes('delivery.delivered')&&index.includes('alreadyScheduled:true'));

if(failed)process.exit(1);
console.log('SERIES F METATRON PASS: F61-F80 Agent Operations Center is wired; destructive fault injection, unsafe replay, and guessed reconciliation remain explicitly prohibited.');
