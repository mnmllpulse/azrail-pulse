import type { Env } from "../types";
import { getCors } from "../lib/cors";
import { parseInput } from "../lib/validation";
import { conversationPatchSchema, conversationPlanSchema } from "../shared/schemas";
import { requireResource, type Principal } from "../lib/accounts";
import { addMessage, ensureConversation, listMessages, updateConversationMeta } from "../lib/chat-store";

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: getCors(env, { "Content-Type": "application/json" }) });
}

/** Беседы: список для боковой панели, сохранение плана и правка (название, закрепление, архив, проект). */
export async function conversationsRoute(
  request: Request,
  url: URL,
  env: Env,
  principal: Principal,
  parsedBody: Record<string, unknown>,
): Promise<Response | null> {
    if (url.pathname === "/api/conversations" && request.method === "GET") {
      // Cross-device sidebar: pinned first, then newest activity; preview = first user line.
      const { results } = await env.AZRAIL_D1.prepare(
        `SELECT c.id, c.project_id, c.title, COALESCE(c.pinned, 0) AS pinned, COALESCE(c.archived, 0) AS archived, c.created_at,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user'
                 ORDER BY m.created_at ASC LIMIT 1) AS preview,
                (SELECT MAX(m3.created_at) FROM messages m3 WHERE m3.conversation_id = c.id) AS last_message_at,
                (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id) AS message_count
         FROM conversations c WHERE ? = 'admin' OR EXISTS(SELECT 1 FROM resource_owners o WHERE o.kind='conversation' AND o.resource_id=c.id AND o.account_id=?)
         ORDER BY COALESCE(c.archived, 0) ASC,
                  COALESCE(c.pinned, 0) DESC,
                  COALESCE((SELECT MAX(m4.created_at) FROM messages m4 WHERE m4.conversation_id = c.id), c.created_at) DESC
         LIMIT 80`,
      ).bind(principal.role,principal.id).all();
      return json({ success: true, conversations: results }, env);
    }

    if (url.pathname === "/api/conversations/plan" && request.method === "POST") {
      const body = parseInput(conversationPlanSchema, parsedBody);
      await ensureConversation(env, body.conversationId);
      if (body.userText) {
        const prior = (await listMessages(env, body.conversationId, 40)) as Array<{ role?: string; content?: string }>;
        if (!prior.some((row) => row.role === "user" && row.content === body.userText)) {
          await addMessage(env, body.conversationId, "user", body.userText);
        }
      }
      if (body.summary) await addMessage(env, body.conversationId, "assistant", body.summary);
      await addMessage(env, body.conversationId, "plan", JSON.stringify(body.plan));
      return json({ success: true, conversationId: body.conversationId }, env);
    }

    if (url.pathname === "/api/conversations" && request.method === "PATCH") {
      const body = parseInput(conversationPatchSchema, parsedBody);
      await requireResource(env, principal, "conversation", body.id);
      await updateConversationMeta(env, body.id, {
        title: body.title,
        pinned: body.pinned,
        archived: body.archived,
        projectId: body.projectId,
      });
      return json({
        success: true,
        id: body.id,
        title: body.title,
        pinned: body.pinned,
        archived: body.archived,
        projectId: body.projectId,
      }, env);
    }
  return null;
}
