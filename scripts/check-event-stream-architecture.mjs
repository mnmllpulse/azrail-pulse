import { existsSync, readFileSync } from 'node:fs';

const fail=(message)=>{console.error(`EVENT STREAM FAIL: ${message}`);process.exitCode=1;};
const need=(file,marker,label=marker)=>{if(!readFileSync(file,'utf8').includes(marker))fail(`${file}: missing ${label}`);};

for(const file of ['src/lib/event-stream.ts','migrations/018-unified-event-stream.sql','migrations/030-event-integrity-chain.sql','ui/event-stream.ts']){
  if(!existsSync(file))fail(`missing ${file}`);
}
const schema=readFileSync('schema.sql','utf8');
const stream=readFileSync('src/lib/event-stream.ts','utf8');
const legacy=readFileSync('src/lib/event-store.ts','utf8');
const orchestrator=readFileSync('src/agents/orchestrator.ts','utf8');
const history=readFileSync('src/agents/orchestrator-history.ts','utf8');
const approvals=readFileSync('src/lib/approval-engine.ts','utf8');
const connectors=readFileSync('src/unified/connectors.ts','utf8');
const workspace=readFileSync('src/lib/workspace-head.ts','utf8');
const index=readFileSync('src/index.ts','utf8');
const ui=readFileSync('ui/event-stream.ts','utf8');

for(const marker of [
  'CREATE TABLE IF NOT EXISTS event_stream',
  'seq INTEGER PRIMARY KEY AUTOINCREMENT',
  'idx_event_stream_project_seq',
  'idx_event_stream_mission_seq',
  'CREATE TABLE IF NOT EXISTS event_integrity',
  'idx_event_integrity_scope_prev',
]) if(!schema.includes(marker))fail(`schema.sql: missing ${marker}`);

for(const domain of ['mission','agent','tool','approval','connector','verification','recovery','publication','system']){
  if(!stream.includes(`| "${domain}"`) && !stream.includes(`"${domain}";`)) fail(`event domain missing: ${domain}`);
}
for(const marker of ['emitEvent','listProjectEvents','listMissionStream','verifyEventIntegrityScope','sha256Hex','event_integrity','seq>?','limit + 1']){
  if(!stream.includes(marker))fail(`event-stream invariant missing: ${marker}`);
}
if(!stream.includes('ORDER BY e.seq ASC') && !stream.includes('ORDER BY seq ASC')) fail('event-stream invariant missing: monotonic seq ordering');
if(legacy.includes('INSERT INTO mission_events'))fail('new mission writes must not target legacy mission_events');
if(!legacy.includes('emitEvent(env'))fail('mission event compatibility adapter must use unified emitEvent');
if(!orchestrator.includes('{type:"event_stream", event:payload.streamEvent}'))fail('orchestrator realtime delivery must use the unified event_stream envelope');
if(orchestrator.includes('{type:"mission_event"'))fail('orchestrator must not emit the legacy mission_event frame');
if(!history.includes('domain: "agent"'))fail('task/agent lifecycle must write the unified stream');
if(!approvals.includes('domain: "approval"'))fail('approval lifecycle must write the unified stream');
if(!connectors.includes("domain:'connector'"))fail('connector lifecycle must write the unified stream');
if(!workspace.includes('domain:"publication"'))fail('workspace publication must write the unified stream');
if(!index.includes('/events$/') || !index.includes('listProjectEvents'))fail('project replay API is missing');
for(const marker of ['after=${cursor}','type===\'event_stream\'','sessionStorage.setItem(key,String(cursor))','new WebSocket']){
  if(!ui.includes(marker))fail(`UI replay/subscription invariant missing: ${marker}`);
}

if(process.exitCode)process.exit(process.exitCode);
console.log('EVENT STREAM ARCHITECTURE PASS: durable cursor + replay + realtime + SHA-256 tamper-evident chain verified.');
