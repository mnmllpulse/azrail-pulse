import { describe, expect, it } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";
import { assertProjectLease, currentProjectLease, withProjectLock } from "../src/lib/project-control";
import { checkpointTool, loadCheckpoints, quarantineStaleRunningToolReceipts, UncertainToolError } from "../src/lib/checkpoints";
import { reapStaleMissions } from "../src/lib/mission-state";

function fixture() {
  const {db,sqlite}=sqliteD1();
  return {env:{AZRAIL_D1:db} as unknown as Env,sqlite};
}

describe("RC13 project writer fencing",()=>{
  it("increments the fence generation across acquisitions",async()=>{
    const {env}=fixture();
    let first=0,second=0;
    await withProjectLock(env,"p","writer-1",async lease=>{first=lease!.fenceToken;await assertProjectLease(env,lease!);});
    await withProjectLock(env,"p","writer-2",async lease=>{second=lease!.fenceToken;await assertProjectLease(env,lease!);});
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
  });

  it("an old same-owner finally cannot delete a newer recovered lease",async()=>{
    const {env,sqlite}=fixture();
    let releaseOld!:()=>void;let enteredOld!:()=>void;
    const oldWait=new Promise<void>(r=>releaseOld=r),oldEntered=new Promise<void>(r=>enteredOld=r);
    let oldLease:any;
    const old=withProjectLock(env,"p","mission-1",async lease=>{oldLease=lease;enteredOld();await oldWait;return "old";});
    await oldEntered;

    // Simulate the reaper proving the old worker stale and removing its lease.
    sqlite.prepare("DELETE FROM project_lock_leases WHERE project_id='p'").run();
    sqlite.prepare("DELETE FROM operation_locks WHERE project_id='p'").run();

    let releaseNew!:()=>void;let enteredNew!:()=>void;
    const newWait=new Promise<void>(r=>releaseNew=r),newEntered=new Promise<void>(r=>enteredNew=r);
    let newLease:any;
    const newer=withProjectLock(env,"p","mission-1",async lease=>{newLease=lease;enteredNew();await newWait;return "new";});
    await newEntered;
    expect(newLease.fenceToken).toBeGreaterThan(oldLease.fenceToken);
    await expect(assertProjectLease(env,oldLease)).rejects.toThrow(/устарел/i);

    // Old finally runs after the new same-owner lease exists.
    releaseOld();await old;
    expect((await currentProjectLease(env,"p"))?.leaseId).toBe(newLease.leaseId);
    expect(sqlite.prepare("SELECT owner FROM operation_locks WHERE project_id='p'").get()).toMatchObject({owner:"mission-1"});

    releaseNew();await newer;
    expect(await currentProjectLease(env,"p")).toBeNull();
  });
});

describe("RC13 stale tool receipt recovery",()=>{
  it("quarantines abandoned running pairs instead of retrying them",async()=>{
    const {env,sqlite}=fixture();
    sqlite.prepare("INSERT INTO mission_checkpoints(mission_id,step,tool,input_json,status,updated_at) VALUES('m',0,'write_file','{}','running',0)").run();
    sqlite.prepare("INSERT INTO mission_tool_receipts(mission_id,step,attempt_id,tool,input_json,status,started_at,updated_at) VALUES('m',0,'a','write_file','{}','running',0,0)").run();
    const q=await quarantineStaleRunningToolReceipts(env,2*60*60_000,60*60_000);
    expect(q).toMatchObject({quarantined:1,attempts:["a"]});
    const point=(await loadCheckpoints(env,"m"))[0];
    expect(point.status).toBe("uncertain");
    expect(point.receipt_status).toBe("uncertain");
  });

  it("never reports success if a running receipt was quarantined during the effect",async()=>{
    const {env,sqlite}=fixture();
    await expect(checkpointTool(env,"m",0,"write_file",{},async()=>{
      sqlite.prepare("UPDATE mission_checkpoints SET updated_at=0 WHERE mission_id='m' AND step=0").run();
      sqlite.prepare("UPDATE mission_tool_receipts SET updated_at=0 WHERE mission_id='m' AND step=0").run();
      await quarantineStaleRunningToolReceipts(env,2*60*60_000,60*60_000);
      return {ok:true};
    },true,"attempt-race")).rejects.toBeInstanceOf(UncertainToolError);
    const point=(await loadCheckpoints(env,"m"))[0];
    expect(point.status).toBe("uncertain");
    expect(point.receipt_status).toBe("uncertain");
  });
});


describe("RC13 reaper/recovery fencing race",()=>{
  it("does not delete a freshly reacquired same-mission lease",async()=>{
    const {env,sqlite}=fixture();
    const now=Date.now(),old=new Date(now-2*60*60_000).toISOString();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('m','p','g','executing',?,?)").run(old,old);
    sqlite.prepare("INSERT INTO operation_locks(project_id,owner,started_at) VALUES('p','m',?)").run(now-2*60*60_000);
    const db=env.AZRAIL_D1,original=db.batch.bind(db);let first=true;
    (env.AZRAIL_D1 as unknown as {batch:typeof db.batch}).batch=async(stmts)=>{
      if(first){
        first=false;
        // Recovery wins after stale status CAS but before the reaper cleans locks.
        sqlite.prepare("UPDATE missions SET status='queued',updated_at=? WHERE id='m'").run(new Date(now).toISOString());
        sqlite.prepare("DELETE FROM operation_locks WHERE project_id='p'").run();
        sqlite.prepare("INSERT INTO project_lock_counters(project_id,generation) VALUES('p',2) ON CONFLICT(project_id) DO UPDATE SET generation=2").run();
        sqlite.prepare("INSERT OR REPLACE INTO project_lock_leases(project_id,owner,lease_id,fence_token,started_at) VALUES('p','m','new',2,?)").run(now);
        sqlite.prepare("INSERT INTO operation_locks(project_id,owner,started_at) VALUES('p','m',?)").run(now);
      }
      return original(stmts);
    };
    expect((await reapStaleMissions(env,now)).ids).toEqual(['m']);
    expect(sqlite.prepare("SELECT lease_id FROM project_lock_leases WHERE project_id='p'").get()).toMatchObject({lease_id:'new'});
    expect(sqlite.prepare("SELECT owner FROM operation_locks WHERE project_id='p'").get()).toMatchObject({owner:'m'});
  });
});
