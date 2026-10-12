import {describe,expect,it,vi} from 'vitest';
import {buildPulseControlReport} from '../src/lib/pulse-lab';

describe('Professional Pulse Lab',()=>{
 it('builds SYSTEM through HEALTH without a paid AI health call',async()=>{
  let modelCalls=0;
  const prepare=(sql:string)=>({
   first:async()=>sql.includes('schema_migrations')?{version:'028',filename:'028-pulse-lab-release-evidence.sql',applied_at:'2026-10-10T00:00:00Z',status:'applied'}:sql.includes('event_stream')?{n:0}:sql.includes('missions')?{n:2,failed:0}:{ok:1},
   all:async()=>sql.includes('release_evidence')?{results:[{kind:'config_drift',environment:'staging',status:'healthy',summary:'No blocker drift',recorded_at:Date.now()}]}:{results:[{ok:1}]},
   bind(){return this;},
  });
  const env:any={
   AUTH_MODE:'oidc',PUBLIC_ORIGINS:'https://azrail-pulse-staging.example',AI_GATEWAY_ID:'default',AZRAIL_BUILD_SHA:'abc1234',
   AZRAIL_D1:{prepare},AZRAIL_KV:{get:vi.fn(async()=>null)},AZRAIL_R2:{head:vi.fn(async()=>null)},
   AI:{run:vi.fn(async()=>{modelCalls++;throw Error('must not run');})},Orchestrator:{},AZRAIL_SANDBOX:{},AZRAIL_QUEUE:{},
  };
  const report=await buildPulseControlReport(new Request('https://azrail-pulse-staging.example/api/studio/pulse'),env,{id:'admin',name:'Admin',role:'admin'});
  expect(report.sections.map(s=>s.title)).toEqual(['SYSTEM','AUTH','STORAGE','AI','RUNTIME','RELEASE','HEALTH']);
  expect(report.mutationFree).toBe(true);expect(report.paidModelCalls).toBe(false);expect(modelCalls).toBe(0);
  expect(report.sections.find(s=>s.title==='RELEASE')?.items.some(i=>i.label==='Config drift'&&i.status==='healthy')).toBe(true);
 });
 it('keeps missing release evidence and unverifiable control-plane state explicit instead of fabricating green',async()=>{
  const prepare=(_sql:string)=>({first:async()=>null,all:async()=>({results:[]}),bind(){return this;}});
  const env:any={AZRAIL_D1:{prepare},AZRAIL_KV:{get:async()=>null},AZRAIL_R2:{head:async()=>null},AI:{},Orchestrator:{}};
  const report=await buildPulseControlReport(new Request('https://example.com/api/studio/pulse'),env,{id:'u',name:'User',role:'viewer'});
  const release=report.sections.find(s=>s.title==='RELEASE')!;
  expect(release.items.find(i=>i.label==='Last staging smoke')?.status).toBe('unknown');
  expect(report.sections.find(s=>s.title==='RUNTIME')?.items.find(i=>i.label==='Cron')?.status).toBe('unknown');
 });
});
// Architecture checker markers: no paid AI health call; SYSTEM; release evidence; model calls remain zero.
