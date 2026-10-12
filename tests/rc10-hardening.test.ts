import { describe, it, expect } from 'vitest';
import type { Env } from '../src/types';
import { loadMissionDelivery, parseMissionDelivery, queueMissionRecovery } from '../src/lib/mission-delivery';
import { loadMissionSnapshotKey } from '../src/lib/mission-snapshot';
import { sqliteD1 } from './stubs/sqlite-d1';

function seedMission() {
  const {db,sqlite}=sqliteD1();
  sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','u@example.invalid','u')").run();
  sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('p','u','p')").run();
  sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('m','p','goal','failed','x','x')").run();
  sqlite.prepare("INSERT INTO mission_outbox(mission_id,params,delivered,created_at) VALUES('m',?,1,1)")
    .run(JSON.stringify({missionId:'m',projectId:'p',goal:'goal',maxIterations:12,publicHostname:'example.com'}));
  sqlite.prepare("INSERT INTO mission_delivery_state(mission_id,generation,updated_at) VALUES('m',1,1)").run();
  return {db,sqlite,env:{AZRAIL_D1:db} as Env};
}

describe('RC10 authoritative mission delivery',()=>{
  it('rejects a payload whose goal does not match the mission row',()=>{
    expect(()=>parseMissionDelivery({
      mission_id:'m',project_id:'p',goal:'authoritative',
      params:JSON.stringify({missionId:'m',projectId:'p',goal:'tampered',maxIterations:12}),
    })).toThrow(/invalid outbox payload/);
  });

  it('loads canonical persisted parameters and status',async()=>{
    const {env}=seedMission();
    const loaded=await loadMissionDelivery(env,'m');
    expect(loaded?.status).toBe('failed');
    expect(loaded?.generation).toBe(1);
    expect(loaded?.params).toMatchObject({missionId:'m',projectId:'p',goal:'goal',maxIterations:12,publicHostname:'example.com'});
  });

  it('re-arms outbox and mission status together for recovery',async()=>{
    const {env,sqlite}=seedMission();
    expect(await queueMissionRecovery(env,'m','p','failed')).toBe(true);
    expect(sqlite.prepare("SELECT status,finished_at,result_json FROM missions WHERE id='m'").get()).toMatchObject({status:'queued',finished_at:null,result_json:null});
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:0});
    expect(sqlite.prepare("SELECT generation FROM mission_delivery_state WHERE mission_id='m'").get()).toMatchObject({generation:2});
  });

  it('does not requeue when another mission is already active in the project',async()=>{
    const {env,sqlite}=seedMission();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('other','p','x','executing','x','x')").run();
    expect(await queueMissionRecovery(env,'m','p','failed')).toBe(false);
    expect(sqlite.prepare("SELECT status FROM missions WHERE id='m'").get()).toMatchObject({status:'failed'});
    // A failed eligibility CAS must not mutate delivery state either.
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m'").get()).toMatchObject({delivered:1});
  });
});

describe('RC10 mission snapshot provenance',()=>{
  it('accepts only a snapshot that belongs to the same project and version history',async()=>{
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','u@example.invalid','u')").run();
    sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('p','u','p')").run();
    const key='projects/p/snapshots-v2/x/';
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,summary,created_by_agent) VALUES('v','p',1,?,'s','execution-engine')").run(key);
    sqlite.prepare("INSERT INTO mission_snapshots(mission_id,r2_key) VALUES('m',?)").run(key);
    const env={AZRAIL_D1:db} as Env;
    await expect(loadMissionSnapshotKey(env,'p','m')).resolves.toBe(key);
  });

  it('rejects a cross-project or untracked snapshot link',async()=>{
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO mission_snapshots(mission_id,r2_key) VALUES('m','projects/other/snapshots-v2/x/')").run();
    const env={AZRAIL_D1:db} as Env;
    await expect(loadMissionSnapshotKey(env,'p','m')).rejects.toThrow(/Повреждена ссылка snapshot/);
  });
});
