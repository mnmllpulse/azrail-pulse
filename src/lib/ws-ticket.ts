import type { Env } from "../types";
import { log } from "./resilience";

export const TICKET_TTL_SECONDS = 60;

export async function issueTicket(env: Env, caller: string): Promise<{ ticket: string; expiresIn: number }> {
  const ticket = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await env.AZRAIL_D1.prepare("INSERT INTO websocket_tickets (ticket, caller, expires_at) VALUES (?, ?, ?)")
    .bind(ticket, caller, Date.now() + TICKET_TTL_SECONDS * 1000).run();
  return { ticket, expiresIn: TICKET_TTL_SECONDS };
}

/** DELETE RETURNING makes consumption atomic; expiry is checked independently of cleanup. */
export async function redeemTicket(env: Env, ticket: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(ticket)) return null;
  try {
    const row = await env.AZRAIL_D1.prepare(
      "DELETE FROM websocket_tickets WHERE ticket = ? AND expires_at > ? RETURNING caller",
    ).bind(ticket, Date.now()).first<{ caller: string }>();
    return row?.caller ?? null;
  } catch (err) {
    log("error", "wsticket.storage_unavailable", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
