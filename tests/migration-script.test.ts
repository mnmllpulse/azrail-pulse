import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {sqliteD1} from './stubs/sqlite-d1';
const source=readFileSync('scripts/migrate.mjs','utf8').replace(/^import .*;\n/gm,'').replace('import.meta.url',JSON.stringify(new URL('../scripts/migrate.mjs',import.meta.url).href));
function execute(apply:boolean){
  const {sqlite}=sqliteD1();
  sqlite.exec("DROP TABLE mission_hints; ALTER TABLE missions DROP COLUMN result_json; INSERT INTO missions(id,goal,status) VALUES('existing','keep this','completed');");
  const written=new Map<string,string>(),calls:string[][]=[];
  const execFileSync=(_exe:string,args:string[])=>{
    const a=args.slice(1);calls.push(a);expect(a).toContain('AZRAIL_D1');expect(a).toContain(resolve('wrangler.staging.json'));
    if(a[1]==='export')return 'exported';
    const command=a.indexOf('--command');
    if(command>=0){
      const sql=a[command+1];
      if(/^\s*(SELECT|PRAGMA)/i.test(sql)) return JSON.stringify([{success:true,results:sqlite.prepare(sql).all()}]);
      sqlite.exec(sql);return 'written';
    }
    const file=a.indexOf('--file');
    if(file>=0){
      const path=a[file+1];
      const sql=written.get(path)??readFileSync(path,'utf8');
      sqlite.exec(sql);return 'applied';
    }
    throw Error('unexpected subprocess');
  };
  const exitSignal={};
  try{runInNewContext(source,{
    execFileSync,createHash,readFileSync,readdirSync,writeFileSync:(p:string,s:string)=>written.set(p,s),mkdirSync(){},resolve,
    fileURLToPath:(u:URL)=>u.pathname,URL,Date,Set,Map,JSON,Number,String,Object,Math,Error,process:{argv:['node','script','--local','--config','wrangler.staging.json',...(apply?['--apply']:[])],execPath:process.execPath,env:{},exit:(code=0)=>{if(code!==0)throw Error(`migrate.mjs exited with ${code}`);throw exitSignal;}},console:{log(){}}
  });}catch(error){if(error!==exitSignal)throw error;}
  return {sqlite,calls,written};
}
describe('migration plan against real SQLite and isolated subprocesses',()=>{
  it('inspection produces plans without applying them',()=>{
    const t=execute(false);
    expect(t.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='mission_hints'").get()).toBeUndefined();
    expect(t.calls.some(c=>c.includes('--file'))).toBe(false);
    expect([...t.written.keys()].some(p=>p.endsWith('migration-plan.json'))).toBe(true);
  });
  it('applies pending migrations, preserves data and records checksums',()=>{
    const t=execute(true);
    expect(t.sqlite.prepare("SELECT goal FROM missions WHERE id='existing'").get()?.goal).toBe('keep this');
    expect(t.sqlite.prepare("SELECT COUNT(*) n FROM mission_hints").get()?.n).toBe(0);
    const row=t.sqlite.prepare("SELECT filename,checksum,status FROM schema_migrations WHERE version='016'").get() as any;
    expect(row.filename).toBe('016-schema-migrations-ledger.sql');
    expect(row.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(row.status).toBe('applied');
    const backup=t.calls.findIndex(c=>c[1]==='export'),apply=t.calls.findIndex(c=>c.includes('--file'));expect(backup).toBeGreaterThan(-1);expect(apply).toBeGreaterThan(backup);
  });
});
