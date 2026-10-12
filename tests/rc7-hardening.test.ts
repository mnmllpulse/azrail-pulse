import { withProjectLock } from '../src/lib/project-control';
import { describe, it, expect, vi } from 'vitest';
import type { Env } from '../src/types';
import { publishWorkspace } from '../src/lib/workspace-head';
import { backupProject } from '../src/lib/backups';
import { snapshotWorkspace } from '../src/core/mission-guard';
import { runModel, ModelOutcomeUncertainError } from '../src/lib/model-router';
import { meteredCall } from '../src/lib/billing';
import { sqliteD1 } from './stubs/sqlite-d1';

const bytes=(s:string)=>new TextEncoder().encode(s);

describe('RC7 publish uncertainty',()=>{
  it('preserves a workspace tree when the D1 head committed but its response was lost',async()=>{
    const objects=new Map<string,Uint8Array>();
    const {db,sqlite}=sqliteD1();
    // The head-flip batch COMMITS in SQLite, then the response is lost.
    const d1={prepare:db.prepare.bind(db),batch:async(stmts:any[])=>{await db.batch(stmts);throw Error('response lost');}};
    const env={AZRAIL_D1:d1,AZRAIL_R2:{
      put:async(key:string,value:unknown)=>{objects.set(key,typeof value==='string'?bytes(value):value as Uint8Array);},
      delete:async(key:string)=>{objects.delete(key);},
    }} as unknown as Env;
    const prefix=await withProjectLock(env,'p1','writer',lease=>publishWorkspace(env,'p1',[{path:'a.txt',content:'a'}],lease!));
    const head=String((sqlite.prepare("SELECT prefix FROM workspace_heads WHERE project_id='p1'").get() as {prefix:string}).prefix);
    expect(prefix).toBe(head);
    expect(objects.has(`${prefix}a.txt`)).toBe(true);
  });
});

describe('RC7 staged R2 cleanup',()=>{
  it('removes a partial backup when copying fails before publication',async()=>{
    const deleted:string[]=[];
    const {db}=sqliteD1();
    let gets=0;
    const env={AZRAIL_D1:db,AZRAIL_R2:{
      list:async()=>({objects:[{key:'projects/p1/workspace/a.txt',size:1},{key:'projects/p1/workspace/b.txt',size:1}],truncated:false}),
      get:async()=>{gets++;if(gets===2)throw Error('R2 read failed');return {arrayBuffer:async()=>bytes('a').buffer};},
      put:async()=>{},
      delete:async(key:string)=>{deleted.push(key);},
    }} as unknown as Env;
    await expect(backupProject(env,'p1')).rejects.toThrow('R2 read failed');
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain('backups/p1/');
  });

  it('removes a partial snapshot when copying fails before a version row exists',async()=>{
    const deleted:string[]=[];let gets=0;
    const env={AZRAIL_D1:{prepare:(sql:string)=>({bind(){return this;},async first(){return sql.startsWith('SELECT prefix')?null:null;}})},AZRAIL_R2:{
      list:async()=>({objects:[{key:'projects/p1/workspace/a.txt',size:1},{key:'projects/p1/workspace/b.txt',size:1}],truncated:false}),
      get:async()=>{gets++;if(gets===2)throw Error('source disappeared');return {arrayBuffer:async()=>bytes('a').buffer};},
      put:async()=>{},delete:async(key:string)=>{deleted.push(key);},
    }} as unknown as Env;
    await expect(snapshotWorkspace(env,'p1','test')).resolves.toBeNull();
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain('/snapshots-v2/');
  });
});

describe('RC7 model timeout semantics',()=>{
  it('does not retry a provider call whose timeout leaves the outcome uncertain',async()=>{
    vi.useFakeTimers();
    try{
      const run=vi.fn(()=>new Promise<never>(()=>{}));
      const env={
        AI:{run},
        AZRAIL_D1:{prepare:()=>({first:async()=>{throw Error('no policy db');}})},
      } as unknown as Env;
      const pending=runModel(env,'answer',{prompt:'hello'},{preferredModel:'@cf/meta/llama-3.2-3b-instruct'});
      // Attach the rejection handler before advancing fake timers, otherwise the rejection is reported as unhandled.
      const settled=expect(pending).rejects.toBeInstanceOf(ModelOutcomeUncertainError);
      await vi.advanceTimersByTimeAsync(60_001);
      await settled;
      expect(run).toHaveBeenCalledTimes(1);
    } finally {vi.useRealTimers();}
  });

  it('marks a metered provider timeout uncertain inside the accounting boundary',async()=>{
    vi.useFakeTimers();
    try{
      const {db,sqlite}=sqliteD1();
      sqlite.exec("INSERT INTO model_prices(model,input_micro_usd_per_million,output_micro_usd_per_million,updated_at) VALUES('m',0,0,1)");
      const env={AZRAIL_D1:db,AZRAIL_METERING:'observe'} as Env;
      const pending=meteredCall(env,'m',{prompt:'x'},'scope',()=>new Promise<never>(()=>{}),'scope',{invokeTimeoutMs:10});
      const settled=expect(pending).rejects.toThrow(/timeout/i);
      await vi.advanceTimersByTimeAsync(11);
      await settled;
      expect(sqlite.prepare("SELECT status FROM model_calls").get()?.status).toBe('uncertain');
    } finally {vi.useRealTimers();}
  });
});
