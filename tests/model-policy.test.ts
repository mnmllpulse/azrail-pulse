import { describe, it, expect, vi } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { runModel } from "../src/lib/model-router";
import { readModelPolicy, setModelPolicy, eligibleRegistry, policyModelCall, FREE_MODEL_SLUGS } from "../src/lib/model-policy";
import { findModel } from "../src/lib/model-registry";
import { readLiveCatalog } from "../src/lib/model-catalog";
import type { Env } from "../src/types";

function fixture() {
  const {db,sqlite} = sqliteD1();
  const run = vi.fn(async () => ({response:"ok",usage:{prompt_tokens:2,completion_tokens:1}}));
  const env = {AZRAIL_D1:db, AI:{run}, AI_GATEWAY_ID:"configured",
    AZRAIL_KV:{get:async()=>null,put:async()=>{},delete:async()=>{}}} as unknown as Env;
  return {env,sqlite,run};
}
describe("server model policy", () => {
  it("defaults OFF even with a configured gateway", async()=>{
    const {env,run}=fixture();
    expect((await readModelPolicy(env)).allowThirdPartyModels).toBe(false);
    await expect(runModel(env,"chat",{messages:[]},{preferredModel:"openai/gpt-5.5"})).rejects.toThrow();
    await expect(runModel(env,"chat",{messages:[]},{preferredModel:"@cf/moonshotai/kimi-k2.7-code"})).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
  });
  it("calls a free hosted model directly, without gateway options", async()=>{
    const {env,run}=fixture();
    await runModel(env,"chat",{messages:[]},{preferredModel:"@cf/meta/llama-3.2-3b-instruct"});
    expect(run.mock.calls[0]).toHaveLength(2);
  });
  it("free auto-routing has coding, planning and chat candidates", async()=>{
    const {env,run}=fixture();
    for(const intent of ["generate_code","plan","chat"]){await runModel(env,intent,{messages:[]});}
    for(const call of run.mock.calls) expect(FREE_MODEL_SLUGS.has(String((call as unknown[])[0]))).toBe(true);
  });
  it("schema failure fails closed and does not enable external inference", async()=>{
    const {env,sqlite}=fixture();sqlite.exec("DROP TABLE model_routing_settings");
    const policy=await readModelPolicy(env);expect(policy.ready).toBe(false);
    expect((await eligibleRegistry(env)).every(m=>FREE_MODEL_SLUGS.has(m.slug))).toBe(true);
  });
  it("cannot enable a force-free deployment or a missing/zero budget", async()=>{
    const {env}=fixture();await expect(setModelPolicy(env,true,0)).rejects.toThrow();
    env.AZRAIL_FORCE_FREE="true";await expect(setModelPolicy(env,true,10)).rejects.toThrow();
    env.AZRAIL_FORCE_FREE="false";env.AI_GATEWAY_ID=undefined;await expect(setModelPolicy(env,true,10)).rejects.toThrow();
  });
  it("paid inference needs a fresh price even after ON", async()=>{
    const {env,run,sqlite}=fixture();await setModelPolicy(env,true,1);
    await expect(runModel(env,"chat",{}, {preferredModel:"openai/gpt-5.5"})).rejects.toThrow();
    sqlite.prepare("INSERT INTO model_prices VALUES(?,?,?,?)").run("openai/gpt-5.5",1e6,2e6,1);
    await expect(runModel(env,"chat",{}, {preferredModel:"openai/gpt-5.5"})).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
  });
  it("ON records spend and OFF blocks the next nested model call", async()=>{
    const {env,run,sqlite}=fixture();await setModelPolicy(env,true,1);
    sqlite.prepare("INSERT INTO model_prices VALUES(?,?,?,?)").run("openai/gpt-5.5",1e6,2e6,Date.now());
    await runModel(env,"chat",{max_tokens:4},{preferredModel:"openai/gpt-5.5"});
    expect((run.mock.calls[0] as unknown[])[2]).toEqual({gateway:{id:"configured"}});
    await setModelPolicy(env,false,1);
    await expect(runModel(env,"chat",{}, {preferredModel:"openai/gpt-5.5"})).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(1);
    const spent=sqlite.prepare("SELECT spent_micro_usd FROM spend_limits").get()?.spent_micro_usd;
    await setModelPolicy(env,true,1);
    expect(sqlite.prepare("SELECT spent_micro_usd FROM spend_limits").get()?.spent_micro_usd).toBe(spent);
  });
  it("concurrent paid calls cannot each reserve the same remaining budget", async()=>{
    const {env,run,sqlite}=fixture();await setModelPolicy(env,true,0.0001);
    sqlite.prepare("INSERT INTO model_prices VALUES(?,?,?,?)").run("openai/gpt-5.5",1e6,2e6,Date.now());
    // Each request reserves > half of 100 micro-USD. Provider usage is unknown,
    // so no reservation is released to the next request.
    run.mockImplementation(async()=>({response:"ok"}) as never);
    const model=findModel("openai/gpt-5.5")!;
    const results=await Promise.allSettled([1,2].map(i=>policyModelCall(env,model,{max_tokens:35},`project:${i}`)));
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("a broken validator stops without accepting the result or spending on fallback", async()=>{
    const {env,run}=fixture();
    await expect(runModel(env,"chat",{}, {validate:()=>{throw Error("validator bug");}})).rejects.toThrow("Проверка ответа");
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("live catalog reports returned counts without granting new models", async()=>{
    const {env}=fixture();env.AI.models=vi.fn(async()=>[{name:"external/new",task:{name:"Text Generation"}}]) as never;
    const c=await readLiveCatalog(env);expect(c.returnedCount).toBe(1);
    expect(c.models[0].reviewed).toBe(false);expect(c.models[0].freeAllowlisted).toBe(false);
  });
});
