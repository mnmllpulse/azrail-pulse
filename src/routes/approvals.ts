import type { Env } from "../types";
import { getCors } from "../lib/cors";
import type { Principal } from "../lib/accounts";
import { parseInput, queryObject } from "../lib/validation";
import { approvalListQuerySchema, approvalDecisionSchema } from "../shared/schemas";
import { decideApproval, getApproval, listApprovals } from "../lib/approval-engine";
import type { ApprovalStatus } from "../lib/approval-types";

function jsonResponse(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: getCors(env, { "Content-Type": "application/json" }) });
}

export async function approvalsRoute(
  request: Request,
  url: URL,
  env: Env,
  principal: Principal,
  parsedBody: Record<string, unknown>,
): Promise<Response | null> {
    if(url.pathname === "/api/approvals" && request.method === "GET") {
      const query = parseInput(approvalListQuerySchema, queryObject(url));
      const approvals = await listApprovals(env,{
        accountId: principal.role === "admin" ? undefined : principal.id,
        projectId: query.projectId,
        missionId: query.missionId,
        status: query.status as ApprovalStatus | undefined,
        limit: query.limit,
      });
      return jsonResponse({approvals},env);
    }
    const approvalItem = url.pathname.match(/^\/api\/approvals\/([^/]+)$/);
    if(approvalItem && request.method === "GET") {
      const approval = await getApproval(env,decodeURIComponent(approvalItem[1]));
      if(!approval || (principal.role !== "admin" && approval.account_id !== principal.id)) return jsonResponse({error:"Approval не найден."},env,404);
      const receipts = (await env.AZRAIL_D1.prepare("SELECT event_type,actor,payload_digest,detail_json,created_at FROM approval_receipts WHERE approval_id=? ORDER BY created_at").bind(approval.id).all()).results;
      return jsonResponse({approval,receipts},env);
    }
    const approvalDecision = url.pathname.match(/^\/api\/approvals\/([^/]+)\/decision$/);
    if(approvalDecision && request.method === "POST") {
      const input = parseInput(approvalDecisionSchema, parsedBody);
      const approval = await decideApproval(env,{
        id:decodeURIComponent(approvalDecision[1]),
        actor:`account:${principal.id}`,
        decision:input.decision,
        reason:input.reason,
        expectedDigest:input.payloadDigest,
      });
      return jsonResponse({approval},env);
    }
  return null;
}
