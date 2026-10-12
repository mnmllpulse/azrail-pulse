import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {sqliteD1} from './stubs/sqlite-d1';

describe('migration 016 ledger contract',()=>{
  it('is idempotent and exposes the required immutable migration metadata',()=>{
    const {sqlite}=sqliteD1();
    const sql=readFileSync(new URL('../migrations/016-schema-migrations-ledger.sql',import.meta.url),'utf8');
    sqlite.exec(sql); sqlite.exec(sql);
    const columns=sqlite.prepare("PRAGMA table_info('schema_migrations')").all().map((r:any)=>r.name);
    for(const name of ['version','filename','checksum','applied_at','applied_by','duration_ms','status']) expect(columns).toContain(name);
  });
});
