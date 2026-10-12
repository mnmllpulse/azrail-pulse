import { describe, it, expect, vi, afterEach } from "vitest";
import { checkAuth, checkRateLimit } from "../src/lib/auth";
import { chargeWrites } from "../src/lib/write-budget";
import { issueTicket, redeemTicket } from "../src/lib/ws-ticket";
import { cleanupSecurityState } from "../src/lib/quota";
import { readBoundedBody, validateJsonObject } from "../src/lib/request-body";
import { listZip, readEntry } from "../src/lib/zip-reader";
import { readSource, joinForPrompt } from "../src/lib/source-reader";
import { getCors } from "../src/lib/cors";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { makeZip } from "./stubs/make-zip";
import type { Env } from "../src/types";

const env = (extra = {}) => ({ AZRAIL_D1: sqliteD1().db, AZRAIL_TOKEN: "test-secret", ...extra }) as Env;
afterEach(() => vi.restoreAllMocks());

describe("atomic security state (real SQLite)", () => {
  it("parallel reservations never exceed the limit", async () => {
    const e = env({ AZRAIL_HOURLY_LIMIT: "5" });
    const results = await Promise.all(Array.from({length: 20}, () => checkRateLimit(e, "shared")));
    expect(results.filter(r => r.allowed)).toHaveLength(5);
  });
  it("an expensive request cannot enter an empty smaller budget", async () => {
    expect((await checkRateLimit(env({ AZRAIL_HOURLY_LIMIT: "2" }), "shared", 3)).allowed).toBe(false);
  });
  it("explicit zero and malformed configured limits fail closed", async () => {
    expect((await checkRateLimit(env({ AZRAIL_HOURLY_LIMIT: "0" }), "shared")).allowed).toBe(false);
    expect((await chargeWrites(env({ AZRAIL_WRITE_BUDGET: "not-a-number" }), 1)).allowed).toBe(false);
  });
  it.each([0, -1, NaN, Infinity, 0.5])("rejects invalid cost %s", async cost => {
    expect((await chargeWrites(env(), cost)).allowed).toBe(false);
  });
  it("database failure closes both budgets", async () => {
    const e = env({ AZRAIL_D1: { prepare() { throw new Error("offline"); } } });
    expect((await checkRateLimit(e, "shared")).allowed).toBe(false);
    expect((await chargeWrites(e, 1)).allowed).toBe(false);
  });
  it("only one of parallel ticket consumers succeeds", async () => {
    const e = env();
    const { ticket } = await issueTicket(e, "shared");
    const results = await Promise.all(Array.from({length: 10}, () => redeemTicket(e, ticket)));
    expect(results.filter(Boolean)).toEqual(["shared"]);
  });
  it("expired ticket fails even before cron cleanup", async () => {
    const e = env(); const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const { ticket } = await issueTicket(e, "shared");
    vi.spyOn(Date, "now").mockReturnValue(now + 60_001);
    expect(await redeemTicket(e, ticket)).toBeNull();
    await cleanupSecurityState(e);
    expect(await e.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM websocket_tickets").first()).toEqual({ n: 0 });
  });
  it("scheduled cleanup removes expired OIDC and web session state", async () => {
    const e=env(),now=Date.now();
    await e.AZRAIL_D1.prepare("INSERT INTO access_accounts(id,name,role,token_hash,expires_at) VALUES('a','A','editor','x',?)").bind(now+100000).run();
    await e.AZRAIL_D1.prepare("INSERT INTO web_sessions(token_hash,account_id,origin,expires_at) VALUES('s','a','https://app.test',?)").bind(now-1).run();
    await e.AZRAIL_D1.prepare("INSERT INTO oidc_states(state_hash,verifier,nonce,origin,expires_at) VALUES('o','v','n','https://app.test',?)").bind(now-1).run();
    await e.AZRAIL_D1.prepare("INSERT INTO connector_oauth_states(state_hash,account_id,endpoint_key,origin,policy_digest,verifier_cipher,expires_at) VALUES('c','a','x','https://app.test','p','v',?)").bind(now-1).run();
    await cleanupSecurityState(e);
    expect(await e.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM web_sessions").first()).toEqual({n:0});
    expect(await e.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM oidc_states").first()).toEqual({n:0});
    expect(await e.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM connector_oauth_states").first()).toEqual({n:0});
  });
  it("window rollover gives a fresh budget", async () => {
    const e = env({ AZRAIL_HOURLY_LIMIT: "1" });
    vi.spyOn(Date, "now").mockReturnValue(3_600_000);
    expect((await checkRateLimit(e, "shared")).allowed).toBe(true);
    expect((await checkRateLimit(e, "shared")).allowed).toBe(false);
    vi.spyOn(Date, "now").mockReturnValue(7_200_000);
    expect((await checkRateLimit(e, "shared")).allowed).toBe(true);
  });
});

describe("request boundaries", () => {
  it("URL token is rejected; bearer is accepted", () => {
    expect(checkAuth(new Request("https://x/api/task?token=test-secret"), env()).ok).toBe(false);
    expect(checkAuth(new Request("https://x/api/task", {headers:{Authorization:"Bearer test-secret"}}), env()).ok).toBe(true);
  });
  it("counts streamed bytes with no declared length", async () => {
    const req = new Request("https://x", { method: "POST", body: "123456" });
    await expect(readBoundedBody(req, 5)).rejects.toThrow("лимит");
  });
  it("accepts exact byte limit", async () => {
    expect(await readBoundedBody(new Request("https://x", {method:"POST", body:"12345"}), 5)).toHaveLength(5);
  });
  it.each([null, [], 1, "text", {goal: 1}, {attachments: [null]}, {only:[1]}, {confirm:"yes"}])("rejects malformed API value %#", value => {
    expect(() => validateJsonObject(value)).toThrow();
  });
  it("allows delete and idempotency in CORS", () => {
    const h = getCors(env());
    expect(h.get("Access-Control-Allow-Methods")).toContain("DELETE");
    expect(h.get("Access-Control-Allow-Headers")).toContain("Idempotency-Key");
    expect(h.get("Cache-Control")).toBe("no-store");
  });
});

describe("untrusted archives", () => {
  it.each(["../a.ts", "/a.ts", "C:/a.ts", "a\\b.ts"])("skips unsafe path %s", path => {
    expect(listZip(makeZip([{path, content:"x"}])).entries[0].skipped).toBeTruthy();
  });
  it("rejects expansion beyond forged declared size", async () => {
    const zip = makeZip([{path:"a.ts", content:"x".repeat(100_000)}]);
    const view = new DataView(zip); const central = view.getUint32(zip.byteLength - 6, true);
    view.setUint32(central + 24, 1, true);
    await expect(readEntry(zip, listZip(zip).entries[0])).rejects.toThrow("лимит");
  });
  it("detects corrupted stored bytes", async () => {
    const zip = makeZip([{path:"a.ts", content:"test", method:0}]);
    new Uint8Array(zip)[34] ^= 1;
    await expect(readEntry(zip, listZip(zip).entries[0])).rejects.toThrow("CRC32");
  });
  it("rejects truncated directory fields", () => {
    const zip = makeZip([{path:"a.ts", content:"x"}]);
    const view = new DataView(zip); const central = view.getUint32(zip.byteLength - 6, true);
    view.setUint16(central + 28, 65535, true);
    expect(() => listZip(zip)).toThrow("обрезана");
  });
  it("enforces entry read limit", async () => {
    const zip = makeZip([{path:"a.ts", content:"12345"}]);
    await expect(readEntry(zip, listZip(zip).entries[0], 4)).rejects.toThrow("лимит");
  });
  it("source reader uses the same bounded archive path", async () => {
    const zip = makeZip([{path:"a.ts", content:"123456789"}]);
    const e = env({ AZRAIL_R2: {get: async () => ({size:zip.byteLength, arrayBuffer:async () => zip})} });
    const files = await readSource(e, {inputType:"zip",r2Key:"x"}, 4);
    expect(files[0].content).toBe("1234");
    expect(joinForPrompt(files, 3)).toHaveLength(3);
  });
});
