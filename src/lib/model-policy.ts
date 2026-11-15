import { accountCall, BudgetError, ensureBudget, reserve, settle } from "../unified/ledger";
import type { Env } from "../types";
import { MODEL_REGISTRY, type ModelEntry } from "./model-registry";
import { meteredCall } from "./billing";
import { dailyNeuronCap, isNeuronMetered, NeuronBudgetError, neuronsFor, neuronUpperBound } from "./neuron-paid";
import { extractUsage } from "./usage";
import type { TraceContext } from "./observability-context";

export interface ModelCallDimensions { routeAttempt?:number; retryAttempt?:number; }

// Explicit reviewed subset, NOT every @cf model: some hosted models require Paid.
// API catalog + Workers AI pricing checked 2026-09-25. Refresh in a reviewed release.
export const FREE_MODEL_SLUGS = new Set([
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/openai/gpt-oss-20b",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/baai/bge-m3",
]);

// Картинки и расшифровка идут мимо чатового списка, но воркер их вызывает.
const STUDIO_RUN_SLUGS = new Set([
  "@cf/black-forest-labs/flux-2-klein-4b",
  "@cf/black-forest-labs/flux-2-klein-9b",
  "@cf/openai/whisper-large-v3-turbo",
]);

export function freeWorkerCanRun(slug: string): boolean {
  return FREE_MODEL_SLUGS.has(slug) || STUDIO_RUN_SLUGS.has(slug);
}

export function catalogAvailability(slug: string, env: Pick<Env, "AZRAIL_WORKERS_PLAN" | "AZRAIL_FORCE_FREE">): "available" | "unavailable" {
  const paid = env.AZRAIL_WORKERS_PLAN === "paid" && env.AZRAIL_FORCE_FREE !== "true";
  if (paid) return "available";
  return freeWorkerCanRun(slug) ? "available" : "unavailable";
}

export interface ModelPolicy {
  allowThirdPartyModels: boolean;
  monthlyBudgetUsd: number;
  forceFree: boolean;
  ready: boolean;
  revision: number;
}
export class ModelPolicyError extends Error {}

export async function readModelPolicy(env: Env): Promise<ModelPolicy> {
  const fallback: ModelPolicy = { allowThirdPartyModels: false, monthlyBudgetUsd: 0,
    forceFree: env.AZRAIL_FORCE_FREE === "true", ready: false, revision: 0 };
  try {
    // Never cache: OFF must be seen by nested agents and the next retry.
    const row = await env.AZRAIL_D1.prepare("SELECT allow_third_party,monthly_micro_usd,revision FROM model_routing_settings WHERE id=1")
      .first<{allow_third_party:number;monthly_micro_usd:number;revision:number}>();
    return { ...fallback, ready: true, revision: row?.revision ?? 0,
      allowThirdPartyModels: !fallback.forceFree && row?.allow_third_party === 1,
      monthlyBudgetUsd: (row?.monthly_micro_usd ?? 0) / 1e6 };
  } catch { return fallback; } // Missing migration or storage outage -> free-only.
}

export async function setModelPolicy(env: Env, enabled: unknown, budget: unknown): Promise<ModelPolicy> {
  if (typeof enabled !== "boolean") throw new ModelPolicyError("Режим должен быть true или false.");
  const usd = Number(budget);
  if (!Number.isFinite(usd) || usd < 0 || !Number.isSafeInteger(Math.round(usd * 1e6)))
    throw new ModelPolicyError("Укажите неотрицательный месячный бюджет в USD.");
  if (enabled && (env.AZRAIL_FORCE_FREE === "true" || !env.AI_GATEWAY_ID || usd <= 0))
    throw new ModelPolicyError("Для включения нужны AI Gateway, ваш бюджет больше нуля и разрешённый Hybrid-профиль.");
  // OFF does not erase spend. Re-enabling cannot reset the month's reservations.
  await env.AZRAIL_D1.prepare(`INSERT INTO model_routing_settings(id,allow_third_party,monthly_micro_usd,revision)
    VALUES(1,?,?,1) ON CONFLICT(id) DO UPDATE SET allow_third_party=excluded.allow_third_party,
    monthly_micro_usd=excluded.monthly_micro_usd,revision=model_routing_settings.revision+1`)
    .bind(enabled ? 1 : 0, Math.round(usd * 1e6)).run();
  return readModelPolicy(env);
}

export function modelBlockReason(model: ModelEntry, policy: ModelPolicy, env: Pick<Env,"AI_GATEWAY_ID"|"AZRAIL_WORKERS_PLAN"|"AZRAIL_FORCE_FREE">): string | null {
  if (FREE_MODEL_SLUGS.has(model.slug) && !model.requiresGateway) return null;
  if (isNeuronMetered(model.slug)) return env.AZRAIL_WORKERS_PLAN === "paid" && env.AZRAIL_FORCE_FREE !== "true" ? null : "Требуется Workers Paid";
  if (!policy.allowThirdPartyModels) return "Сторонние и платные модели выключены";
  if (model.requiresGateway && !env.AI_GATEWAY_ID) return "AI Gateway не настроен";
  if (!model.requiresGateway && env.AZRAIL_WORKERS_PLAN !== "paid") return "Требуется Workers Paid";
  return null;
}

export async function eligibleRegistry(env: Env): Promise<ModelEntry[]> {
  const policy = await readModelPolicy(env);
  return MODEL_REGISTRY.filter(m => !modelBlockReason(m, policy, env));
}


/** Платная модель из разрешённого набора: суточный потолок в нейронах через общий ledger, без денежного бюджета. */
async function neuronMeteredCall(env: Env, model: ModelEntry, input: Record<string,unknown>, scope: string, trace?:TraceContext, dimensions:ModelCallDimensions={}): Promise<unknown> {
  const budgetScope = `neurons:${new Date().toISOString().slice(0,10)}`;
  const cap = dailyNeuronCap(env.AZRAIL_DAILY_NEURONS);
  const id = crypto.randomUUID();
  let upper = 0;
  // Резерв берётся до отправки: отказ по лимиту фиксируется как cancelled («не отправлено»), а не как uncertain.
  const beforeInvoke = async () => {
    await ensureBudget(env, budgetScope, "neuron", cap);
    // Снижение потолка действует сегодня же; недооценка раньше закрыла день навсегда.
    await env.AZRAIL_D1.prepare(`UPDATE resource_budgets SET limit_units=CASE
      WHEN EXISTS(SELECT 1 FROM resource_ledger WHERE scope=? AND unit='neuron' AND actual_units>reserved_units)
      THEN 0 ELSE ? END WHERE scope=? AND unit='neuron'`).bind(budgetScope, cap, budgetScope).run();
    const maxTokens = Number(input.max_tokens) > 0 ? Number(input.max_tokens) : 4096;
    upper = neuronUpperBound(model.slug, new TextEncoder().encode(JSON.stringify(input)).byteLength, maxTokens);
    try {
      await reserve(env, {id, scope: budgetScope, unit: "neuron", resource: model.slug, upperBound: upper, fingerprint: id});
    } catch (error) {
      if (error instanceof BudgetError) throw new NeuronBudgetError();
      throw error;
    }
  };
  return meteredCall({...env, AZRAIL_METERING: env.AZRAIL_METERING ? "observe" : undefined},
    model.slug, input, scope, async () => {
      let output: unknown;
      try {
        output = await env.AI.run(model.slug, input);
      } catch (error) {
        await settle(env, id, 0, `Provider error: ${error instanceof Error ? error.message : String(error)}`).catch(() => {});
        throw error;
      }
      const usage = extractUsage(output);
      await settle(env, id, usage ? neuronsFor(model.slug, usage) : upper,
        usage ? "Usage from response" : "No usage in response; upper bound charged").catch(() => {});
      return output;
    }, scope, {invokeTimeoutMs:55_000, trace, provider:model.provider, beforeInvoke, ...dimensions});
}

/** The only text-model provider boundary. Rechecked for EVERY attempt. */
async function policyModelCallInternal(env: Env, model: ModelEntry, input: Record<string,unknown>, scope: string, trace?:TraceContext, dimensions:ModelCallDimensions={}): Promise<unknown> {
  const policy = await readModelPolicy(env);
  const blocked = modelBlockReason(model, policy, env);
  if (blocked) throw new ModelPolicyError(blocked);
  if (isNeuronMetered(model.slug)) return neuronMeteredCall(env, model, input, scope, trace, dimensions);
  const free = FREE_MODEL_SLUGS.has(model.slug) && !model.requiresGateway;
  if (free) {
    // Direct binding: do not attach a gateway even if one exists in this account.
    return meteredCall({...env, AZRAIL_METERING: env.AZRAIL_METERING ? "observe" : undefined},
      model.slug, input, scope, () => env.AI.run(model.slug, input), scope, {invokeTimeoutMs:55_000,trace,provider:model.provider,...dimensions});
  }
  const price = await env.AZRAIL_D1.prepare("SELECT updated_at FROM model_prices WHERE model=?")
    .bind(model.slug).first<{updated_at:number}>();
  if (!price || Date.now() - price.updated_at > 7 * 86400_000)
    throw new ModelPolicyError("Нет свежего проверенного тарифа. Обновите тариф перед платным вызовом.");
  const budgetScope = `paid-month:${new Date().toISOString().slice(0,7)}`;
  // Read the limit from the current settings inside D1, never from an earlier snapshot.
  await env.AZRAIL_D1.prepare(`INSERT INTO spend_limits(scope,limit_micro_usd)
    SELECT ?,monthly_micro_usd FROM model_routing_settings WHERE id=1
    ON CONFLICT(scope) DO UPDATE SET limit_micro_usd=excluded.limit_micro_usd`)
    .bind(budgetScope).run();
  return meteredCall({...env, AZRAIL_METERING:"enforce"}, model.slug, input, scope, () =>
    (model.requiresGateway
      ? env.AI.run(model.slug, input, {gateway:{id:env.AI_GATEWAY_ID!}})
      : env.AI.run(model.slug, input)).catch(() => {
        throw new ModelPolicyError("Платный вызов имеет неопределённый результат. Резерв сохранён; автоматический повтор отключён.");
      }), budgetScope, {
    policyRevision:policy.revision,
    additionalBudgetScopes:scope.startsWith("mission:")?[scope]:[],
    invokeTimeoutMs:55_000,
    trace,
    provider:model.provider,
    ...dimensions,
    beforeInvoke:async()=>{
      const current=await readModelPolicy(env);
      if(!current.allowThirdPartyModels||current.revision!==policy.revision)
        throw new ModelPolicyError("Настройки оплаты изменились. Вызов остановлен до отправки.");
    },
  });
}

export async function policyModelCall(env:Env,model:ModelEntry,input:Record<string,unknown>,scope:string,trace?:TraceContext,dimensions:ModelCallDimensions={}):Promise<unknown> {
 return accountCall(env,model.slug,()=>policyModelCallInternal(env,model,input,scope,trace,dimensions));
}
