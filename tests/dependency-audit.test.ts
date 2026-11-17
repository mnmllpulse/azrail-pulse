import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error mjs без типов
import { evaluateAudit, validateExceptions } from "../scripts/dependency-audit.mjs";

const advisory = (id: string, severity = "high") => ({ source: 1, name: "picomatch", title: "ReDoS", severity, url: `https://github.com/advisories/${id}` });
const report = (...via: unknown[]) => ({ metadata: { vulnerabilities: { high: via.length, critical: 0 } }, vulnerabilities: { picomatch: { severity: "high", via }, vite: { severity: "high", via: ["picomatch"] } } });
const rule = (id: string, expires = "2027-01-17") => ({ id, expires, reason: "Причина: только dev-инструменты, в бандле Worker не присутствует." });
const now = new Date("2026-11-17T12:00:00Z");

describe("dependency audit с временными исключениями", () => {
  it("пропускает advisory из действующего исключения", () => {
    const result = evaluateAudit(report(advisory("GHSA-fc5q-39xc-vjpf")), [rule("GHSA-fc5q-39xc-vjpf")], now);
    expect(result).toMatchObject({ ok: true, blocking: [], expired: [] });
    expect(result.allowed).toHaveLength(1);
  });
  it("блокирует любую другую high/critical", () => {
    const result = evaluateAudit(report(advisory("GHSA-fc5q-39xc-vjpf"), advisory("GHSA-aaaa-bbbb-cccc", "critical")), [rule("GHSA-fc5q-39xc-vjpf")], now);
    expect(result.ok).toBe(false);
    expect(result.blocking.map((item: { id: string }) => item.id)).toEqual(["GHSA-AAAA-BBBB-CCCC"]);
  });
  it("просроченное исключение снова блокирует", () => {
    const result = evaluateAudit(report(advisory("GHSA-fc5q-39xc-vjpf")), [rule("GHSA-fc5q-39xc-vjpf", "2026-11-16")], now);
    expect(result.ok).toBe(false);
    expect(result.expired).toHaveLength(1);
  });
  it("не молчит, если high есть, а advisory не распознаны", () => {
    const result = evaluateAudit({ metadata: { vulnerabilities: { high: 2, critical: 0 } }, vulnerabilities: { x: { severity: "high", via: ["y"] } } }, [], now);
    expect(result).toMatchObject({ ok: false, unexplained: true });
  });
  it("игнорирует moderate и сообщает о неиспользуемом исключении", () => {
    const result = evaluateAudit({ metadata: { vulnerabilities: { high: 0, critical: 0 } }, vulnerabilities: { x: { severity: "moderate", via: [advisory("GHSA-aaaa-bbbb-cccc", "moderate")] } } }, [rule("GHSA-fc5q-39xc-vjpf")], now);
    expect(result).toMatchObject({ ok: true, unused: ["GHSA-FC5Q-39XC-VJPF"] });
  });
  it("валидирует записи исключений", () => {
    expect(validateExceptions([rule("GHSA-fc5q-39xc-vjpf")])).toEqual([]);
    expect(validateExceptions([{ id: "bad", expires: "завтра", reason: "коротко" }])).toHaveLength(3);
    expect(validateExceptions([rule("GHSA-fc5q-39xc-vjpf"), rule("GHSA-FC5Q-39XC-VJPF")])).toEqual([expect.stringContaining("дубликат")]);
  });
  it("реальный файл исключений валиден и ограничен по сроку", () => {
    const config = JSON.parse(readFileSync("config/audit-exceptions.json", "utf8"));
    expect(validateExceptions(config.exceptions)).toEqual([]);
    for (const item of config.exceptions) expect(Date.parse(`${item.expires}T00:00:00Z`) - Date.parse("2026-11-17T00:00:00Z")).toBeLessThanOrEqual(90 * 86400000);
  });
});
