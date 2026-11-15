import { describe, it, expect } from "vitest";
import { agentIntent, jobReply, waitJob, APPROVE, REJECT } from "../ui/chat-agent";

describe("чат ставит задачи локальному агенту", () => {
  it("чтение, список, запись — только с явным «на компьютере»", () => {
    expect(agentIntent("прочитай src/index.ts на компьютере")).toEqual({ kind: "read", path: "src/index.ts" });
    expect(agentIntent("покажи файлы в src на компьютере")).toEqual({ kind: "list", path: "src" });
    expect(agentIntent("покажи список файлов на моём компьютере")).toEqual({ kind: "list", path: "" });
    expect(agentIntent("запиши в notes/a.txt на компьютере:\nпривет")).toEqual({ kind: "write", path: "notes/a.txt", content: "привет" });
  });
  it("обычные фразы и архивы остаются чатом", () => {
    expect(agentIntent("прочитай src/index.ts")).toBeNull();
    expect(agentIntent("что за файлы в архиве")).toBeNull();
    expect(agentIntent("запиши в a.txt на компьютере")).toBeNull();
    expect(agentIntent("привет")).toBeNull();
  });
  it("подтверждение и отказ записи", () => {
    expect(APPROVE.test("разреши запись")).toBe(true);
    expect(REJECT.test("отклони")).toBe(true);
    expect(APPROVE.test("разреши мне войти")).toBe(false);
  });
  it("ответы по состояниям", () => {
    const job = { id: "1", kind: "read", path: "a.ts", status: "done", result: "x".repeat(7000), error: null };
    expect(jobReply(job)).toContain("показано 6000 из 7000");
    expect(jobReply({ ...job, kind: "write", status: "awaiting_approval", bytes: 12 })).toContain("«разреши запись»");
    expect(jobReply({ ...job, status: "failed", error: "секретный файл" })).toContain("секретный файл");
    expect(jobReply({ ...job, status: "queued" })).toContain("PowerShell");
  });
  it("ожидание заканчивается, когда статус вышел из очереди", async () => {
    const seq = ["queued", "running", "done"];
    let i = 0;
    const api = async () => ({ job: { id: "1", kind: "read", path: "a", status: seq[Math.min(i++, 2)], result: "ok", error: null } });
    const job = await waitJob(api, "1", async () => {});
    expect(job.status).toBe("done");
  });
});
