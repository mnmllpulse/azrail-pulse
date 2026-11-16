import { describe, it, expect } from "vitest";
import { FIX_APPROVE, rollbackIntent, runRollback, fixIntent, parseEdits, pathsFromLog, runFixLoop, FIX_ROUNDS, type FixDeps } from "../ui/chat-fixloop";
import type { AgentJobView } from "../ui/chat-agent";

const job = (status: string, result: string): AgentJobView => ({ id: "1", kind: "run", path: "npm_build", status, result, error: null });

describe("цикл исправления: намерение и разбор", () => {
  it("нужны «исправь» и «на компьютере»", () => {
    expect(fixIntent("исправь ошибки сборки на компьютере")).toBe("npm_build");
    expect(fixIntent("почини тесты на компьютере")).toBe("npm_test");
    expect(fixIntent("исправь ошибки сборки")).toBeNull();
    expect(fixIntent("запусти тесты на компьютере")).toBeNull();
  });
  it("согласие на цикл принимает «ок» и кавычки, но не фразы с продолжением", () => {
    for (const ok of ["разреши цикл", "«ок»", "разреши»", "да"]) expect(FIX_APPROVE.test(ok), ok).toBe(true);
    for (const no of ["да, но не трогай src", "исправь ошибки сборки на компьютере"]) expect(FIX_APPROVE.test(no), no).toBe(false);
  });
  it("пути из лога: без выхода из папки и служебных каталогов", () => {
    const log = "src/a.ts(12,3): error TS2304\n../evil/x.ts:1\nnode_modules/p/i.js:2\n/etc/passwd.json:1\nui/app.ts:40:5";
    expect(pathsFromLog(log)).toEqual(["src/a.ts", "ui/app.ts"]);
  });
  it("правка допустима только для прочитанных файлов и только если меняет текст", () => {
    const originals = new Map([["src/a.ts", "x"]]);
    expect(parseEdits('```json\n[{"path":"src/a.ts","content":"y"}]\n```', ["src/a.ts"], originals)).toEqual([{ path: "src/a.ts", content: "y" }]);
    expect(parseEdits('[{"path":"src/b.ts","content":"y"}]', ["src/a.ts"], originals)).toBeNull();
    expect(parseEdits('[{"path":"src/a.ts","content":"x"}]', ["src/a.ts"], originals)).toBeNull();
    expect(parseEdits("[]", ["src/a.ts"], originals)).toBeNull();
    expect(parseEdits("не json", ["src/a.ts"], originals)).toBeNull();
  });
});

describe("цикл исправления: ход", () => {
  const base = (over: Partial<FixDeps>, runs: AgentJobView[]): { deps: FixDeps; writes: string[] } => {
    const writes: string[] = [];
    let i = 0;
    return {
      writes,
      deps: {
        run: async () => runs[Math.min(i++, runs.length - 1)],
        read: async () => "const a: number = 'x';",
        write: async (path) => { writes.push(path); return true; },
        ask: async () => '[{"path":"src/a.ts","content":"const a: number = 1;"}]',
        say: () => {},
        ...over,
      },
    };
  };

  it("исправление за один раунд: оригинал сохраняется, успех по коду выхода 0", async () => {
    const { deps, writes } = base({}, [job("failed", "src/a.ts(1,7): error TS2322\n[код выхода 2]"), job("done", "ok\n[код выхода 0]")]);
    const out = await runFixLoop(deps, "npm_build");
    expect(writes).toEqual([".azrail-backup/r1/src/a.ts", "src/a.ts"]);
    expect(out).toContain("Проверка пройдена");
    expect(out).toContain("src/a.ts");
  });

  it("без ошибок сразу: ничего не пишет", async () => {
    const { deps, writes } = base({}, [job("done", "ok")]);
    expect(await runFixLoop(deps, "npm_build")).toContain("без правок");
    expect(writes).toEqual([]);
  });

  it("упорная ошибка: не больше трёх раундов, успех не заявляется", async () => {
    let runs = 0;
    const { deps } = base({ run: async () => { runs++; return job("failed", "src/a.ts(1,1): error"); } }, []);
    const out = await runFixLoop(deps, "npm_build");
    expect(runs).toBe(FIX_ROUNDS);
    expect(out).toContain("Результат не подтверждён");
    expect(out).not.toContain("Проверка пройдена");
  });

  it("мусорный ответ модели останавливает цикл без записи", async () => {
    const { deps, writes } = base({ ask: async () => "Попробуй переустановить зависимости" }, [job("failed", "src/a.ts(1,1): error")]);
    const out = await runFixLoop(deps, "npm_build");
    expect(writes).toEqual([]);
    expect(out).toContain("не предложила допустимой правки");
  });

  it("лог без файлов проекта: остановка", async () => {
    const { deps } = base({}, [job("failed", "npm ERR! network")]);
    expect(await runFixLoop(deps, "npm_build")).toContain("нет читаемых файлов");
  });
});

describe("откат правок", () => {
  it("фраза требует «на компьютере»", () => {
    expect(rollbackIntent("откати правки на компьютере")).toBe(true);
    expect(rollbackIntent("верни последние изменения на моём компьютере")).toBe(true);
    expect(rollbackIntent("откати правки")).toBe(false);
    expect(rollbackIntent("исправь ошибки сборки на компьютере")).toBe(false);
  });
  it("цикл запоминает самую раннюю копию файла", async () => {
    const restore = new Map<string, string>();
    const runs = [job("failed", "src/a.ts(1,1): error"), job("failed", "src/a.ts(1,1): error"), job("done", "ok")];
    let i = 0;
    const deps: FixDeps = {
      run: async () => runs[i++],
      read: async () => "old",
      write: async () => true,
      ask: async () => `[{"path":"src/a.ts","content":"v${i}"}]`,
      say: () => {},
    };
    await runFixLoop(deps, "npm_build", restore);
    expect([...restore]).toEqual([["src/a.ts", ".azrail-backup/r1/src/a.ts"]]);
  });
  it("если копию записать не удалось, файл не трогается", async () => {
    const writes: string[] = [];
    const restore = new Map<string, string>();
    const deps: FixDeps = {
      run: async () => job("failed", "src/a.ts(1,1): error"),
      read: async () => "old",
      write: async (p) => { writes.push(p); return false; },
      ask: async () => '[{"path":"src/a.ts","content":"new"}]',
      say: () => {},
    };
    const out = await runFixLoop(deps, "npm_build", restore);
    expect(writes).toEqual([".azrail-backup/r1/src/a.ts"]);
    expect(restore.size).toBe(0);
    expect(out).toContain("не тронут");
  });
  it("откат пишет оригинал обратно; недоступная копия попадает в failed", async () => {
    const written = new Map<string, string>();
    const deps = {
      read: async (p: string) => (p.includes("b.ts") ? null : `orig:${p}`),
      write: async (p: string, c: string) => { written.set(p, c); return true; },
    };
    const { text, failed } = await runRollback(deps, new Map([["src/a.ts", ".azrail-backup/r1/src/a.ts"], ["src/b.ts", ".azrail-backup/r1/src/b.ts"]]));
    expect(written.get("src/a.ts")).toBe("orig:.azrail-backup/r1/src/a.ts");
    expect(failed).toEqual(["src/b.ts"]);
    expect(text).toContain("Возвращено: src/a.ts");
    expect(text).toContain("Не удалось вернуть: src/b.ts");
  });
});
