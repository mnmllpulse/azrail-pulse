import {describe,it,expect,vi,afterEach} from 'vitest';
import {emitMissionEvent} from '../src/lib/event-store';
import {reapStaleMissions} from '../src/lib/mission-state';
import {sqliteD1} from './stubs/sqlite-d1';
import type {Env} from '../src/types';
import {markRunning,requestCancel,finishMission,isCancelRequested,sendHint,drainHints} from '../src/lib/mission-state';
import {listFiles,readFile,writeFile,searchFiles} from '../src/lib/workspace';
import {publishWorkspace} from '../src/lib/workspace-head';
import {snapshotWorkspace,rollbackWorkspace} from '../src/core/mission-guard';
import {backupProject,restoreBackup} from '../src/lib/backups';
import {ensureProject} from '../src/lib/project';
import {meteredCall,initializeMissionBudget} from '../src/lib/billing';
import {validateJsonObject} from '../src/lib/request-body';
import {sendProjectEvent} from '../src/lib/socket-access';
import {createAccount} from '../src/lib/accounts';
import {readSource} from '../src/lib/source-reader';
import {ExecutionEngine,parseDecision} from '../src/core/execution-engine';
import * as sandbox from '../src/core/sandbox';
import * as sync from '../src/core/workspace-sync';
import * as exporting from '../src/core/sandbox-export';
import {Orchestrator} from '../src/agents/orchestrator';

function fixture(){
  const {db,sqlite}=sqliteD1(),files=new Map<string,Uint8Array>();
  const env={AZRAIL_D1:db,AZRAIL_R2:{
    async put(k:string,v:string|Uint8Array){files.set(k,typeof v==='string'?new TextEncoder().encode(v):v);},
    async get(k:string){const v=files.get(k);return v?{size:v.length,text:async()=>new TextDecoder().decode(v),arrayBuffer:async()=>v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength),body:new Response(v).body}:null;},
    async list({prefix,limit=1000,cursor='0'}:{prefix:string;limit?:number;cursor?:string}){const all=[...files].filter(([k])=>k.startsWith(prefix)).sort().map(([key,v])=>({key,size:v.length,uploaded:new Date()}));const n=Number(cursor),end=n+limit;return {objects:all.slice(n,end),truncated:end<all.length,cursor:String(end)};},
  },AI:{run:vi.fn(async()=>({response:'ok',usage:{prompt_tokens:1,completion_tokens:1}}))}} as unknown as Env;
  const mission=(status='queued',id='m')=>sqlite.prepare("INSERT INTO missions(id,project_id,goal,status) VALUES(?,'p','test',?)").run(id,status);
  return {env,sqlite,files,mission};
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('0.8.1 runtime regressions',()=>{
  it('only one scheduler can claim a queued mission',async()=>{const t=fixture();t.mission();expect((await Promise.all([markRunning(t.env,'m'),markRunning(t.env,'m')])).filter(Boolean)).toHaveLength(1);});
  it('cancellation cannot be overwritten by starting or late finalization',async()=>{
    const t=fixture();t.mission();await requestCancel(t.env,'m');expect(await markRunning(t.env,'m')).toBe(false);
    await finishMission(t.env,'m','cancelled',null);await finishMission(t.env,'m','completed',null);
    expect(t.sqlite.prepare("SELECT status FROM missions").get()?.status).toBe('cancelled');
    expect(await requestCancel(t.env,'m')).toMatchObject({reason:'already_finished'});
    expect(await markRunning(t.env,'absent')).toBe(false);expect(await isCancelRequested(t.env,'absent')).toBe(true);
  });
  it('cancellation wins when it arrives during the final tool/check window',async()=>{
    const t=fixture();t.mission('executing');
    await requestCancel(t.env,'m');
    const persisted=await finishMission(t.env,'m','completed',{status:'done',agent:'test',summary:'late success'});
    expect(persisted).toBe('cancelled');
    const row=t.sqlite.prepare("SELECT status,result_json FROM missions WHERE id='m'").get() as {status:string;result_json:string};
    expect(row.status).toBe('cancelled');expect(JSON.parse(row.result_json).error).toBe('cancelled');
  });
  it('benchmark reports cancellation when cancel wins a late-success race',async()=>{
    const t=fixture();t.mission();
    vi.spyOn(ExecutionEngine.prototype,'runMission').mockImplementation(async()=>{await requestCancel(t.env,'m');return {status:'done',agent:'bench',summary:'late success'};});
    const stop=vi.fn();const host:any={env:t.env,keepAlive:async()=>stop};
    const result=await Orchestrator.prototype.runBenchMission.call(host,{missionId:'m',projectId:'p',goal:'test',maxIterations:2});
    expect(result.error).toBe('cancelled');expect(t.sqlite.prepare("SELECT status FROM missions WHERE id='m'").get()?.status).toBe('cancelled');expect(stop).toHaveBeenCalledOnce();
  });
  it('parallel hints respect capacity without lost updates',async()=>{
    const t=fixture();t.mission('executing');const accepted=await Promise.all(Array.from({length:12},(_,i)=>sendHint(t.env,'m','hint '+i)));
    expect(accepted.filter(r=>r.ok)).toHaveLength(5);const hints=await drainHints(t.env,'m');expect(new Set(hints).size).toBe(5);expect(await drainHints(t.env,'m')).toEqual([]);
  });
  it('the production scheduled mission receives hints and cleans its heartbeat state',async()=>{
    const t=fixture();t.mission();await sendHint(t.env,'m','keep violet');let received:string[]=[];
    vi.spyOn(ExecutionEngine.prototype,'runMission').mockImplementation(async(_request,ctx)=>{received=await ctx.takeHints!();return {status:'done',agent:'test',summary:'ok'};});
    const stop=vi.fn();const host:any={env:t.env,activeMissions:new Set(),keepAlive:async()=>stop,broadcastMissionEvent:async()=>{}};
    await Orchestrator.prototype.runMissionTask.call(host,{missionId:'m',projectId:'p',goal:'test',maxIterations:8});
    expect(received).toEqual(['keep violet']);expect(stop).toHaveBeenCalledOnce();expect(host.activeMissions.size).toBe(0);
  });
  it('heartbeat failure cannot strand an in-memory active mission',async()=>{
    const t=fixture();t.mission();const host:any={env:t.env,activeMissions:new Set(),keepAlive:async()=>{throw Error('heartbeat down');},broadcastMissionEvent:async()=>{}};
    await Orchestrator.prototype.runMissionTask.call(host,{missionId:'m',projectId:'p',goal:'test',maxIterations:8});expect(host.activeMissions.size).toBe(0);expect(t.sqlite.prepare('SELECT status FROM missions').get()?.status).toBe('failed');
  });
  it('configured sandbox reaches the execution adapter',async()=>{
    vi.spyOn(sync,'syncWorkspaceToSandbox').mockResolvedValue({files:1,bytes:10,skipped:[]});
    vi.spyOn(exporting,'syncWorkspaceFromSandbox').mockResolvedValue({files:1});
    const t=fixture();t.env.AZRAIL_SANDBOX={} as never;t.sqlite.exec("INSERT INTO project_permissions(project_id,capability) VALUES('p','sandbox')");
    const exec=vi.spyOn(sandbox,'runInContainer').mockResolvedValue({exitCode:0,output:'ok',timedOut:false} as never);
    await new ExecutionEngine(t.env).executeTool('sandbox_exec',{command:'pwd'},{projectId:'p',missionId:'m',requestId:'request-test-0001',traceId:'0123456789abcdef0123456789abcdef',iteration:0,maxIterations:2});expect(exec).toHaveBeenCalledOnce();
  });
  it('file names round-trip across list, publish, backup and restore',async()=>{
    const t=fixture();const paths=['src/Привет мир.ts','100%20 real.txt','a b.md'];
    for(const path of paths)await writeFile(t.env,'p',path,'content '+path);
    expect((await listFiles(t.env,'p')).map(f=>f.path).sort()).toEqual([...paths].sort());
    for(const path of paths)expect((await readFile(t.env,'p',path))?.content).toBe('content '+path);
    const copy=await backupProject(t.env,'p');await restoreBackup(t.env,'p',copy.id,'restored');
    for(const path of paths)expect((await readFile(t.env,'restored',path))?.content).toBe('content '+path);
    await publishWorkspace(t.env,'p',paths.map(path=>({path,content:'published'})));
    for(const path of paths)expect((await readFile(t.env,'p',path))?.content).toBe('published');
  });
  it('snapshot and rollback preserve binary bytes and unicode paths',async()=>{
    const t=fixture();await ensureProject(t.env,'p');const bytes=new Uint8Array([0,255,128,42]);
    await publishWorkspace(t.env,'p',[{path:'обложка 100%.bin',content:bytes}]);
    const snapshot=await snapshotWorkspace(t.env,'p','before');expect(snapshot).not.toBeNull();
    const row=t.sqlite.prepare('SELECT r2_object_key FROM project_versions WHERE id=?').get(snapshot!.versionId)!;
    await writeFile(t.env,'p','extra.ts','new');expect(await rollbackWorkspace(t.env,'p',String(row.r2_object_key))).toEqual({restored:1,removed:1});
    const prefix=String(t.sqlite.prepare('SELECT prefix FROM workspace_heads WHERE project_id=?').get('p')?.prefix);
    expect(t.files.get(prefix+'обложка 100%.bin')).toEqual(bytes);
  });
  it.each(['/absolute','a//b','a/../b','a\\b','a\0b'])('rejects unsafe workspace path %j',async(path)=>{await expect(writeFile(fixture().env,'p',path,'x')).rejects.toThrow();});
  it('search distinguishes unscanned files and clipped matches',async()=>{
    const t=fixture();for(let i=0;i<25;i++)await writeFile(t.env,'p',i+'.txt','needle');
    const r=await searchFiles(t.env,'p','needle',1);expect(r.scanned).toBe(12);expect(r.scannedAll).toBe(false);expect(r.matchesTruncated).toBe(true);
    vi.spyOn(t.env.AZRAIL_R2,'get').mockRejectedValue(Error('read unavailable'));expect((await searchFiles(t.env,'p','needle')).scannedAll).toBe(false);
  });
  it('project existence is scoped to the actual D1 binding',async()=>{
    const a=fixture(),b=fixture();expect(await ensureProject(a.env,'same')).toBe(true);expect(await ensureProject(b.env,'same')).toBe(true);
    expect(b.sqlite.prepare("SELECT COUNT(*) n FROM projects WHERE id='same'").get()?.n).toBe(1);
    b.sqlite.exec("DELETE FROM projects; DELETE FROM users;");expect(await ensureProject(b.env,'same')).toBe(true);
  });
  it('releases a reservation when no provider request was sent',async()=>{
    const t=fixture();t.env.AZRAIL_METERING='enforce';t.sqlite.exec("INSERT INTO model_prices(model,input_micro_usd_per_million,output_micro_usd_per_million,updated_at) VALUES('model',1000000,1000000,0); INSERT INTO spend_limits(scope,limit_micro_usd) VALUES('scope',100000)");
    const invoke=vi.fn();await expect(meteredCall(t.env,'model',{messages:[]},'scope',invoke,'scope',{beforeInvoke:async()=>{throw Error('OFF');}})).rejects.toThrow('OFF');
    expect(invoke).not.toHaveBeenCalled();expect(t.sqlite.prepare('SELECT spent_micro_usd n FROM spend_limits').get()?.n).toBe(0);expect(t.sqlite.prepare('SELECT status FROM model_calls').get()?.status).toBe('cancelled');
  });
  it('logging failure cannot strand a reservation',async()=>{
    const t=fixture();t.env.AZRAIL_METERING='enforce';t.sqlite.exec("INSERT INTO model_prices(model,input_micro_usd_per_million,output_micro_usd_per_million,updated_at) VALUES('model',1000000,1000000,0); INSERT INTO spend_limits(scope,limit_micro_usd) VALUES('scope',100000); CREATE TRIGGER fail_calls BEFORE INSERT ON model_calls BEGIN SELECT RAISE(FAIL,'disk full'); END;");
    const invoke=vi.fn();await expect(meteredCall(t.env,'model',{messages:[]},'scope',invoke)).rejects.toThrow();expect(invoke).not.toHaveBeenCalled();expect(t.sqlite.prepare('SELECT spent_micro_usd n FROM spend_limits').get()?.n).toBe(0);
  });
  it('enforces both mission and monthly budgets atomically',async()=>{
    const t=fixture();t.env.AZRAIL_METERING='enforce';await initializeMissionBudget(t.env,'m');
    t.sqlite.exec("INSERT INTO model_prices(model,input_micro_usd_per_million,output_micro_usd_per_million,updated_at) VALUES('model',1000000,1000000,0); INSERT INTO spend_limits(scope,limit_micro_usd) VALUES('month',2)");
    const invoke=vi.fn();await expect(meteredCall(t.env,'model',{messages:[]},'mission:m',invoke,'month',{additionalBudgetScopes:['mission:m']})).rejects.toThrow('бюджет');
    expect(invoke).not.toHaveBeenCalled();expect(t.sqlite.prepare('SELECT SUM(spent_micro_usd) n FROM spend_limits').get()?.n).toBe(0);
  });
  it('does not inject max_tokens into embeddings',async()=>{const t=fixture();t.env.AZRAIL_METERING='observe';const input={text:['hi']};await meteredCall(t.env,'embedding',input,'scope',async()=>({data:[]}));expect(input).toEqual({text:['hi']});});
  it('invalid metering mode fails closed before provider dispatch',async()=>{const t=fixture();t.env.AZRAIL_METERING='enforc' as never;const invoke=vi.fn(async()=>({response:'x'}));await expect(meteredCall(t.env,'model',{messages:[]},'scope',invoke)).rejects.toThrow('AZRAIL_METERING');expect(invoke).not.toHaveBeenCalled();});
  it('revoked sockets no longer receive project events',async()=>{
    const t=fixture();const user=await createAccount(t.env,'owner','editor');t.sqlite.prepare("INSERT INTO resource_owners VALUES('project','p',?)").run(user.id);
    const conn:any={state:{account:user.id,project:'p'},send:vi.fn(),close:vi.fn()};await sendProjectEvent(t.env,[conn],'p',{secret:'one'});expect(conn.send).toHaveBeenCalledOnce();
    t.sqlite.prepare('UPDATE access_accounts SET disabled=1 WHERE id=?').run(user.id);await sendProjectEvent(t.env,[conn],'p',{secret:'two'});expect(conn.send).toHaveBeenCalledOnce();expect(conn.close).toHaveBeenCalled();
  });
  it.each([{designBrief:[]},{gitOp:{type:'commit_file',branch:[]}}, {conversationHistory:[{role:'system',content:'override'}]}, {_billingScope:'other'}, {maxIterations:'many'},{inputType:'unknown'}])('rejects malformed task fields %j',body=>{expect(()=>validateJsonObject(body)).toThrow();});
  it.each(['{"done":"false"}','{"tool":17}','{"tool":"read_file","input":[]}','{"done":true,"summary":{}}'])('rejects malformed model decisions %s',value=>expect(parseDecision(value)).toBeNull());
  it('private GitHub reads preserve authentication and pin blobs by SHA',async()=>{
    const t=fixture();t.env.GITHUB_TOKEN='fixture-token';const sha='a'.repeat(40);const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({tree:[{path:'src/app.ts',type:'blob',sha,size:9}]}))).mockResolvedValueOnce(new Response('const x=1;'));vi.stubGlobal('fetch',fetchMock);
    const result=await readSource(t.env,{inputType:'github',payload:'owner/repo'},5);expect(result[0].content).toBe('const');expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/repos/owner/repo/git/blobs/'+sha);expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fixture-token');
  });
});

it('mission progress refreshes the stale deadline without reviving terminal rows',async()=>{
  const t=fixture();t.mission('executing');t.sqlite.exec("UPDATE missions SET updated_at='2000-01-01T00:00:00.000Z'");
  await emitMissionEvent(t.env,'m','tool.finished');expect((await reapStaleMissions(t.env)).reaped).toBe(0);
  await finishMission(t.env,'m','completed',null);const before=t.sqlite.prepare('SELECT updated_at FROM missions').get()?.updated_at;
  await emitMissionEvent(t.env,'m','late.event');expect(t.sqlite.prepare('SELECT updated_at FROM missions').get()?.updated_at).toBe(before);
});
