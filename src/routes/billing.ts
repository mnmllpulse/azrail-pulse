import type { Env } from "../types";
import { getCors } from "../lib/cors";
import { parseInput } from "../lib/validation";
import { billingUpdateSchema } from "../shared/schemas";
import { reconcileModelCall } from "../lib/billing";

function jsonResponse(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: getCors(env, { "Content-Type": "application/json" }) });
}

export async function billingRoute(
  request: Request,
  url: URL,
  env: Env,
  parsedBody: Record<string, unknown>,
): Promise<Response | null> {
    if(url.pathname === "/api/admin/billing" && request.method === "GET") {
      const limits=await env.AZRAIL_D1.prepare("SELECT * FROM spend_limits ORDER BY scope LIMIT 100").all();
      const prices=await env.AZRAIL_D1.prepare("SELECT * FROM model_prices ORDER BY model LIMIT 200").all();
      const unresolved=await env.AZRAIL_D1.prepare(`SELECT id,scope,model,status,started_at,finished_at,reserved_micro_usd,actual_micro_usd,error
        FROM model_calls WHERE status IN ('uncertain','unpriced') ORDER BY started_at DESC LIMIT 100`).all();
      return jsonResponse({limits:limits.results,prices:prices.results,unresolved:unresolved.results,mode:env.AZRAIL_METERING??"off"},env);
    }
    if(url.pathname === "/api/admin/billing" && request.method === "POST") {
      parseInput(billingUpdateSchema,parsedBody);
      if(parsedBody.reconcileCallId) {
        try {
          return jsonResponse({reconciled:await reconcileModelCall(env,String(parsedBody.reconcileCallId),Number(parsedBody.actualMicroUsd),String(parsedBody.evidence??''))},env);
        } catch(error) {
          return jsonResponse({error:error instanceof Error?error.message:String(error)},env,409);
        }
      }
      if(parsedBody.model) {
        const input=Number(parsedBody.inputRate),output=Number(parsedBody.outputRate);
        if(!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||input<0||output<0||input>1e12||output>1e12) return jsonResponse({error:"Тарифы задаются в micro-USD за миллион токенов, от 0 до 1e12."},env,400);
        await env.AZRAIL_D1.prepare("INSERT INTO model_prices VALUES(?,?,?,?) ON CONFLICT(model) DO UPDATE SET input_micro_usd_per_million=excluded.input_micro_usd_per_million,output_micro_usd_per_million=excluded.output_micro_usd_per_million,updated_at=excluded.updated_at").bind(String(parsedBody.model),input,output,Date.now()).run();
      } else {
        const usd=Number(parsedBody.usd),scope=String(parsedBody.scope??"global");
        if(!Number.isFinite(usd)||usd<=0||usd>1000||scope.length>256)return jsonResponse({error:"Допустимый бюджет: больше 0, до 1000 USD; область до 256 символов."},env,400);
        await env.AZRAIL_D1.prepare("INSERT INTO spend_limits(scope,limit_micro_usd) VALUES(?,?) ON CONFLICT(scope) DO UPDATE SET limit_micro_usd=excluded.limit_micro_usd").bind(scope,Math.floor(usd*1e6)).run();
      }
      return jsonResponse({success:true,mode:env.AZRAIL_METERING??"off"},env);
    }
  return null;
}
