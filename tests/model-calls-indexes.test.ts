import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";

describe("миграция 038: индексы model_calls", () => {
  const { sqlite } = sqliteD1();
  sqlite.exec(readFileSync("schema.sql", "utf8"));
  const sql = readFileSync("migrations/038-model-calls-indexes.sql", "utf8");

  it("идемпотентна", () => {
    sqlite.exec(sql);
    sqlite.exec(sql);
    const names = sqlite.prepare("PRAGMA index_list('model_calls')").all().map((r: any) => r.name);
    expect(names).toContain("idx_model_calls_status_started");
    expect(names).toContain("idx_model_calls_scope_started");
  });

  it("запросы используют индексы", () => {
    const plan = (q: string) => sqlite.prepare(`EXPLAIN QUERY PLAN ${q}`).all().map((r: any) => r.detail).join(" ");
    expect(plan("SELECT id FROM model_calls WHERE status IN ('uncertain','unpriced') ORDER BY started_at DESC LIMIT 100")).toContain("idx_model_calls_status_started");
    expect(plan("SELECT COUNT(*) FROM model_calls WHERE scope='x'")).toContain("idx_model_calls_scope_started");
  });
});
