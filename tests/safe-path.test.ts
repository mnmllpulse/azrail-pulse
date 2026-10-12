// Барьер подстановки в URL.
//
// Ошибка, ради которой он написан: тело запроса приходит JSON'ом и
// приводится к типу простым request.json(). Типы TypeScript стираются, и
// поле `runId: number` в рантайме может быть строкой. Конструктор URL
// нормализует "..", поэтому такое значение уводило запрос на ДРУГОЙ
// эндпоинт GitHub — с токеном из секретов воркера.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { assertRepo, pathSegment, pathSegments, splitRepo, UnsafePathError } from "../src/lib/safe-path";

const src = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, "..", f), "utf8");

describe("Обход пути блокируется", () => {
  it("одиночный сегмент не пропускает слеши и точки", () => {
    for (const bad of ["1/../../user/repos", "..", ".", "a/b", "../secrets"]) {
      expect(() => pathSegment(bad, "runId"), `пропущено: ${bad}`).toThrow(UnsafePathError);
    }
  });

  it("составной путь не пропускает .. ни в одном сегменте", () => {
    for (const bad of ["../etc", "src/../../../x", "a/../b", "..", "a/.."]) {
      expect(() => pathSegments(bad, "path"), `пропущено: ${bad}`).toThrow(UnsafePathError);
    }
  });

  it("репозиторий обязан быть owner/name", () => {
    for (const bad of ["../../user", "owner", "a/b/c", "../x", "", "own er/name"]) {
      expect(() => assertRepo(bad), `пропущено: ${bad}`).toThrow(UnsafePathError);
    }
  });

  it("нечисловой runId отвергается даже если тип обещает число", () => {
    // Ровно та ситуация: тип number, а в JSON пришла строка.
    expect(() => pathSegment("1/../../x" as unknown as number, "runId")).toThrow(UnsafePathError);
    expect(() => pathSegment(-1, "runId")).toThrow(UnsafePathError);
    expect(() => pathSegment(1.5, "runId")).toThrow(UnsafePathError);
    expect(() => pathSegment(null, "runId")).toThrow(UnsafePathError);
    expect(() => pathSegment({}, "runId")).toThrow(UnsafePathError);
  });
});

describe("Нормальные значения продолжают работать", () => {
  it("обычный runId", () => {
    expect(pathSegment(12345, "runId")).toBe("12345");
  });

  it("ветка со слешем не ломается", () => {
    // feature/x — законное имя ветки, слеши обязаны сохраниться.
    expect(pathSegments("feature/new-router", "from")).toBe("feature/new-router");
  });

  it("путь файла сохраняет слеши, но кодирует спецсимволы", () => {
    expect(pathSegments("src/lib/model router.ts", "path")).toBe("src/lib/model%20router.ts");
  });

  it("точки в именах разрешены — это не обход", () => {
    expect(pathSegments("src/app.test.ts", "path")).toBe("src/app.test.ts");
    expect(assertRepo("my.org/repo.js")).toBe("my.org/repo.js");
  });

  it("splitRepo разбирает проверенное значение", () => {
    expect(splitRepo("cloudflare/workers-sdk")).toEqual({ owner: "cloudflare", repo: "workers-sdk" });
  });
});

describe("Барьер применён везде, где значение попадает в путь", () => {
  it("ни один агент не подставляет repo в URL напрямую", () => {
    for (const f of ["git-agent.ts", "qa-agent.ts", "deploy-agent.ts"]) {
      const s = src(`src/agents/${f}`);
      const raw = s.split("\n").filter((l) => /`\/repos\/\$\{repo\}/.test(l));
      expect(raw, `${f}: сырой repo в пути — ${raw.join(" | ")}`).toHaveLength(0);
    }
  });

  it("source-reader не разбирает owner/repo простым split", () => {
    const s = src("src/lib/source-reader.ts");
    expect(s).not.toMatch(/const \[owner, repo\] = .*\.split\("\/"\)/);
    expect(s).toContain("splitRepo");
  });

  it("небезопасный параметр — отказ запросу, а не сбой сервиса", () => {
    // needs_input, а не failed: виноват запрос, и Evolution Agent не должен
    // считать это отказом агента.
    for (const f of ["git-agent.ts", "qa-agent.ts"]) {
      expect(src(`src/agents/${f}`)).toContain("UnsafePathError");
    }
  });
});
