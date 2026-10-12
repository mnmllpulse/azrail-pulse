import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

/** Real SQLite engine behind D1's small prepared-statement interface. */
export function sqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../schema.sql", import.meta.url), "utf8"));
  const db = {
    prepare(sql: string) {
      let args: any[] = [];
      const stmt = {
        bind(...values: any[]) { args = values; return stmt; },
        async first() { return sqlite.prepare(sql).get(...args) ?? null; },
        async run() { const result = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
        executeAll() { const results=sqlite.prepare(sql).all(...args); const meta={changes:Number((sqlite.prepare('SELECT changes() AS n').get() as {n:number}).n)};return {results,success:true,meta}; },
        async all() { return stmt.executeAll(); },
      };
      return stmt;
    },
    async batch(stmts: Array<{executeAll(): unknown}>) {
      sqlite.exec("BEGIN");
      try {const out=[]; for(const stmt of stmts)out.push(stmt.executeAll());sqlite.exec("COMMIT");return out;}
      catch(e){sqlite.exec("ROLLBACK");throw e;}
    },
  };
  return { db: db as unknown as D1Database, sqlite };
}
