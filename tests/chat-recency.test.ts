import { it, expect } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { listMessages } from "../src/lib/chat-store";
import type { Env } from "../src/types";
it("returns the newest messages in chronological order, including timestamp ties",async()=>{
  const {db,sqlite}=sqliteD1();
  sqlite.exec("DROP TABLE messages; CREATE TABLE messages(id TEXT, conversation_id TEXT, role TEXT, content TEXT, parent_message_id TEXT, model TEXT, created_at TEXT)");
  for(let i=0;i<30;i++) sqlite.prepare("INSERT INTO messages VALUES (?, 'c', 'user', ?, NULL, NULL, '2026-09-25')").run(String(i),String(i));
  const messages=await listMessages({AZRAIL_D1:db} as Env,"c",3);
  expect(messages.map((m:any)=>m.content)).toEqual(["27","28","29"]);
});
