import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";
import { claimMissionDelivery, markMissionDeliveryScheduled } from "../src/lib/mission-delivery";
import { withProjectLock } from "../src/lib/project-control";
import { publishWorkspace, workspacePrefix } from "../src/lib/workspace-head";
import { previewR2GarbageCollection } from "../src/lib/r2-gc";
import { previewRetention } from "../src/lib/retention-preview";
import { parseDecision, renderHistory } from "../src/core/execution-engine";

function missionEnv() {
  const {db,sqlite}=sqliteD1();
  sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('m','p','g','queued','x','x')").run();
  sqlite.prepare("INSERT INTO mission_outbox(mission_id,params,delivered,created_at) VALUES('m',?,0,1)")
    .run(JSON.stringify({missionId:'m',projectId:'p',goal:'g',maxIterations:8}));
  sqlite.prepare("INSERT INTO mission_delivery_state(mission_id,generation,updated_at) VALUES('m',1,1)").run();
  return {env:{AZRAIL_D1:db} as unknown as Env,sqlite};
}

describe("RC15 1/8 delivery lease",()=>{
  it("allows only one live claim for the same generation",async()=>{
    const {env}=missionEnv();
    const first=await claimMissionDelivery(env,'m',1,'dispatcher-a',1000);
    const second=await claimMissionDelivery(env,'m',1,'dispatcher-b',1001);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });
});

describe("RC15 2/8 concurrent dispatcher recovery",()=>{
  it("reclaims an expired lease but rejects acknowledgement from the stale lease",async()=>{
    const {env,sqlite}=missionEnv();
    const stale=await claimMissionDelivery(env,'m',1,'a',1000);
    expect(stale).not.toBeNull();
    const current=await claimMissionDelivery(env,'m',1,'b',1000+45_001);
    expect(current).not.toBeNull();
    expect(await markMissionDeliveryScheduled(env,'m',1,stale!.leaseId)).toBe(false);
    expect(await markMissionDeliveryScheduled(env,'m',1,current!.leaseId)).toBe(true);
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:1});
  });
});

describe("RC15 3/8 immutable workspace publication",()=>{
  it("records immutable provenance and refuses an unregistered versioned head",async()=>{
    const {db,sqlite}=sqliteD1();
    const objects=new Map<string,Uint8Array>();
    const r2={
      async put(key:string,value:Uint8Array|string){objects.set(key,typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value));},
      async delete(keys:string|string[]){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);},
      async list(){return {objects:[],truncated:false};}, async get(){return null;},
    };
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    const prefix=await withProjectLock(env,'p','writer',lease=>publishWorkspace(env,'p',[{path:'a.txt',content:'alpha'}],lease!));
    const publication=sqlite.prepare("SELECT project_id,manifest_hash,file_count,total_bytes FROM workspace_publications WHERE prefix=?").get(prefix) as any;
    expect(publication.project_id).toBe('p');
    expect(publication.manifest_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(publication.file_count).toBe(1);
    expect(publication.total_bytes).toBe(5);
    sqlite.prepare("UPDATE workspace_heads SET prefix='projects/p/workspace-versions/corrupt/' WHERE project_id='p'").run();
    await expect(workspacePrefix(env,'p')).rejects.toThrow(/publication provenance/i);
  });
});

describe("RC15 4/8 R2 legacy reference completeness",()=>{
  it("protects known legacy project namespaces even when old provenance rows are missing",async()=>{
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','rc15@example.invalid','RC15')").run();
    sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('p','u','P')").run();
    const old=new Date(Date.now()-10*86400000);
    const r2={async list(){return {objects:[
      {key:'projects/p/versions/legacy.md',size:1,uploaded:old},
      {key:'projects/p/code/legacy/a.ts',size:1,uploaded:old},
      {key:'projects/p/random-orphan.bin',size:1,uploaded:old},
    ],truncated:false};}};
    const preview=await previewR2GarbageCollection({AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env,{scope:'projects',minAgeHours:24,maxObjects:20});
    expect(preview.candidates.map(c=>c.key)).toEqual(['projects/p/random-orphan.bin']);
  });
});

describe("RC15 5/8 retention invariants",()=>{
  it("never emits cross-project or cross-account R2 keys as deletion candidates",async()=>{
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','rc15-ret@example.invalid','RC15')").run();
    sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('p','u','P')").run();
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,created_at) VALUES('v1','p',1,'evil/foreign','2020-01-01 00:00:00')").run();
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,created_at) VALUES('v2','p',2,'projects/p/v2','2021-01-01 00:00:00')").run();
    sqlite.prepare("INSERT INTO studio_artifacts(id,account_id,name,mime,r2_key,bytes,created_at) VALUES('a1','acct','x','x','studio/other/x',1,1)").run();
    sqlite.prepare("INSERT INTO studio_artifacts(id,account_id,name,mime,r2_key,bytes,created_at) VALUES('a2','acct','y','x','studio/acct/y',1,2)").run();
    const preview=await previewRetention({AZRAIL_D1:db} as unknown as Env,{olderThanDays:30,keepNewest:1,now:Date.parse('2026-01-01T00:00:00Z')});
    expect(preview.versionCandidates).toEqual([]);
    expect(preview.studioCandidates).toEqual([]);
    expect(preview.unsafeReferencesSkipped).toBe(2);
  });
});

describe("RC15 6/8 Studio streaming",()=>{
  it("streams generic artifacts through a bounded TransformStream instead of buffering 12 MiB",()=>{
    const source=readFileSync(new URL('../src/unified/studios.ts',import.meta.url),'utf8');
    expect(source).toContain('saveArtifactStream');
    expect(source).toContain('request.body.pipeThrough(limiter)');
    expect(source).not.toContain("const bytes=await readBoundedBody(request,12*1024*1024)");
  });
});

describe("RC15 7/8 Execution Engine decomposition",()=>{
  it("preserves the public protocol while moving pure parsing/history out of the monolith",()=>{
    const engine=readFileSync(new URL('../src/core/execution-engine.ts',import.meta.url),'utf8');
    const protocol=readFileSync(new URL('../src/core/execution-protocol.ts',import.meta.url),'utf8');
    expect(engine).toContain('from "./execution-protocol"');
    expect(protocol).toContain('export function parseDecision');
    expect(parseDecision('{"done":true,"summary":"ok"}')?.done).toBe(true);
    expect(renderHistory([])).toBe('(шагов ещё не было)');
  });
});

describe("RC15 8/8 migration/packaging contract",()=>{
  it("migration 015 is idempotent and preserves a legacy versioned head",()=>{
    const {sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO workspace_heads(project_id,prefix) VALUES('p','projects/p/workspace-versions/legacy/')").run();
    const sql=readFileSync(new URL('../migrations/015-delivery-lease-publication-contract.sql',import.meta.url),'utf8');
    sqlite.exec(sql); sqlite.exec(sql);
    expect(sqlite.prepare("SELECT manifest_hash FROM workspace_publications WHERE prefix='projects/p/workspace-versions/legacy/'").get())
      .toMatchObject({manifest_hash:'legacy-unverified'});
    expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mission_delivery_leases'").get()).toBeTruthy();
  });
});
