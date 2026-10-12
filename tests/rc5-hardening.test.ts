import { describe, it, expect, vi } from 'vitest';
vi.mock('agents', () => ({ getAgentByName: vi.fn() }));
import { getAgentByName } from 'agents';
import { sqliteD1 } from './stubs/sqlite-d1';
import type { Env } from '../src/types';
import { dispatchOutbox } from '../src/lib/outbox';
import { meteredCall, reconcileModelCall } from '../src/lib/billing';
import { reconcileConnectorCall } from '../src/unified/connectors';
import { validateTrustedHttpsUrl } from '../src/unified/trusted-endpoint';

describe('RC5 outbox hardening', () => {
  it('quarantines a payload that points at another project instead of dispatching it', async () => {
    const {db,sqlite}=sqliteD1();
    const now=new Date().toISOString();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('m1','p1','goal','queued',?,?)").run(now,now);
    sqlite.prepare("INSERT INTO mission_outbox(mission_id,params,created_at) VALUES('m1',?,?)")
      .run(JSON.stringify({missionId:'m1',projectId:'p2',goal:'goal',maxIterations:12}),Date.now());
    const startMission=vi.fn();vi.mocked(getAgentByName).mockResolvedValue({startMission} as never);
    await dispatchOutbox({AZRAIL_D1:db} as Env);
    expect(startMission).not.toHaveBeenCalled();
    expect(sqlite.prepare("SELECT status FROM missions WHERE id='m1'").get()?.status).toBe('failed');
    expect(sqlite.prepare("SELECT delivered FROM mission_outbox WHERE mission_id='m1'").get()?.delivered).toBe(1);
  });
});

describe('RC5 billing reconciliation', () => {
  it('reconciles every hierarchical reservation exactly once', async () => {
    const {db,sqlite}=sqliteD1();
    const env={AZRAIL_D1:db,AZRAIL_METERING:'enforce'} as Env;
    sqlite.exec("INSERT INTO model_prices VALUES('m',1000000,1000000,1); INSERT INTO spend_limits(scope,limit_micro_usd) VALUES('a',100000),('b',100000);");
    await expect(meteredCall(env,'m',{max_tokens:10},'call-scope',async()=>{throw Error('network');},'a',{additionalBudgetScopes:['b']})).rejects.toThrow();
    const call=sqlite.prepare("SELECT id,status FROM model_calls").get() as {id:string;status:string};
    expect(call.status).toBe('uncertain');
    expect(sqlite.prepare("SELECT COUNT(*) n FROM model_call_budget_scopes WHERE call_id=?").get(call.id)?.n).toBe(2);
    await reconcileModelCall(env,call.id,0,'provider dashboard confirms no charge');
    expect(sqlite.prepare("SELECT spent_micro_usd n FROM spend_limits WHERE scope='a'").get()?.n).toBe(0);
    expect(sqlite.prepare("SELECT spent_micro_usd n FROM spend_limits WHERE scope='b'").get()?.n).toBe(0);
    expect(sqlite.prepare("SELECT status FROM model_calls WHERE id=?").get(call.id)?.status).toBe('completed');
    await expect(reconcileModelCall(env,call.id,0,'same evidence')).rejects.toThrow();
    expect(sqlite.prepare("SELECT spent_micro_usd n FROM spend_limits WHERE scope='a'").get()?.n).toBe(0);
  });
});

describe('RC5 connector reconciliation', () => {
  it('can release a request reservation only after explicit not-executed evidence', async () => {
    const {db,sqlite}=sqliteD1();
    const env={AZRAIL_D1:db} as Env;
    const id='11111111-1111-4111-8111-111111111111',now=Date.now();
    sqlite.exec("INSERT INTO resource_budgets(scope,unit,limit_units,committed_units) VALUES('connector:a:test:day','request',10,1)");
    sqlite.prepare("INSERT INTO resource_ledger(id,scope,unit,resource,fingerprint,status,reserved_units,created_at) VALUES(?,?,?,?,?,'uncertain',1,?)")
      .run(id,'connector:a:test:day','request','mcp:test',id,now);
    sqlite.prepare(`INSERT INTO connector_calls(id,account_id,connection_id,connection_revision,request_key,tool_name,arguments_cipher,arguments_digest,tools_digest,policy_digest,approval_needed,status,expires_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,1,'uncertain',?,?,?)`).run(id,'a','connection-1234',1,'request-key-1234','write','cipher','digest','tools','policy',now+60000,now,now);
    const first=await reconcileConnectorCall(env,'a',id,'not_executed','remote audit log shows no request');
    expect(first).toMatchObject({status:'cancelled',reconciled:true});
    expect(sqlite.prepare("SELECT status FROM resource_ledger WHERE id=?").get(id)?.status).toBe('released');
    expect(sqlite.prepare("SELECT committed_units n FROM resource_budgets WHERE scope='connector:a:test:day'").get()?.n).toBe(0);
    const second=await reconcileConnectorCall(env,'a',id,'not_executed','remote audit log shows no request');
    expect(second).toMatchObject({status:'cancelled',reconciled:true});
    expect(sqlite.prepare("SELECT committed_units n FROM resource_budgets WHERE scope='connector:a:test:day'").get()?.n).toBe(0);
  });
});

describe('RC5 OIDC endpoint validation', () => {
  it('rejects local, numeric, credentialed and non-TLS endpoints', () => {
    expect(()=>validateTrustedHttpsUrl('http://login.example.com','OIDC endpoint')).toThrow();
    expect(()=>validateTrustedHttpsUrl('https://127.0.0.1','OIDC endpoint')).toThrow();
    expect(()=>validateTrustedHttpsUrl('https://localhost','OIDC endpoint')).toThrow();
    expect(()=>validateTrustedHttpsUrl('https://user:pass@login.example.com','OIDC endpoint')).toThrow();
    expect(validateTrustedHttpsUrl('https://tenant.cloudflareaccess.com/cdn-cgi/access/sso/oidc/id','OIDC endpoint').hostname).toBe('tenant.cloudflareaccess.com');
  });
});
