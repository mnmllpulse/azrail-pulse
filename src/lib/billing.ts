import type { Env } from "../types";
import { extractUsage } from "./usage";
import { withTimeout, TimeoutError } from "./resilience";
import { childTrace, linkTrace, type TraceContext } from "./observability-context";

interface MeterOptions {
  /** Runs after reservation but before any provider request. A rejection releases it. */
  beforeInvoke?:()=>Promise<void>;
  additionalBudgetScopes?:string[];
  policyRevision?:number;
  /** Provider deadline inside the accounting boundary; timeout becomes uncertain. */
  invokeTimeoutMs?:number;
  /** Cross-subsystem correlation. Linked to the durable model_calls row. */
  trace?:TraceContext;
  /** Stable reporting dimension captured at call time. */
  provider?:string;
  /** Candidate number in model routing (1 = first-choice model). */
  routeAttempt?:number;
  /** Retry number for the same candidate (1 = initial dispatch). */
  retryAttempt?:number;
}
interface BudgetScopeRow {scope:string;reserved_micro_usd:number;actual_micro_usd:number|null;reconciled_at:number|null;}
interface ModelCallRow {id:string;scope:string;model:string;status:string;reserved_micro_usd:number;actual_micro_usd:number|null;}

export class ProviderOutcomeUncertainError extends Error {
  constructor(model:string,cause:unknown) {
    super(`Исход уже отправленного provider-запроса ${model} неопределён; автоматический повтор запрещён: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "ProviderOutcomeUncertainError";
  }
}

function isAmbiguousProviderFailure(error:unknown):boolean {
  if(error instanceof TimeoutError)return true;
  const text=error instanceof Error?`${error.name}: ${error.message}`:String(error);
  return /network|fetch failed|econnreset|econnaborted|socket|connection (?:reset|closed)|stream.*closed|unexpected eof|aborted/i.test(text);
}

export async function meteredCall<T>(env:Env,model:string,input:unknown,scope:string,invoke:()=>Promise<T>,budgetScope=scope,options:MeterOptions={}):Promise<T> {
  if(!env.AZRAIL_METERING) {
    await options.beforeInvoke?.();
    return options.invokeTimeoutMs ? withTimeout(invoke(),options.invokeTimeoutMs,`provider:${model}`) : invoke();
  }
  if(!["observe","enforce"].includes(env.AZRAIL_METERING)) throw new Error("Некорректный режим AZRAIL_METERING; вызов заблокирован.");
  const id=crypto.randomUUID(),started=Date.now(),strict=env.AZRAIL_METERING==="enforce";
  const provider=(options.provider??"unknown").trim().slice(0,120)||"unknown";
  const routeAttempt=Math.max(1,Math.min(128,Math.trunc(options.routeAttempt??1)));
  const retryAttempt=Math.max(1,Math.min(16,Math.trunc(options.retryAttempt??1)));
  const price=await env.AZRAIL_D1.prepare("SELECT input_micro_usd_per_million AS i,output_micro_usd_per_million AS o FROM model_prices WHERE model=?")
    .bind(model).first<{i:number;o:number}>();
  if(strict && (!price || ![price.i,price.o].every(n=>Number.isSafeInteger(n)&&n>=0)))throw new Error(`Нет проверенного тарифа модели ${model}. Вызов заблокирован.`);
  const data=input&&typeof input==="object"?input as Record<string,unknown>:{};
  const generatesText=Array.isArray(data.messages)||typeof data.prompt==='string'||data.max_tokens!==undefined;
  const requested=Number(data.max_tokens);
  const outputCap=generatesText?(Number.isFinite(requested)&&requested>0?Math.min(32768,Math.floor(requested)):4096):0;
  // Embedding/image/audio inputs must not receive a text-generation parameter.
  if(generatesText)data.max_tokens=outputCap;
  const inputCap=new TextEncoder().encode(JSON.stringify(input)).byteLength;
  const reserved=price?Math.ceil((inputCap*price.i+outputCap*price.o)/1_000_000):0;
  if(!Number.isSafeInteger(reserved)||reserved<0)throw new Error("Некорректная оценка стоимости.");
  const scopes=[...new Set([budgetScope,...options.additionalBudgetScopes??[]])];
  const placeholders=scopes.map(()=>'?').join(',');
  if(strict){
    // Call record, hierarchical budget reservations and their reconciliation map
    // are one D1 transaction. Without the map an uncertain call cannot later be
    // released/settled safely because model_calls.scope stores only one scope.
    const revisionClause=options.policyRevision===undefined?'':" AND EXISTS(SELECT 1 FROM model_routing_settings WHERE id=1 AND allow_third_party=1 AND revision=?)";
    const insert=env.AZRAIL_D1.prepare(`INSERT INTO model_calls(id,scope,model,status,started_at,reserved_micro_usd)
      SELECT ?,?,?,'running',?,? WHERE (SELECT COUNT(*) FROM spend_limits
        WHERE scope IN (${placeholders}) AND spent_micro_usd+?<=limit_micro_usd)=?${revisionClause} RETURNING id`)
      .bind(id,scope,model,started,reserved,...scopes,reserved,scopes.length,...(options.policyRevision===undefined?[]:[options.policyRevision]));
    const statements=[
      insert,
      env.AZRAIL_D1.prepare(`INSERT INTO model_call_dimensions(call_id,provider,route_attempt,retry_attempt,created_at)
        SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM model_calls WHERE id=?)`).bind(id,provider,routeAttempt,retryAttempt,started,id),
      env.AZRAIL_D1.prepare(`UPDATE spend_limits SET spent_micro_usd=spent_micro_usd+?
        WHERE scope IN (${placeholders}) AND EXISTS(SELECT 1 FROM model_calls WHERE id=?)`).bind(reserved,...scopes,id),
      ...scopes.map(s=>env.AZRAIL_D1.prepare(`INSERT INTO model_call_budget_scopes(call_id,scope,reserved_micro_usd)
        SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM model_calls WHERE id=?)`).bind(id,s,reserved,id)),
    ];
    const result=await env.AZRAIL_D1.batch(statements);
    if(!result[0].results?.length)throw new Error("Денежный бюджет отсутствует, исчерпан или настройки оплаты изменились.");
  }else{
    await env.AZRAIL_D1.batch([
      env.AZRAIL_D1.prepare("INSERT INTO model_calls(id,scope,model,status,started_at,reserved_micro_usd) VALUES(?,?,?,'running',?,?)")
        .bind(id,scope,model,started,reserved),
      env.AZRAIL_D1.prepare(`INSERT INTO model_call_dimensions(call_id,provider,route_attempt,retry_attempt,created_at)
        SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM model_calls WHERE id=?)`).bind(id,provider,routeAttempt,retryAttempt,started,id),
    ]);
  }
  if(options.trace)await linkTrace(env,"model_call",id,childTrace(options.trace,{modelCallId:id}));
  try{await options.beforeInvoke?.();}
  catch(err){
    const now=Date.now();
    const statements=[env.AZRAIL_D1.prepare("UPDATE model_calls SET status='cancelled',finished_at=?,error='not sent' WHERE id=?").bind(now,id)];
    if(strict){
      statements.push(env.AZRAIL_D1.prepare("UPDATE model_call_budget_scopes SET actual_micro_usd=0,reconciled_at=? WHERE call_id=? AND reconciled_at IS NULL").bind(now,id));
      statements.push(env.AZRAIL_D1.prepare(`UPDATE spend_limits SET spent_micro_usd=MAX(0,spent_micro_usd-?) WHERE scope IN (${placeholders})`).bind(reserved,...scopes));
    }
    await env.AZRAIL_D1.batch(statements);throw err;
  }
  let result:T;
  try{result=options.invokeTimeoutMs ? await withTimeout(invoke(),options.invokeTimeoutMs,`provider:${model}`) : await invoke();}
  catch(err){
    // Provider dispatch may have happened. Retain every hierarchical reservation
    // and leave the mapping unresolved for explicit operator reconciliation.
    await env.AZRAIL_D1.prepare("UPDATE model_calls SET status='uncertain',finished_at=?,error='provider failure; reservation retained' WHERE id=?").bind(Date.now(),id).run();
    if(isAmbiguousProviderFailure(err))throw new ProviderOutcomeUncertainError(model,err);
    throw err;
  }
  const usage=extractUsage(result),rawUsage=(result as {usage?:Record<string,unknown>}|null)?.usage;
  const validCount=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
  const complete=rawUsage&&validCount(rawUsage.prompt_tokens??rawUsage.input_tokens)&&validCount(rawUsage.completion_tokens??rawUsage.output_tokens);
  const actual=price&&usage&&complete?Math.ceil((usage.promptTokens*price.i+usage.completionTokens*price.o)/1_000_000):null;
  const now=Date.now();
  const statements=[env.AZRAIL_D1.prepare("UPDATE model_calls SET status=?,finished_at=?,prompt_tokens=?,completion_tokens=?,actual_micro_usd=? WHERE id=?")
    .bind(actual===null?'unpriced':'completed',now,usage?.promptTokens??null,usage?.completionTokens??null,actual,id)];
  if(strict&&actual!==null){
    statements.push(env.AZRAIL_D1.prepare("UPDATE model_call_budget_scopes SET actual_micro_usd=?,reconciled_at=? WHERE call_id=? AND reconciled_at IS NULL").bind(actual,now,id));
    statements.push(env.AZRAIL_D1.prepare(`UPDATE spend_limits SET spent_micro_usd=MAX(0,spent_micro_usd+?) WHERE scope IN (${placeholders})`).bind(actual-reserved,...scopes));
  }
  await env.AZRAIL_D1.batch(statements);return result;
}

/**
 * Manual, explicit reconciliation for a provider outcome that was uncertain or
 * returned no trustworthy usage. The hierarchical reservation map is required;
 * older calls without it are intentionally left untouched rather than guessed.
 */
export async function reconcileModelCall(env:Env,id:string,actualMicroUsd:number,evidence:string):Promise<{id:string;status:string;actualMicroUsd:number;scopes:number}> {
  const actual=Number(actualMicroUsd),note=evidence.trim().slice(0,1000);
  if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error("Некорректный id вызова.");
  if(!Number.isSafeInteger(actual)||actual<0||actual>1_000_000_000_000)throw new Error("Некорректная фактическая стоимость.");
  if(note.length<3)throw new Error("Для сверки требуется краткое подтверждение источника результата.");
  const call=await env.AZRAIL_D1.prepare("SELECT id,scope,model,status,reserved_micro_usd,actual_micro_usd FROM model_calls WHERE id=?")
    .bind(id).first<ModelCallRow>();
  if(!call)throw new Error("Вызов модели не найден.");
  if(!["uncertain","unpriced"].includes(call.status))throw new Error(`Сверка недоступна для статуса ${call.status}.`);
  const {results}=await env.AZRAIL_D1.prepare("SELECT scope,reserved_micro_usd,actual_micro_usd,reconciled_at FROM model_call_budget_scopes WHERE call_id=? ORDER BY scope")
    .bind(id).all<BudgetScopeRow>();
  if(!results?.length)throw new Error("Нет карты бюджетных резервов этого вызова; автоматическая корректировка запрещена.");
  if(results.some(r=>r.reconciled_at!==null))throw new Error("Бюджет этого вызова уже частично или полностью сверялся; нужна ручная проверка.");
  const covered=await env.AZRAIL_D1.prepare(`SELECT COUNT(*) AS n FROM model_call_budget_scopes m
    JOIN spend_limits s ON s.scope=m.scope WHERE m.call_id=?`).bind(id).first<{n:number}>();
  if((covered?.n??0)!==results.length)throw new Error("Карта бюджетов неполна: одна из областей лимита отсутствует. Сверка заблокирована.");
  const now=Date.now(),statements:D1PreparedStatement[]=[];
  for(const r of results){
    const delta=actual-r.reserved_micro_usd;
    statements.push(env.AZRAIL_D1.prepare(`UPDATE model_call_budget_scopes SET actual_micro_usd=?,reconciled_at=?
      WHERE call_id=? AND scope=? AND reconciled_at IS NULL
      AND EXISTS(SELECT 1 FROM model_calls WHERE id=? AND status IN ('uncertain','unpriced'))`).bind(actual,now,id,r.scope,id));
    // changes() refers to the immediately preceding statement inside the same
    // sequential D1 batch. It makes a repeated/concurrent reconciliation unable
    // to charge the same scope twice.
    statements.push(env.AZRAIL_D1.prepare("UPDATE spend_limits SET spent_micro_usd=MAX(0,spent_micro_usd+?) WHERE scope=? AND changes()=1").bind(delta,r.scope));
  }
  statements.push(env.AZRAIL_D1.prepare(`UPDATE model_calls SET status='completed',finished_at=?,actual_micro_usd=?,error=?
    WHERE id=? AND status IN ('uncertain','unpriced')`).bind(now,actual,`reconciled: ${note}`,id));
  const batch=await env.AZRAIL_D1.batch(statements);
  const final=batch.at(-1);
  if(!final?.meta?.changes)throw new Error("Состояние вызова изменилось во время сверки; повторная корректировка запрещена.");
  return {id,status:"completed",actualMicroUsd:actual,scopes:results.length};
}

export async function initializeMissionBudget(env:Env,mission:string):Promise<void> {
  const usd=Number(env.AZRAIL_MISSION_BUDGET_USD??"1");
  if(!Number.isFinite(usd)||usd<=0||usd>1000)throw new Error("Некорректный бюджет миссии.");
  await env.AZRAIL_D1.prepare("INSERT OR IGNORE INTO spend_limits(scope,limit_micro_usd) VALUES(?,?)").bind(`mission:${mission}`,Math.floor(usd*1_000_000)).run();
}
