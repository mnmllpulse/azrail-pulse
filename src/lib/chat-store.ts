import type { Env, TaskRequest } from "../types";

export async function ensureConversation(env: Env, id: string, projectId?: string) {
  await env.AZRAIL_D1.prepare(
    `INSERT OR IGNORE INTO conversations (id, project_id, title) VALUES (?, ?, ?)`
  ).bind(id, projectId ?? null, "AZRAIL Chat").run();
}

export async function addMessage(env: Env, conversationId: string, role: string, content: string, parentMessageId?: string, model?: string) {
  const id = crypto.randomUUID();
  await env.AZRAIL_D1.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, parent_message_id, model) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, conversationId, role, content, parentMessageId ?? null, model ?? null).run();
  return id;
}

export async function listMessages(env: Env, conversationId: string, limit = 80) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 80;
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT id, role, content, parent_message_id, model, created_at FROM (
       SELECT rowid AS seq, id, role, content, parent_message_id, model, created_at
       FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?
     ) ORDER BY created_at ASC, seq ASC`
  ).bind(conversationId, safeLimit).all();
  return results;
}

export async function deleteConversation(env: Env, conversationId: string) {
  await env.AZRAIL_D1.prepare(`DELETE FROM messages WHERE conversation_id = ?`).bind(conversationId).run();
  await env.AZRAIL_D1.prepare(`DELETE FROM conversations WHERE id = ?`).bind(conversationId).run();
}

export function conversationId(request: TaskRequest) {
  return request.conversationId ?? request.projectId ?? crypto.randomUUID();
}
