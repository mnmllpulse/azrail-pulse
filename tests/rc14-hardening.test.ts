import { describe, expect, it } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";
import { markMissionDeliveryScheduled, queueMissionRecovery } from "../src/lib/mission-delivery";
import { withProjectLock } from "../src/lib/project-control";
import { publishWorkspace } from "../src/lib/workspace-head";
import { previewR2GarbageCollection } from "../src/lib/r2-gc";
import { previewRetention } from "../src/lib/retention-preview";
import { readFileSync } from "node:fs";

function seedMission() {
  const {db,sqlite}=sqliteD1();
  sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('m','p','g','failed','x','x')").run();
  sqlite.prepare("INSERT INTO mission_outbox(mission_id,params,delivered,created_at) VALUES('m',?,1,1)")
    .run(JSON.stringify({missionId:'m',projectId:'p',goal:'g',maxIterations:12}));
  sqlite.prepare("INSERT INTO mission_delivery_state(mission_id,generation,updated_at) VALUES('m',1,1)").run();
  return {db,sqlite,env:{AZRAIL_D1:db} as unknown as Env};
}

describe("RC14 delivery generation fencing",()=>{
  it("prevents an old scheduled generation from marking a recovered outbox delivered",async()=>{
    const {env,sqlite}=seedMission();
    expect(await queueMissionRecovery(env,'m','p','failed')).toBe(true);
    expect(sqlite.prepare("SELECT generation FROM mission_delivery_state WHERE mission_id='m'").get()).toMatchObject({generation:2});
    expect(await markMissionDeliveryScheduled(env,'m',1)).toBe(false);
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:0});
    expect(await markMissionDeliveryScheduled(env,'m',2)).toBe(true);
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:1});
  });

  it("can acknowledge the current delivery generation after the task already moved to executing",async()=>{
    const {env,sqlite}=seedMission();
    sqlite.prepare("UPDATE missions SET status='executing' WHERE id='m'").run();
    expect(await markMissionDeliveryScheduled(env,'m',1)).toBe(true);
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:1});
  });

  it("does not partially bump delivery generation when another mission blocks recovery",async()=>{
    const {env,sqlite}=seedMission();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('other','p','g2','executing','x','x')").run();
    expect(await queueMissionRecovery(env,'m','p','failed')).toBe(false);
    expect(sqlite.prepare("SELECT generation FROM mission_delivery_state WHERE mission_id='m'").get()).toMatchObject({generation:1});
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:1});
    expect(sqlite.prepare("SELECT status FROM missions WHERE id='m'").get()).toMatchObject({status:'failed'});
  });

  it("does not reset the outbox if durable delivery state is missing",async()=>{
    const {env,sqlite}=seedMission();
    sqlite.prepare("DELETE FROM mission_delivery_state WHERE mission_id='m'").run();
    expect(await queueMissionRecovery(env,'m','p','failed')).toBe(false);
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:1});
    expect(sqlite.prepare("SELECT status FROM missions WHERE id='m'").get()).toMatchObject({status:'failed'});
  });
});

describe("RC14 workspace writer contract",()=>{
  it("refuses to publish after the project fencing lease is lost",async()=>{
    const {db,sqlite}=sqliteD1();
    const objects=new Map<string,Uint8Array|string>();
    let revokeOnPut=true;
    const r2={
      async put(key:string,value:Uint8Array|string){
        objects.set(key,value);
        if(revokeOnPut){
          revokeOnPut=false;
          sqlite.prepare("DELETE FROM project_lock_leases WHERE project_id='p'").run();
          sqlite.prepare("DELETE FROM operation_locks WHERE project_id='p'").run();
        }
      },
      async delete(keys:string|string[]){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);},
      async list(){return {objects:[],truncated:false};},
      async get(){return null;},
    };
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    await expect(withProjectLock(env,'p','m',async lease=>{
      await publishWorkspace(env,'p',[{path:'a.txt',content:'x'}],lease!);
    })).rejects.toThrow(/устарел/i);
    expect(sqlite.prepare("SELECT prefix FROM workspace_heads WHERE project_id='p'").get()).toBeUndefined();
    expect(objects.size).toBe(0);
  });
});

describe("RC14 R2 GC preview fairness",()=>{
  it("shares a bounded all-scope scan across prefixes instead of starving later namespaces",async()=>{
    const {db}=sqliteD1();
    const old=new Date(Date.now()-10*24*60*60_000);
    const r2={
      async list(opts:{prefix:string;limit?:number;cursor?:string}){
        const n=Math.max(1,opts.limit??1);
        if(opts.prefix==='projects/')return {objects:Array.from({length:n},(_,i)=>({key:`projects/orphan-${opts.cursor??'0'}-${i}`,size:1,uploaded:old})),truncated:true,cursor:`p-${opts.cursor??'0'}`};
        return {objects:[{key:`${opts.prefix}orphan`,size:1,uploaded:old}],truncated:false};
      },
    };
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    const preview=await previewR2GarbageCollection(env,{scope:'all',minAgeHours:24,maxObjects:4});
    expect(preview.candidates.map(c=>c.key)).toEqual(expect.arrayContaining(['backups/orphan','studio/orphan','uploads/orphan']));
    expect(preview.truncated).toBe(true);
    expect(preview.safeToApply).toBe(false);
  });
});

describe("RC14 retention and Studio memory invariants",()=>{
  it("ranks retention independently per owner and protects newest records",async()=>{
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','rc14@example.invalid','RC14')").run();
    sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('a','u','A')").run();
    sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('b','u','B')").run();
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,created_at) VALUES('a1','a',1,'a1','2020-01-01 00:00:00')").run();
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,created_at) VALUES('a2','a',2,'a2','2021-01-01 00:00:00')").run();
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,created_at) VALUES('b1','b',1,'b1','2019-01-01 00:00:00')").run();
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,created_at) VALUES('b2','b',2,'b2','2021-01-01 00:00:00')").run();
    const env={AZRAIL_D1:db} as unknown as Env;
    const p=await previewRetention(env,{olderThanDays:30,keepNewest:1,now:Date.parse('2026-01-01T00:00:00Z')});
    expect(p.versionCandidates.map(v=>v.id).sort()).toEqual(['a1','b1']);
    expect(p.versionCandidates.map(v=>v.id)).not.toContain('a2');
    expect(p.versionCandidates.map(v=>v.id)).not.toContain('b2');
  });

  it("does not expand voice bytes into a multi-million-element JavaScript array",()=>{
    const studios=readFileSync(new URL('../src/unified/studios.ts',import.meta.url),'utf8');
    expect(studios).not.toContain('audio:[...bytes]');
    expect(studios).toContain("env.AI.run('@cf/openai/whisper',audio as never)");
  });
});
