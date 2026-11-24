import type { Env } from "../types";
import { getCors } from "../lib/cors";
import { readModelPolicy, setModelPolicy, ModelPolicyError } from "../lib/model-policy";
import { readPermissionMode, writePermissionMode } from "../lib/permission-setting";
import { readTrial, runTrialSandbox, trialView, writeTrialFlags } from "../lib/trial";
import { openRouterStatus, syncOpenRouter } from "../lib/openrouter-sync";
import { readLiveCatalog } from "../lib/model-catalog";
import { AccessError, type Principal } from "../lib/accounts";

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: getCors(env, { "Content-Type": "application/json" }) });
}

/** Настройки маршрутизации моделей, режим разрешений, пробные функции, OpenRouter и каталог моделей. */
export async function settingsRoute(
  request: Request,
  url: URL,
  env: Env,
  principal: Principal,
  parsedBody: Record<string, unknown>,
): Promise<Response | null> {
    if (url.pathname === "/api/routing-settings" && request.method === "GET") {
      const policy = await readModelPolicy(env);
      const month = `paid-month:${new Date().toISOString().slice(0,7)}`;
      const spend = await env.AZRAIL_D1.prepare("SELECT spent_micro_usd FROM spend_limits WHERE scope=?").bind(month).first<{spent_micro_usd:number}>();
      return json({policy, gatewayConfigured:!!env.AI_GATEWAY_ID, workersPlan:env.AZRAIL_WORKERS_PLAN??"unknown",
        committedUsd:(spend?.spent_micro_usd??0)/1e6, month:month.slice(11),
        note:"OFF блокирует платные маршруты AZRAIL. Квоты Workers, R2 и других сервисов учитываются отдельно."},env);
    }
    if (url.pathname === "/api/admin/routing-settings" && request.method === "POST") {
      try { return json({policy:await setModelPolicy(env,parsedBody.allowThirdPartyModels,parsedBody.monthlyBudgetUsd)},env); }
      catch (e) { if(e instanceof ModelPolicyError) return json({error:e.message},env,400); throw e; }
    }
    if (url.pathname === "/api/permission-mode" && request.method === "GET") {
      return json({ mode: await readPermissionMode(env), options: ["ask", "trusted"] }, env);
    }
    if (url.pathname === "/api/admin/permission-mode" && request.method === "POST") {
      if (principal.role !== "admin" && !principal.operator) return json({ error: "Режим меняет только владелец." }, env, 403);
      try { return json({ mode: await writePermissionMode(env, parsedBody.mode) }, env); }
      catch (error) { if (error instanceof RangeError) return json({ error: error.message }, env, 400); throw error; }
    }
    if (url.pathname === "/api/trial" && request.method === "GET") {
      return json(trialView(await readTrial(env)), env);
    }
    if (url.pathname === "/api/admin/trial" && request.method === "POST") {
      const speech = parsedBody.speech;
      const sandbox = parsedBody.sandbox;
      if (speech !== undefined && typeof speech !== "boolean") return json({ error: "Озвучка включается только да или нет." }, env, 400);
      if (sandbox !== undefined && typeof sandbox !== "boolean") return json({ error: "Команды включаются только да или нет." }, env, 400);
      return json(await writeTrialFlags(env, {
        speech: typeof speech === "boolean" ? speech : undefined,
        sandbox: typeof sandbox === "boolean" ? sandbox : undefined,
      }), env);
    }
    if (url.pathname === "/api/trial/sandbox" && request.method === "POST") {
      if (principal.role !== "admin" && !principal.operator) {
        return json({ error: "Команды пока открыты только владельцу." }, env, 403);
      }
      try {
        return json(await runTrialSandbox(env, String(parsedBody.projectId ?? "")), env);
      } catch (error) {
        if (error instanceof AccessError) return json({ error: error.message }, env, error.status);
        throw error;
      }
    }
    if (url.pathname === "/api/openrouter-status" && request.method === "GET") {
      return json({ configured: !!env.OPENROUTER_API_KEY?.trim(), status: await openRouterStatus(env) }, env);
    }
    if (url.pathname === "/api/admin/openrouter-refresh" && request.method === "POST") {
      if (principal.role !== "admin" && !principal.operator) return json({ error: "Список обновляет только владелец." }, env, 403);
      try { return json({ status: await syncOpenRouter(env, { force: true }) }, env); }
      catch (error) { return json({ error: error instanceof Error ? error.message : "Не удалось обновить список." }, env, 502); }
    }
    if (url.pathname === "/api/model-catalog" && request.method === "GET") {
      return json(await readLiveCatalog(env),env);
    }
  return null;
}
