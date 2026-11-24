import { describe, it, expect } from "vitest";
import { agentHint, agentIntent, jobReply, waitJob, APPROVE, REJECT } from "../ui/chat-agent";

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
  it("разговорные формулировки про компьютер", () => {
    const test = { kind: "run", path: "npm_test" };
    for (const phrase of ["сделай тест на локальном компе", "запусти тесты на моём компе", "прогони тесты на пк", "Запусти тесты локально", "проведи тесты на моей машине", "выполни npm test на ноуте", "запусти все юнит-тесты у меня на компе"]) expect(agentIntent(phrase), phrase).toEqual(test);
    expect(agentIntent("запусти сборку на локальном компе")).toEqual({ kind: "run", path: "npm_build" });
    expect(agentIntent("запусти линтер на пк")).toEqual({ kind: "run", path: "npm_lint" });
    expect(agentIntent("проверь типы на компьютере")).toEqual({ kind: "run", path: "npm_typecheck" });
    expect(agentIntent("покажи git status на моём компе")).toEqual({ kind: "run", path: "git_status" });
  });
  it("не перехватывает посторонние фразы", () => {
    for (const phrase of ["сделай тест по истории", "сделай тест по истории на компьютере", "запусти тесты", "сделай тест на знание SQL", "как работает компилятор", "расскажи про компьютер", "установи Node на компьютер"]) expect(agentIntent(phrase), phrase).toBeNull();
  });
  it("просьба про компьютер без команды даёт подсказку, а не ответ модели", () => {
    for (const phrase of ["запусти докер на локальном компе", "запиши в a.txt на компьютере", "удали node_modules на моём пк", "проверь диск на ноуте"]) expect(agentHint(phrase), phrase).toContain("«запусти тесты на компьютере»");
    for (const phrase of ["как установить Node на компьютере", "привет", "запусти тесты", "что такое локальный агент"]) expect(agentHint(phrase), phrase).toBeNull();
  });
  it("подтверждение и отказ записи", () => {
    expect(APPROVE.test("разреши запись")).toBe(true);
    expect(REJECT.test("отклони")).toBe(true);
    expect(APPROVE.test("разреши мне войти")).toBe(false);
    for (const ok of ["+", "+1", " + ", "👍", "ок", "«ок»", "разреши»", "Да!", "OK", " «разреши» ", "разреши запуск"]) expect(APPROVE.test(ok), ok).toBe(true);
    for (const no of ["+ объясни", "1+1", "++", "ок, но сначала объясни", "да, расскажи про Cloudflare", "окно"]) expect(APPROVE.test(no), no).toBe(false);
    for (const bad of ["нет", "-1", "👎", "«отмена»", "отклони запуск"]) expect(REJECT.test(bad), bad).toBe(true);
  });
  it("ответы по состояниям", () => {
    const job = { id: "1", kind: "read", path: "a.ts", status: "done", result: "x".repeat(7000), error: null };
    expect(jobReply(job)).toContain("показано 6000 из 7000");
    expect(jobReply({ ...job, kind: "write", status: "awaiting_approval", bytes: 12 })).toContain("«разреши»");
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
