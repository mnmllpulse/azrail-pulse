import { it, expect } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { createMission } from "../src/lib/mission-concurrency";
import type { Env } from "../src/types";
it("parallel missions in one project have only one winner",async()=>{
  const {db,sqlite}=sqliteD1();const env={AZRAIL_D1:db} as Env;
  const results=await Promise.all(Array.from({length:10},(_,i)=>createMission(env,`m${i}`,"p","goal")));
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(await createMission(env,"other","other-project","goal")).toBe(true);
  sqlite.exec("UPDATE missions SET status='completed' WHERE project_id='p'");
  expect(await createMission(env,"next","p","goal")).toBe(true);
});
