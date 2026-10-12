import type { Env, MissionEvent } from "../types";
import { emitEvent, listMissionStream, type EventDomain } from "./event-stream";
import type { TraceContext } from "./observability-context";

function domainForMissionEvent(type: string): EventDomain {
  if (type.startsWith("tool.")) return "tool";
  if (type.startsWith("tests.") || type.startsWith("verification.") || type.startsWith("check.")) return "verification";
  if (type.startsWith("approval.")) return "approval";
  if (type.startsWith("recovery.")) return "recovery";
  if (type.startsWith("publication.") || type.startsWith("workspace.")) return "publication";
  return "mission";
}

export async function emitMissionEvent(env: Env, missionId: string, type: string, data?: unknown, trace?: Partial<TraceContext>) {
  const mission = await env.AZRAIL_D1.prepare("SELECT project_id FROM missions WHERE id=?")
    .bind(missionId)
    .first<{ project_id: string }>();
  const event = await emitEvent(env, {
    domain: domainForMissionEvent(type),
    type,
    projectId: mission?.project_id,
    missionId,
    subjectType: "mission",
    subjectId: missionId,
    trace: trace ? { ...trace, missionId } : undefined,
    payload: data,
  });
  await env.AZRAIL_D1.prepare("UPDATE missions SET updated_at=? WHERE id=? AND status IN ('queued','executing','cancelling')")
    .bind(new Date(event.createdAt).toISOString(), missionId)
    .run();
  return event;
}

export async function listMissionEvents(env: Env, missionId: string, limit = 200): Promise<MissionEvent[]> {
  const stream = await listMissionStream(env, missionId, { limit });
  if (stream.events.length) {
    return stream.events.map((event) => ({
      id: event.id,
      seq: event.seq,
      domain: event.domain,
      missionId,
      type: event.type,
      data: event.payload,
      createdAt: new Date(event.createdAt).toISOString(),
    }));
  }

  // Transitional fallback for databases/tests that still contain only the
  // pre-RC24 mission_events journal. New writes never target this table.
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT id, mission_id, type, data, created_at FROM (
      SELECT rowid, id, mission_id, type, data, created_at FROM mission_events
      WHERE mission_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?
    ) ORDER BY created_at ASC, rowid ASC`,
  ).bind(missionId, limit).all();
  return results.map((r: any) => ({ ...r, missionId: r.mission_id, data: typeof r.data === "string" ? safeJson(r.data) : r.data }));
}

function safeJson(s: string) { try { return JSON.parse(s); } catch { return s; } }
