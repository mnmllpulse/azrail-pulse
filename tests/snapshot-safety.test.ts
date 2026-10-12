import { sqliteD1 } from "./stubs/sqlite-d1";
import { readFile } from "../src/lib/workspace";
import { describe, it, expect, vi } from "vitest";
import { rollbackWorkspace, snapshotWorkspace } from "../src/core/mission-guard";
import type { Env } from "../src/types";
const key = "projects/p/snapshots/s/";
function setup(count = 1) {
  const files = new Map<string,string>();
  for(let i=0;i<count;i++) files.set(key+`f${i}.ts`, "old");
  files.set("projects/p/workspace/new.ts","new");
  const deleted:string[]=[]; const put=vi.fn(async(k:string,v:string|Uint8Array)=>{files.set(k,typeof v==='string'?v:new TextDecoder().decode(v));});
  const r2={
    async list({prefix,cursor}:{prefix:string,cursor?:string}) {
      const all=[...files].filter(([k])=>k.startsWith(prefix)).map(([key,v])=>({key,size:v.length}));
      const start=Number(cursor||0), end=start+100;
      return {objects:all.slice(start,end), truncated:end<all.length, cursor:String(end)};
    },
    async get(k:string) {return files.has(k)?{text:async()=>files.get(k)!,arrayBuffer:async()=>new TextEncoder().encode(files.get(k)!).buffer}:null;},
    put,
    async delete(k:string){deleted.push(k);files.delete(k);},
  };
  return {env:{AZRAIL_R2:r2,AZRAIL_D1:sqliteD1().db} as unknown as Env,files,deleted,r2,put};
}
describe("snapshot data safety",()=>{
  it("restores all pages before removing newly created files",async()=>{
    const t=setup(310);expect(await rollbackWorkspace(t.env,"p",key)).toEqual({restored:310,removed:1});
    expect((await readFile(t.env,"p","f309.ts"))?.content).toBe("old");
    expect(await readFile(t.env,"p","new.ts")).toBeNull();
  });
  it("empty snapshot cannot delete workspace",async()=>{
    const t=setup(0);expect(await rollbackWorkspace(t.env,"p",key)).toBeNull();expect(t.deleted).toEqual([]);
  });
  it("missing snapshot object cannot delete workspace",async()=>{
    const t=setup();vi.spyOn(t.r2,"get").mockResolvedValue(null);
    expect(await rollbackWorkspace(t.env,"p",key)).toBeNull();expect(t.deleted).toEqual([]);expect(t.put).not.toHaveBeenCalled();
  });
  it("failed restore does not delete current files",async()=>{
    const t=setup();t.put.mockRejectedValue(new Error("storage down"));
    expect(await rollbackWorkspace(t.env,"p",key)).toBeNull();expect(t.deleted).toEqual([]);
  });
  it("cross-project snapshot is refused",async()=>{
    const t=setup();expect(await rollbackWorkspace(t.env,"other",key)).toBeNull();expect(t.deleted).toEqual([]);
  });
  it("incomplete snapshot is not registered as restorable",async()=>{
    const t=setup();vi.spyOn(t.r2,"get").mockResolvedValue(null);
    expect(await snapshotWorkspace(t.env,"p","test")).toBeNull();
  });
});
