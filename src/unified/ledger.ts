import type { Env } from '../types';
import type { ResourceReservation, ResourceUnit } from './contracts';
export class BudgetError extends Error {}
export async function ensureBudget(env:Env,scope:string,unit:ResourceUnit,limit:number) {
 if(!Number.isSafeInteger(limit)||limit<0)throw new BudgetError('Invalid budget');
 await env.AZRAIL_D1.prepare('INSERT INTO resource_budgets(scope,unit,limit_units) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(scope,unit,limit).run();
}
/** D1 batch is a transaction: concurrent reservations cannot overspend this scope. */
export async function reserve(env:Env,r:ResourceReservation):Promise<'new'|'existing'> {
 if(!Number.isSafeInteger(r.upperBound)||r.upperBound<0)throw new BudgetError('Invalid reservation');
 const old=await env.AZRAIL_D1.prepare('SELECT fingerprint,status FROM resource_ledger WHERE id=?').bind(r.id).first<{fingerprint:string;status:string}>();
 if(old) { if(old.fingerprint!==r.fingerprint)throw new BudgetError('Idempotency conflict');return 'existing'; }
 const results=await env.AZRAIL_D1.batch([
  env.AZRAIL_D1.prepare(`INSERT OR IGNORE INTO resource_ledger(id,scope,unit,resource,fingerprint,status,reserved_units,created_at)
   SELECT ?,?,?,?,?, 'reserved',?,? FROM resource_budgets WHERE scope=? AND unit=? AND committed_units+?<=limit_units`)
   .bind(r.id,r.scope,r.unit,r.resource,r.fingerprint,r.upperBound,Date.now(),r.scope,r.unit,r.upperBound),
  env.AZRAIL_D1.prepare(`UPDATE resource_budgets SET committed_units=committed_units+?
   WHERE scope=? AND unit=? AND changes()=1`).bind(r.upperBound,r.scope,r.unit),
 ]);
 if(results[0].meta.changes)return 'new';
 const concurrent=await env.AZRAIL_D1.prepare('SELECT fingerprint FROM resource_ledger WHERE id=?').bind(r.id).first<{fingerprint:string}>();
 if(concurrent?.fingerprint===r.fingerprint)return 'existing';
 throw new BudgetError('Лимит ресурсов исчерпан. Операция не запущена.');
}
export async function settle(env:Env,id:string,actual:number|null,evidence:string) {
 const r=await env.AZRAIL_D1.prepare('SELECT * FROM resource_ledger WHERE id=?').bind(id).first<{scope:string;unit:string;reserved_units:number;status:string}>();
 if(!r||!['reserved','uncertain'].includes(r.status))return;
 if(actual!==null&&(!Number.isSafeInteger(actual)||actual<0))throw new BudgetError('Invalid actual usage');
 if(actual!==null&&actual>r.reserved_units) {
  // Never conceal an under-estimate. Stop future calls until the operator reconciles.
  await env.AZRAIL_D1.prepare('UPDATE resource_budgets SET limit_units=0 WHERE scope=? AND unit=?').bind(r.scope,r.unit).run();
 }
 await env.AZRAIL_D1.batch([
  env.AZRAIL_D1.prepare(`UPDATE resource_ledger SET status=?,actual_units=?,finished_at=?,evidence=? WHERE id=? AND status IN ('reserved','uncertain')`)
   .bind(actual===null?'uncertain':actual===0?'released':'settled',actual,Date.now(),evidence.slice(0,2000),id),
  env.AZRAIL_D1.prepare('UPDATE resource_budgets SET committed_units=committed_units+? WHERE scope=? AND unit=? AND changes()=1')
   .bind((actual??r.reserved_units)-r.reserved_units,r.scope,r.unit),
 ]);
}
export async function accountCall<T>(env:Env,resource:string,invoke:()=>Promise<T>):Promise<T> {
 if(env.UNIFIED_LEDGER!=='true')return invoke(); // Compatibility for the original engine installation.
 const scope=`platform:${new Date().toISOString().slice(0,10)}`;
 const id=crypto.randomUUID();
 await ensureBudget(env,scope,'request',Number(env.DAILY_PROVIDER_CALLS??200));
 // Config reductions apply today, including zero. Preserve a fail-closed budget
 // if an earlier settlement exceeded its reservation.
 await env.AZRAIL_D1.prepare(`UPDATE resource_budgets SET limit_units=CASE
  WHEN EXISTS(SELECT 1 FROM resource_ledger WHERE scope=? AND unit='request' AND actual_units>reserved_units)
  THEN 0 ELSE ? END WHERE scope=? AND unit='request'`)
  .bind(scope,Number(env.DAILY_PROVIDER_CALLS??200),scope).run();
 await reserve(env,{id,scope,unit:'request',resource,upperBound:1,fingerprint:id});
 let result:T;
 try { result=await invoke(); }
 catch(error) { await settle(env,id,null,'Provider outcome unknown; reservation retained').catch(()=>{});throw error; }
 // The full unit is already reserved. A settlement outage must not discard a
 // valid provider result; a retained reservation remains conservative accounting.
 await settle(env,id,1,'Provider returned').catch(()=>{});return result;
}
