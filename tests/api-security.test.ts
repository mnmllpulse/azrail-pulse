import { describe, it, expect, vi } from "vitest";
vi.mock("../src/core/azrail-sandbox", () => ({ Sandbox: class {} }));
import worker from "../src/index";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";
const context = { waitUntil: vi.fn() } as unknown as ExecutionContext;
const env = () => ({AZRAIL_TOKEN:"secret", AZRAIL_D1:sqliteD1().db}) as Env;
function request(path:string, method = "GET", body?:string, auth=true) {
  return new Request(`https://test${path}`, { method, body, headers: auth ? {Authorization:"Bearer secret"} : {} });
}
describe("Worker HTTP security boundary", () => {
  it("blocks direct SDK route without authentication", async () => {
    expect((await worker.fetch(request("/agents/orchestrator/default", "GET", undefined, false),env(),context)).status).toBe(404);
  });
  it("protects unknown future API routes by default", async () => {
    expect((await worker.fetch(request("/api/future", "GET", undefined, false),env(),context)).status).toBe(401);
  });
  it("does not reveal health details to anonymous callers", async () => {
    expect((await worker.fetch(request("/health", "GET", undefined, false),env(),context)).status).toBe(401);
  });
  it.each(["null", "[]", "{", '{"goal":1}', '{"attachments":[null]}'])("bad JSON shape gets 400: %s", async body => {
    const response = await worker.fetch(request("/api/mission", "POST", body),env(),context);
    expect(response.status).toBe(400);
  });
  it("oversized JSON without Content-Length gets 413", async () => {
    const response = await worker.fetch(request("/api/task", "POST", JSON.stringify({payload:"x".repeat(1024*1024)})),env(),context);
    expect(response.status).toBe(413);
  });
  it("mission polling does not consume model quota", async () => {
    const e=env();
    await worker.fetch(request("/api/mission"),e,context);
    expect(await e.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM request_quotas").first()).toEqual({n:0});
  });
  it("parsed body remains readable to handler", async () => {
    const response = await worker.fetch(request("/api/task", "POST", '{}'),env(),context);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("inputType");
  });
});

it("idempotent replay returns original mission without charging again", async () => {
  const { claimMission, finishAdmission } = await import("../src/lib/mission-admission");
  const e=env(); const body='{"message":"build","projectId":"p"}';
  const claim=await claimMission(e,"bootstrap-admin:stable-key",body);
  if(claim.kind!=="claimed") throw Error();
  await finishAdmission(e,"bootstrap-admin:stable-key",claim.claim,new Response('{"missionId":"original"}',{status:202}));
  const r=request("/api/mission","POST",body);r.headers.set("Idempotency-Key","stable-key");
  const response=await worker.fetch(r,e,context);
  expect(response.status).toBe(202);expect(await response.json()).toEqual({missionId:"original"});
  expect(await e.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM request_quotas").first()).toEqual({n:0});
});
