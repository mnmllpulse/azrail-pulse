import type { Env } from "../types";

const TTL = 24 * 60 * 60 * 1000;
export type Admission =
  | { kind: "claimed"; claim: string }
  | { kind: "replay"; body: string; status: number }
  | { kind: "pending" | "conflict" };

/** Durable reservation before spending money. Expiry is NOT proof that a remote
 * effect did not happen. Keep the key until an explicit reconciled retention flow. */
export async function claimMission(env: Env, key: string, body: string): Promise<Admission> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const claim = crypto.randomUUID();
  const now = Date.now();
  const row = await env.AZRAIL_D1.prepare(`
    INSERT INTO mission_admissions (key, body_hash, claim, expires_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO NOTHING RETURNING claim
  `).bind(key, hash, claim, now + TTL).first<{ claim: string }>();
  if (row?.claim === claim) return { kind: "claimed", claim };
  const stored = await env.AZRAIL_D1.prepare(
    "SELECT body_hash, response_body, response_status FROM mission_admissions WHERE key = ?",
  ).bind(key).first<{ body_hash: string; response_body: string | null; response_status: number | null }>();
  if (!stored || stored.body_hash !== hash) return { kind: "conflict" };
  if (stored.response_body && stored.response_status) return {kind:"replay",body:stored.response_body,status:stored.response_status};
  return { kind: "pending" };
}

export async function finishAdmission(env: Env, key: string, claim: string, response: Response): Promise<void> {
  if (response.ok) {
    await env.AZRAIL_D1.prepare(
      "UPDATE mission_admissions SET response_body = ?, response_status = ? WHERE key = ? AND claim = ?",
    ).bind(await response.clone().text(), response.status, key, claim).run();
  } else if (response.status >= 400 && response.status < 500) {
    await env.AZRAIL_D1.prepare("DELETE FROM mission_admissions WHERE key = ? AND claim = ?").bind(key,claim).run();
  }
  // 5xx is ambiguous: keep the reservation, rather than launch a second paid job.
}
