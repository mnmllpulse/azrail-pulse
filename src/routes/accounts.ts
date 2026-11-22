import type { Env } from "../types";
import { getCors } from "../lib/cors";
import { createAccount } from "../lib/accounts";
import { parseInput } from "../lib/validation";
import { accountCreateSchema, accountRevokeSchema, permissionSchema } from "../shared/schemas";

function jsonResponse(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: getCors(env, { "Content-Type": "application/json" }) });
}

export async function accountsRoute(
  request: Request,
  url: URL,
  env: Env,
  parsedBody: Record<string, unknown>,
): Promise<Response | null> {
    if(url.pathname === "/api/admin/accounts" && request.method === "POST") {
      const accountInput=parseInput(accountCreateSchema,parsedBody);
      const account=await createAccount(env,accountInput.name,accountInput.role,accountInput.days);
      return jsonResponse({account},env,201);
    }
    if(url.pathname === "/api/admin/accounts" && request.method === "GET") {
      return jsonResponse({accounts:(await env.AZRAIL_D1.prepare("SELECT id,name,role,expires_at,disabled FROM access_accounts").all()).results},env);
    }
    if(url.pathname === "/api/admin/accounts/revoke" && request.method === "POST") {
      await env.AZRAIL_D1.prepare("UPDATE access_accounts SET disabled=1 WHERE id=?").bind(parseInput(accountRevokeSchema,parsedBody).accountId).run();
      return jsonResponse({success:true},env);
    }
    if(url.pathname === "/api/admin/permissions" && request.method === "POST") {
      const permission=parseInput(permissionSchema,parsedBody);
      const project=permission.projectId,capability=permission.capability;
      const sql=permission.enabled===true?"INSERT OR IGNORE INTO project_permissions(project_id,capability) VALUES(?,?)":"DELETE FROM project_permissions WHERE project_id=? AND capability=?";
      await env.AZRAIL_D1.prepare(sql).bind(project,capability).run();return jsonResponse({success:true},env);
    }
  return null;
}
