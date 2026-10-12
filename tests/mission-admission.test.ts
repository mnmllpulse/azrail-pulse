import { it, expect } from "vitest";
import { claimMission, finishAdmission } from "../src/lib/mission-admission";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";
const env=()=>({AZRAIL_D1:sqliteD1().db}) as Env;
it("only one concurrent request obtains admission",async()=>{
  const e=env();const all=await Promise.all(Array.from({length:20},()=>claimMission(e,"key","body")));
  expect(all.filter(a=>a.kind==="claimed")).toHaveLength(1);
  expect(all.filter(a=>a.kind==="pending")).toHaveLength(19);
});
it("same key with different payload conflicts",async()=>{
  const e=env();await claimMission(e,"key","body");expect((await claimMission(e,"key","other")).kind).toBe("conflict");
});
it("completed response is replayed exactly",async()=>{
  const e=env();const a=await claimMission(e,"key","body");if(a.kind!=="claimed")throw Error();
  await finishAdmission(e,"key",a.claim,new Response('{"missionId":"m"}',{status:202}));
  expect(await claimMission(e,"key","body")).toEqual({kind:"replay",body:'{"missionId":"m"}',status:202});
});
it("invalid request releases claim; ambiguous server failure does not",async()=>{
  const e=env();const a=await claimMission(e,"key","body");if(a.kind!=="claimed")throw Error();
  await finishAdmission(e,"key",a.claim,new Response("bad",{status:400}));
  const b=await claimMission(e,"key","body");expect(b.kind).toBe("claimed");if(b.kind!=="claimed")throw Error();
  await finishAdmission(e,"key",b.claim,new Response("failed",{status:500}));
  expect((await claimMission(e,"key","body")).kind).toBe("pending");
});
