import { describe, it, expect } from 'vitest';
import type { Env } from '../src/types';
import { isTerminal } from '../src/lib/mission-state';
import { backupProject } from '../src/lib/backups';
import { restoreVersion } from '../src/lib/versions';
import { meteredCall, ProviderOutcomeUncertainError } from '../src/lib/billing';
import { sqliteD1 } from './stubs/sqlite-d1';

describe('RC9 mission lifecycle semantics',()=>{
  it('treats waiting_approval as suspended, not terminal',()=>{
    expect(isTerminal('waiting_approval')).toBe(false);
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
  });
});

describe('RC9 R2 pagination safety',()=>{
  it('backup rejects a cyclic cursor instead of looping forever',async()=>{
    const {db}=sqliteD1();
    let listCalls=0;
    const r2={
      async list(){listCalls++; return {objects:[],truncated:true,cursor:listCalls===1?'a':'a'};},
      async put(){}, async get(){return null;}, async delete(){},
    };
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    await expect(backupProject(env,'p')).rejects.toThrow(/Неполный список файлов/);
    expect(listCalls).toBe(2);
  });

  it('version restore rejects a cyclic cursor instead of looping forever',async()=>{
    const {db,sqlite}=sqliteD1();
    sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','u@example.invalid','u')").run();
    sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('p','u','p')").run();
    sqlite.prepare("INSERT INTO project_versions(id,project_id,version_number,r2_object_key,summary,created_by_agent) VALUES('v','p',1,'projects/p/ui/x/','x','ui-agent')").run();
    let listCalls=0;
    const r2={async list(){listCalls++;return {objects:[],truncated:true,cursor:'same'};},async get(){return null;}};
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    await expect(restoreVersion(env,'p','v')).rejects.toThrow(/Неполный список объектов версии/);
    expect(listCalls).toBe(2);
  });
});

describe('RC9 provider retry semantics',()=>{
  it('marks ambiguous network loss as uncertain and exposes a non-retryable error',async()=>{
    const {db,sqlite}=sqliteD1();
    sqlite.exec("INSERT INTO model_prices(model,input_micro_usd_per_million,output_micro_usd_per_million,updated_at) VALUES('m',0,0,1)");
    const env={AZRAIL_D1:db,AZRAIL_METERING:'observe'} as Env;
    await expect(meteredCall(env,'m',{prompt:'x'},'scope',async()=>{throw new Error('network connection reset');}))
      .rejects.toBeInstanceOf(ProviderOutcomeUncertainError);
    expect(sqlite.prepare("SELECT status FROM model_calls").get()?.status).toBe('uncertain');
  });

  it('keeps an explicit quota response distinguishable from an ambiguous transport loss',async()=>{
    const {db}=sqliteD1();
    const env={AZRAIL_D1:db,AZRAIL_METERING:'observe'} as Env;
    await expect(meteredCall(env,'m',{prompt:'x'},'scope',async()=>{throw new Error('429 Too Many Requests');}))
      .rejects.toThrow('429 Too Many Requests');
  });
});
