import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=(file:string)=>readFileSync(resolve(__dirname,"..",file),"utf8");

describe("Unified Event Stream architecture",()=>{
  it("uses a durable monotonic replay cursor",()=>{
    const schema=root("schema.sql"),stream=root("src/lib/event-stream.ts");
    expect(schema).toContain("seq INTEGER PRIMARY KEY AUTOINCREMENT");
    expect(stream).toContain("seq>?");
    expect(stream).toContain("ORDER BY e.seq ASC");
  });

  it("delivers exactly the durable envelope over realtime transport",()=>{
    const orchestrator=root("src/agents/orchestrator.ts");
    expect(orchestrator).toContain('{type:"event_stream", event:payload.streamEvent}');
    expect(orchestrator).not.toContain('{type:"mission_event"');
  });

  it("client replays missed events before opening the websocket",()=>{
    const ui=root("ui/event-stream.ts");
    expect(ui.indexOf("await replay()")).toBeLessThan(ui.indexOf("new WebSocket"));
    expect(ui).toContain("sessionStorage.setItem(key,String(cursor))");
  });

  it("chains new events with SHA-256 and prevents integrity forks",()=>{
    const schema=root("schema.sql"),stream=root("src/lib/event-stream.ts"),migration=root("migrations/030-event-integrity-chain.sql");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS event_integrity");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_event_integrity_scope_prev");
    expect(stream).toContain("sha256Hex");
    expect(stream).toContain("verifyEventIntegrityScope");
    expect(stream).toContain("MAX_INTEGRITY_RETRIES");
    expect(stream).toContain("env.AZRAIL_D1.batch");
  });

});
