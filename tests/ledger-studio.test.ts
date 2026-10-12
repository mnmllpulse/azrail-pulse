import {describe,expect,it} from 'vitest';
import type {Env} from '../src/types';
import {buildLedgerReport,parseLedgerFilters} from '../src/lib/ledger-studio';
import {meteredCall} from '../src/lib/billing';
import {sqliteD1} from './stubs/sqlite-d1';

const principal={id:'acct',role:'editor' as const,name:'Ledger Tester'};

function fixture(){
 const {db,sqlite}=sqliteD1();
 const now=Date.UTC(2026,9,10,12,0,0);
 sqlite.exec(`
  INSERT INTO users(id,email,name) VALUES('u','u@example.test','U');
  INSERT INTO users(id,email,name) VALUES('u2','u2@example.test','U2');
  INSERT INTO projects(id,user_id,name) VALUES('p','u','Project Alpha');
  INSERT INTO projects(id,user_id,name) VALUES('other','u2','Other Project');
  INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('project','p','acct');
  INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('project','other','someone-else');
  INSERT INTO missions(id,project_id,goal,status) VALUES('m','p','Ship Ledger','completed');
  INSERT INTO missions(id,project_id,goal,status) VALUES('other-m','other','Private','completed');
  INSERT INTO task_history(id,project_id,agent,intent,status) VALUES('task-ledger','p','Verifier','verify','completed');
  INSERT INTO spend_limits(scope,limit_micro_usd,spent_micro_usd) VALUES('project:p',1000000,600000);
 `);
 const insert=(id:string,mission:string,started:number,finished:number,actual:number,status='completed')=>sqlite.prepare(`INSERT INTO model_calls(id,scope,model,status,started_at,finished_at,prompt_tokens,completion_tokens,reserved_micro_usd,actual_micro_usd) VALUES(?, ?, '@cf/test/model', ?, ?, ?, 120, 30, 700000, ?)`)
  .run(id,`mission:${mission}`,status,started,finished,actual);
 insert('c-prev','m',now-90*60_000,now-90*60_000+1000,100000);
 insert('c-recent','m',now-30*60_000,now-30*60_000+3200,500000);
 insert('c-private','other-m',now-20*60_000,now-20*60_000+500,999999);
 sqlite.prepare(`INSERT INTO model_call_dimensions(call_id,provider,route_attempt,retry_attempt,created_at) VALUES('c-prev','Cloudflare Workers AI',1,1,?)`).run(now-90*60_000);
 sqlite.prepare(`INSERT INTO model_call_dimensions(call_id,provider,route_attempt,retry_attempt,created_at) VALUES('c-recent','Cloudflare Workers AI',2,3,?)`).run(now-30*60_000);
 sqlite.prepare(`INSERT INTO model_call_dimensions(call_id,provider,route_attempt,retry_attempt,created_at) VALUES('c-private','Private Provider',1,1,?)`).run(now-20*60_000);
 sqlite.prepare(`INSERT INTO trace_links(entity_type,entity_id,request_id,trace_id,mission_id,task_id,model_call_id,created_at) VALUES('model_call','c-recent','request-0001','1234567890abcdef1234567890abcdef','m','task-ledger','c-recent',?)`).run(now-30*60_000);
 return {env:{AZRAIL_D1:db} as Env,sqlite,now};
}

describe('Professional Ledger Studio',()=>{
 it('parses bounded filter windows and rejects unknown status/date values',()=>{
  const now=Date.UTC(2026,9,10,12,0,0);
  const parsed=parseLedgerFilters(new URL('https://azrail.test/api/studio/ledger?date=24h&status=completed&limit=99999&provider=Cloudflare%20Workers%20AI'),now);
  expect(parsed.date).toBe('24h');expect(parsed.status).toBe('completed');expect(parsed.limit).toBe(500);expect(parsed.from).toBe(now-86_400_000);
  const fallback=parseLedgerFilters(new URL('https://azrail.test/api/studio/ledger?date=century&status=made-up'),now);
  expect(fallback.date).toBe('7d');expect(fallback.status).toBe('');
 });

 it('reports only owned calls with professional filters, metrics, budgets and anomaly signals',async()=>{
  const {env,now}=fixture();
  const filters=parseLedgerFilters(new URL('https://azrail.test/api/studio/ledger?date=24h&projectId=p&provider=Cloudflare%20Workers%20AI'),now);
  const report=await buildLedgerReport(env,principal,filters,now);
  expect(report.calls.map(r=>r.id)).toEqual(['c-recent','c-prev']);
  expect(report.calls[0]).toMatchObject({projectId:'p',projectName:'Project Alpha',missionId:'m',provider:'Cloudflare Workers AI',providerSource:'recorded',agent:'Verifier',routeAttempt:2,retryAttempt:3});
  expect(report.metrics).toMatchObject({calls:2,tokens:300,retries:2,errors:0,actualMicroUsd:600000});
  expect(report.metrics.latencyP95Ms).toBe(3200);
  expect(report.overview.budget).toMatchObject({scopeLabel:'Project budget',limitMicroUsd:1000000,committedMicroUsd:600000,remainingMicroUsd:400000});
  expect(report.anomalies.some(a=>a.code==='spend_growth'&&a.value===400)).toBe(true);
  expect(report.available.providers).toContain('Cloudflare Workers AI');
  expect(report.available.projects.some(v=>v.startsWith('p\t'))).toBe(true);
  expect(report.note).toContain('provider invoices');
 });

 it('keeps exact call-time provider/attempt dimensions beside the authoritative model call',async()=>{
  const {db,sqlite}=sqliteD1();
  const env={AZRAIL_D1:db,AZRAIL_METERING:'observe'} as Env;
  const output=await meteredCall(env,'model-x',{prompt:'x'},'account:acct',async()=>({response:'ok',usage:{prompt_tokens:2,completion_tokens:1}}),'account:acct',{provider:'Provider X',routeAttempt:4,retryAttempt:2});
  expect(output).toMatchObject({response:'ok'});
  const row=sqlite.prepare('SELECT provider,route_attempt,retry_attempt FROM model_call_dimensions').get() as Record<string,unknown>;
  expect(row).toMatchObject({provider:'Provider X',route_attempt:4,retry_attempt:2});
 });
});
