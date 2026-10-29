import type { Env, TaskRequest } from "../types";

export async function ensureConversation(env: Env, id: string, projectId?: string) {
  await env.AZRAIL_D1.prepare(
    `INSERT OR IGNORE INTO conversations (id, project_id, title) VALUES (?, ?, ?)`
  ).bind(id, projectId ?? null, "AZRAIL Chat").run();
  if (projectId) {
    await env.AZRAIL_D1.prepare(
      `UPDATE conversations SET project_id = COALESCE(project_id, ?) WHERE id = ?`
    ).bind(projectId, id).run().catch(() => {});
  }
}

export async function addMessage(env: Env, conversationId: string, role: string, content: string, parentMessageId?: string, model?: string) {
  const id = crypto.randomUUID();
  await env.AZRAIL_D1.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, parent_message_id, model) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, conversationId, role, content, parentMessageId ?? null, model ?? null).run();
  // ChatGPT-style sidebar title: first three words of the opening user line.
  if (role === "user" && content.trim()) {
    const title = content.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, 3).join(" ").slice(0, 90);
    if (title) {
      await env.AZRAIL_D1.prepare(
        `UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ? AND (title IS NULL OR title = '' OR title = 'AZRAIL Chat' OR title = 'Новый чат' OR title = 'Чат')`
      ).bind(title, conversationId).run().catch(() => {});
    }
  }
  return id;
}

export async function updateConversationMeta(
  env: Env,
  id: string,
  patch: { title?: string; pinned?: boolean; archived?: boolean; projectId?: string | null },
) {
  if (typeof patch.title === "string") {
    const title = patch.title.replace(/\s+/g, " ").trim().slice(0, 90);
    if (!title) throw new Error("Название чата не может быть пустым.");
    await env.AZRAIL_D1.prepare(
      `UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`,
    ).bind(title, id).run();
  }
  if (typeof patch.pinned === "boolean") {
    await env.AZRAIL_D1.prepare(
      `UPDATE conversations SET pinned = ?, updated_at = datetime('now') WHERE id = ?`,
    ).bind(patch.pinned ? 1 : 0, id).run();
  }
  if (typeof patch.archived === "boolean") {
    await env.AZRAIL_D1.prepare(
      `UPDATE conversations SET archived = ?, pinned = CASE WHEN ? = 1 THEN 0 ELSE pinned END, updated_at = datetime('now') WHERE id = ?`,
    ).bind(patch.archived ? 1 : 0, patch.archived ? 1 : 0, id).run();
  }
  if (patch.projectId !== undefined) {
    await env.AZRAIL_D1.prepare(
      `UPDATE conversations SET project_id = ?, updated_at = datetime('now') WHERE id = ?`,
    ).bind(patch.projectId, id).run();
  }
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
