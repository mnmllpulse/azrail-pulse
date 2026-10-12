// AZRAIL — жизненный цикл миссии в D1.
//
// Появился вместе с переносом миссии в фон. До этого весь цикл жил внутри
// одного HTTP-запроса: POST /api/mission ждал `runMission()` от начала до
// конца. Cloudflare обрывает клиентское соединение примерно на сотой
// секунде — а миссия из восьми шагов с вызовами модели в неё почти никогда
// не укладывается. Отдавался 524, результат терялся, и — что хуже — строка
// в missions навсегда оставалась в статусе "executing", потому что UPDATE
// стоял ПОСЛЕ await, до которого управление уже не доходило.
//
// Здесь собраны все переходы статуса в одном месте: раньше они были
// размазаны по роуту, и половина путей (отмена, зависание) не existовала
// вовсе.

import type { Env, TaskResult } from "../types";
import { log } from "./resilience";

/** Статусы, которые миссия может иметь в D1. */
export type MissionRow = {
  id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  result_json?: string | null;
};

/** Настоящие финальные статусы. waiting_approval — пауза, а не завершение. */
export const TERMINAL_STATUSES = ["completed", "unverified", "failed", "cancelled", "terminated"] as const;

export function isTerminal(status: string | undefined | null): boolean {
  return !!status && (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Release only locks still owned by this terminal mission.
 *
 * The terminal-status predicate is part of the fence: an old Worker cannot
 * delete a lease after recovery moved the same mission back to a live state.
 */
async function releaseTerminalMissionLocks(env: Env, missionId: string): Promise<void> {
  await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare(`DELETE FROM project_lock_leases
      WHERE owner=?
      AND EXISTS(SELECT 1 FROM missions m WHERE m.id=? AND m.status IN ('failed','cancelled','completed','unverified','terminated'))`)
      .bind(missionId, missionId),
    env.AZRAIL_D1.prepare(`DELETE FROM operation_locks
      WHERE owner=?
      AND EXISTS(SELECT 1 FROM missions m WHERE m.id=? AND m.status IN ('failed','cancelled','completed','unverified','terminated'))
      AND NOT EXISTS(SELECT 1 FROM project_lock_leases f WHERE f.project_id=operation_locks.project_id)`)
      .bind(missionId, missionId),
  ]);
}

/** Перевод статуса TaskResult в статус строки миссии. */
export function statusForResult(result: Pick<TaskResult, "status" | "error" | "quality">): string {
  if (result.error === "cancelled") return "cancelled";
  if (result.status === "done") return result.quality?.status === "verified" ? "completed" : "unverified";
  if (result.status === "failed") return "failed";
  return "waiting_approval";
}

/**
 * Запись финального состояния миссии.
 *
 * result_json — новая колонка. Клиент больше не получает результат в ответе
 * на POST (тот возвращается сразу, ещё до начала работы), и без сохранения
 * результата забрать его потом было бы неоткуда: события в mission_events
 * описывают ход, но не итог.
 *
 * ЗАПАСНОЙ ПУТЬ ОБЯЗАТЕЛЕН: у уже развёрнутой базы этой колонки нет, пока
 * не применена миграция. Падать здесь нельзя — работа сделана, файлы
 * записаны, и потерять отметку о завершении из-за отсутствия колонки
 * означало бы оставить миссию вечно висящей.
 */
export async function finishMission(
  env: Env,
  missionId: string,
  status: string,
  result: TaskResult | null,
): Promise<string | null> {
  const now = new Date().toISOString();
  const cancelledResult: TaskResult = {
    status: "failed", agent: "mission-cancel",
    summary: "Миссия отменена владельцем.", error: "cancelled",
  };
  const write = async (withResult: boolean, target: string, payload: TaskResult | null, states: string) => {
    const sql = withResult
      ? `UPDATE missions SET status = ?, finished_at = ?, updated_at = ?, result_json = ? WHERE id = ? AND status IN (${states})`
      : `UPDATE missions SET status = ?, finished_at = ?, updated_at = ? WHERE id = ? AND status IN (${states})`;
    const statement = env.AZRAIL_D1.prepare(sql);
    const response = withResult
      ? await statement.bind(target, now, now, payload ? JSON.stringify(payload) : null, missionId).run()
      : await statement.bind(target, now, now, missionId).run();
    return Number(response.meta?.changes ?? 0) > 0;
  };

  const tryWrite = async (withResult: boolean): Promise<string | null> => {
    const allowed = status === "cancelled" ? "'queued','executing','cancelling'" : "'queued','executing'";
    if (await write(withResult, status, result, allowed)) return status;
    // Cancellation wins the race against a late successful/failed result. If
    // the owner moved the row to `cancelling` while the last tool/check was
    // finishing, a normal completion must never resurrect it as completed.
    if (status !== "cancelled" && await write(withResult, "cancelled", cancelledResult, "'cancelling'")) return "cancelled";
    const current = await env.AZRAIL_D1.prepare("SELECT status FROM missions WHERE id=?")
      .bind(missionId).first<{status:string}>();
    return current?.status ?? null;
  };

  try {
    return await tryWrite(true);
  } catch (err) {
    log("warn", "mission.finish_without_result_column", {
      missionId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    return await tryWrite(false);
  } catch (err) {
    log("error", "mission.finish_failed", {
      missionId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Отметка «идёт работа» — для наблюдателя и для сборщика зависших. */
export async function markRunning(env: Env, missionId: string): Promise<boolean> {
  const row = await env.AZRAIL_D1.prepare(
    "UPDATE missions SET status='executing', updated_at=? WHERE id=? AND status='queued' RETURNING id",
  ).bind(new Date().toISOString(), missionId).first<{id:string}>();
  return !!row;
}

/** Compare-and-set: cancellation must never resurrect a terminal mission. */
export async function requestCancel(
  env: Env, missionId: string,
): Promise<{ ok: boolean; reason: "cancelling" | "cancelled" | "external_in_flight" | "already_finished" | "not_found"; status?: string }> {
  const now = new Date().toISOString();
  const changed = await env.AZRAIL_D1.prepare(
    "UPDATE missions SET status='cancelling', updated_at=? WHERE id=? AND status IN ('queued','executing','cancelling','pausing') RETURNING id",
  ).bind(now, missionId).first<{id:string}>();
  if (changed) return { ok: true, reason: "cancelling", status: "cancelling" };

  const row = await env.AZRAIL_D1.prepare("SELECT status,project_id FROM missions WHERE id = ?")
    .bind(missionId).first<{status:string;project_id:string}>();
  if (!row) return {ok:false, reason:"not_found"};

  // A paused mission has already reached a cooperative safe boundary, so no
  // live provider request remains to abort. Close it immediately instead of
  // leaving `cancelling` for a worker that is no longer running.
  if (row.status === "paused") {
    const result: TaskResult = {
      status: "failed", agent: "mission-cancel",
      summary: "Приостановленная миссия отменена владельцем.", error: "cancelled",
    };
    const closed = await env.AZRAIL_D1.prepare(
      "UPDATE missions SET status='cancelled',finished_at=?,updated_at=?,result_json=? WHERE id=? AND status='paused' RETURNING id",
    ).bind(now, now, JSON.stringify(result), missionId).first<{id:string}>();
    if (closed) {
      await env.AZRAIL_D1.prepare(
        "UPDATE approvals SET status='cancelled',decided_at=? WHERE mission_id=? AND status='pending'",
      ).bind(now, missionId).run().catch(()=>{});
      await env.AZRAIL_D1.prepare(
        "UPDATE approval_requests SET status='cancelled',decided_at=?,decided_by='system:mission-cancel',decision_reason='paused mission cancelled' WHERE mission_id=? AND status IN ('pending','approved')",
      ).bind(now, missionId).run().catch(()=>{});
      await releaseTerminalMissionLocks(env, missionId).catch(error => log("error", "mission.cancel_lock_cleanup_failed", {missionId,error:error instanceof Error?error.message:String(error)}));
      return {ok:true, reason:"cancelled", status:"cancelled"};
    }
  }

  // waiting_approval is suspended, not truly terminal. The owner must be able
  // to abandon it. Before closing the mission, cancel every still-prepared
  // connector action recorded in its checkpoints. CAS prevents racing an
  // action that has already started; in that case we refuse to claim a clean
  // cancellation because the remote outcome may still change.
  if (row.status === "waiting_approval") {
    const owner = await env.AZRAIL_D1.prepare(
      "SELECT account_id FROM resource_owners WHERE kind='project' AND resource_id=?",
    ).bind(row.project_id).first<{account_id:string}>();
    if (!owner) return {ok:false, reason:"external_in_flight", status:"missing_project_owner"};
    const {results} = await env.AZRAIL_D1.prepare(
      "SELECT result_json FROM mission_checkpoints WHERE mission_id=? AND tool='connector_call' AND status='completed' ORDER BY step",
    ).bind(missionId).all<{result_json:string|null}>();
    for (const point of results ?? []) {
      if (!point.result_json) continue;
      let prepared: {id?:unknown; approvalRequired?:unknown} | null = null;
      try { prepared = JSON.parse(point.result_json) as {id?:unknown; approvalRequired?:unknown}; } catch { continue; }
      if (prepared?.approvalRequired !== true || typeof prepared.id !== "string") continue;
      const call = await env.AZRAIL_D1.prepare("SELECT status FROM connector_calls WHERE id=? AND account_id=?")
        .bind(prepared.id,owner.account_id).first<{status:string}>();
      if (!call) return {ok:false, reason:"external_in_flight", status:"missing_connector_call"};
      if (call.status === "prepared") {
        const cancelled = await env.AZRAIL_D1.prepare(
          "UPDATE connector_calls SET status='cancelled',updated_at=? WHERE id=? AND account_id=? AND status='prepared' RETURNING id",
        ).bind(Date.now(), prepared.id, owner.account_id).first<{id:string}>();
        if (!cancelled) {
          const current = await env.AZRAIL_D1.prepare("SELECT status FROM connector_calls WHERE id=? AND account_id=?")
            .bind(prepared.id,owner.account_id).first<{status:string}>();
          if (!current || ["running","uncertain"].includes(current.status)) {
            return {ok:false, reason:"external_in_flight", status:current?.status ?? "missing_connector_call"};
          }
        }
      } else if (["running","uncertain"].includes(call.status)) {
        return {ok:false, reason:"external_in_flight", status:call.status};
      }
    }

    const result: TaskResult = {
      status: "failed", agent: "mission-cancel",
      summary: "Миссия отменена владельцем во время ожидания подтверждения.", error: "cancelled",
    };
    const closed = await env.AZRAIL_D1.prepare(
      "UPDATE missions SET status='cancelled',finished_at=?,updated_at=?,result_json=? WHERE id=? AND status='waiting_approval' RETURNING id",
    ).bind(now, now, JSON.stringify(result), missionId).first<{id:string}>();
    if (closed) {
      await env.AZRAIL_D1.prepare(
        "UPDATE approvals SET status='cancelled',decided_at=? WHERE mission_id=? AND status='pending'",
      ).bind(now, missionId).run();
      await env.AZRAIL_D1.prepare(
        "UPDATE approval_requests SET status='cancelled',decided_at=?,decided_by='system:mission-cancel',decision_reason='mission cancelled' WHERE mission_id=? AND status IN ('pending','approved')",
      ).bind(now, missionId).run();
      await releaseTerminalMissionLocks(env, missionId).catch(error => log("error", "mission.cancel_lock_cleanup_failed", {missionId,error:error instanceof Error?error.message:String(error)}));
      return {ok:true, reason:"cancelled", status:"cancelled"};
    }
    const current = await env.AZRAIL_D1.prepare("SELECT status FROM missions WHERE id=?")
      .bind(missionId).first<{status:string}>();
    return {ok:false, reason:"already_finished", status:current?.status};
  }

  return {ok:false, reason:"already_finished", status:row.status};
}


export async function requestPause(env: Env, missionId: string): Promise<{ok:boolean;status?:string;reason?:string}> {
  const now=new Date().toISOString();
  const queued=await env.AZRAIL_D1.prepare("UPDATE missions SET status='paused',updated_at=? WHERE id=? AND status='queued' RETURNING id")
    .bind(now,missionId).first<{id:string}>();
  if(queued)return {ok:true,status:'paused'};
  const running=await env.AZRAIL_D1.prepare("UPDATE missions SET status='pausing',updated_at=? WHERE id=? AND status='executing' RETURNING id")
    .bind(now,missionId).first<{id:string}>();
  if(running)return {ok:true,status:'pausing'};
  const row=await env.AZRAIL_D1.prepare("SELECT status FROM missions WHERE id=?").bind(missionId).first<{status:string}>();
  if(!row)return {ok:false,reason:'not_found'};
  if(row.status==='paused'||row.status==='pausing')return {ok:true,status:row.status};
  return {ok:false,status:row.status,reason:'not_running'};
}

export async function requestTerminate(env: Env, missionId: string): Promise<{ok:boolean;status?:string;reason?:string}> {
  const now=new Date().toISOString();
  const direct=await env.AZRAIL_D1.prepare("UPDATE missions SET status='terminated',finished_at=?,updated_at=? WHERE id=? AND status IN ('queued','paused','waiting_approval') RETURNING id")
    .bind(now,now,missionId).first<{id:string}>();
  if(direct){
    await env.AZRAIL_D1.prepare("UPDATE approvals SET status='cancelled',decided_at=? WHERE mission_id=? AND status='pending'").bind(now,missionId).run().catch(()=>{});
    await env.AZRAIL_D1.prepare("UPDATE approval_requests SET status='cancelled',decided_at=?,decided_by='system:metatron-terminate',decision_reason='mission terminated' WHERE mission_id=? AND status IN ('pending','approved')").bind(now,missionId).run().catch(()=>{});
    await releaseTerminalMissionLocks(env,missionId).catch(error=>log("error","mission.terminate_lock_cleanup_failed",{missionId,error:error instanceof Error?error.message:String(error)}));
    return {ok:true,status:'terminated'};
  }
  const running=await env.AZRAIL_D1.prepare("UPDATE missions SET status='terminating',updated_at=? WHERE id=? AND status IN ('executing','pausing','cancelling') RETURNING id")
    .bind(now,missionId).first<{id:string}>();
  if(running)return {ok:true,status:'terminating'};
  const row=await env.AZRAIL_D1.prepare("SELECT status FROM missions WHERE id=?").bind(missionId).first<{status:string}>();
  if(!row)return {ok:false,reason:'not_found'};
  if(row.status==='terminated'||row.status==='terminating')return {ok:true,status:row.status};
  return {ok:false,status:row.status,reason:'already_finished'};
}

/** Resolve a cooperative AbortSignal into the durable control state that requested it. */
export async function finalizeControlInterruption(env: Env, missionId: string): Promise<'paused'|'terminated'|'cancelled'|null> {
  const row=await env.AZRAIL_D1.prepare("SELECT status FROM missions WHERE id=?").bind(missionId).first<{status:string}>();
  if(!row)return null;
  const target=row.status==='pausing'?'paused':row.status==='terminating'?'terminated':row.status==='cancelling'?'cancelled':null;
  if(!target)return null;
  const now=new Date().toISOString();
  const finished=target==='paused'?null:now;
  const updated=await env.AZRAIL_D1.prepare("UPDATE missions SET status=?,finished_at=?,updated_at=? WHERE id=? AND status=? RETURNING id")
    .bind(target,finished,now,missionId,row.status).first<{id:string}>();
  if(!updated)return null;
  if(target!=="paused") {
    await env.AZRAIL_D1.prepare("UPDATE approval_requests SET status='cancelled',decided_at=?,decided_by='system:mission-control',decision_reason='mission control interruption' WHERE mission_id=? AND status IN ('pending','approved')")
      .bind(now,missionId).run().catch(()=>{});
    await releaseTerminalMissionLocks(env,missionId).catch(error=>log("error","mission.control_lock_cleanup_failed",{missionId,target,error:error instanceof Error?error.message:String(error)}));
  }
  return target;
}

/** A lost lease, missing row, or terminal status stops further work.
 * A database error propagates: it is not permission to keep spending. */
export async function isCancelRequested(env: Env, missionId: string): Promise<boolean> {
  const row = await env.AZRAIL_D1.prepare("SELECT status FROM missions WHERE id = ?")
    .bind(missionId).first<{status:string}>();
  return !row || !["queued", "executing"].includes(row.status);
}

/** Сколько минут без обновления считать зависанием. */
export const DEFAULT_STALE_MINUTES = 20;

export function staleMinutes(env: Env): number {
  const n = Number(env.AZRAIL_MISSION_STALE_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STALE_MINUTES;
}

/**
 * Сборщик зависших миссий. Запускается по крону.
 *
 * Зачем нужен, если статус теперь пишется в фоне: Durable Object можно
 * выселить, инстанс — перезапустить, alarm — не доставить. Любой из этих
 * случаев оставляет строку в "executing" навсегда, и интерфейс будет
 * показывать вечно идущую работу, которой давно нет. Крон — единственное,
 * что это закрывает: сама остановленная миссия о себе уже не сообщит.
 *
 * Выделено в функцию, а не вписано в обработчик, чтобы было чем проверять:
 * обработчик крона в тесте не позвать.
 */
export async function reapStaleMissions(env: Env, now = Date.now()): Promise<{ reaped: number; ids: string[] }> {
  const cutoff = new Date(now - staleMinutes(env) * 60_000).toISOString();
  const finishedAt = new Date(now).toISOString();
  const result: TaskResult = {
    status: "failed", agent: "mission-reaper",
    summary: `Миссия не обновлялась дольше ${staleMinutes(env)} мин. Сделанные шаги сохранены.`, error: "stale",
  };
  // Selection and transition are one statement; a fresh heartbeat cannot be overwritten.
  const {results} = await env.AZRAIL_D1.prepare(`
    UPDATE missions SET status='failed', finished_at=?, updated_at=?, result_json=?
    WHERE id IN (SELECT id FROM missions
      WHERE status IN ('queued','executing','cancelling','pausing','terminating')
      AND COALESCE(updated_at,created_at) < ? LIMIT 100)
    RETURNING id
  `).bind(finishedAt, finishedAt, JSON.stringify(result), cutoff).all<{id:string}>();
  const ids = (results ?? []).map(row => row.id);
  if (ids.length) {
    log("warn", "mission.reaped", {count:ids.length, ids});
    // A crashed mission can leave the project lease behind. Once the mission is
    // terminal, that lease has no legitimate owner and must not block the project
    // forever. Do this after the terminal transition so a live mission cannot lose
    // its lock merely because a cleanup query raced its heartbeat.
    const placeholders=ids.map(()=>'?').join(',');
    // Recovery can race the reaper after the UPDATE above. Never delete a
    // freshly reacquired same-mission lease: require the mission to STILL be
    // terminal at lock-cleanup time. This is the fencing counterpart of the
    // recovery status-gated cleanup in Orchestrator.
    await env.AZRAIL_D1.batch([
      env.AZRAIL_D1.prepare(`DELETE FROM project_lock_leases
        WHERE owner IN (${placeholders})
        AND EXISTS(SELECT 1 FROM missions m WHERE m.id=project_lock_leases.owner AND m.status IN ('failed','cancelled','completed','unverified','terminated'))`).bind(...ids),
      env.AZRAIL_D1.prepare(`DELETE FROM operation_locks
        WHERE owner IN (${placeholders})
        AND EXISTS(SELECT 1 FROM missions m WHERE m.id=operation_locks.owner AND m.status IN ('failed','cancelled','completed','unverified','terminated'))
        AND NOT EXISTS(SELECT 1 FROM project_lock_leases f WHERE f.project_id=operation_locks.project_id)`).bind(...ids),
    ]);
  }
  // Non-mission operations (export/backup/etc.) use synthetic owners and have no
  // heartbeat row. If a Worker dies mid-operation, reclaim only very old orphan
  // leases; one hour is well above the bounded export/backup budgets. Delete the
  // fenced lease first, then the compatibility lock only when no newer lease is
  // present for that project. This keeps a stale Worker from deleting a new lock.
  const leaseCutoff=now-60*60_000;
  await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare(`DELETE FROM project_lock_leases WHERE started_at<?
      AND NOT EXISTS(SELECT 1 FROM missions m WHERE m.id=project_lock_leases.owner AND m.status IN ('queued','executing','cancelling','pausing','terminating','paused'))`).bind(leaseCutoff),
    env.AZRAIL_D1.prepare(`DELETE FROM operation_locks WHERE started_at<?
      AND NOT EXISTS(SELECT 1 FROM missions m WHERE m.id=operation_locks.owner AND m.status IN ('queued','executing','cancelling','pausing','terminating','paused'))
      AND NOT EXISTS(SELECT 1 FROM project_lock_leases f WHERE f.project_id=operation_locks.project_id)`).bind(leaseCutoff),
    // Delivery leases are only scheduler claims, not execution ownership. Once
    // expired they provide no safety and must not accumulate forever after a
    // task started/completed while schedule acknowledgement was ambiguous.
    env.AZRAIL_D1.prepare("DELETE FROM mission_delivery_leases WHERE expires_at<=?").bind(now),
  ]);
  await env.AZRAIL_D1.prepare("DELETE FROM mission_hints WHERE expires_at <= ?").bind(now).run();
  return {reaped:ids.length, ids};
}

const HINT_TTL_SECONDS = 3600;
export const MAX_HINT_LENGTH = 600;
export const MAX_PENDING_HINTS = 5;

/** D1 admission and DELETE RETURNING avoid KV read/modify/write lost updates. */
export async function sendHint(
  env: Env, missionId: string, text: string,
): Promise<{ok:boolean; reason:"queued"|"empty"|"too_many"|"already_finished"|"not_found"}> {
  const clean = text.trim().slice(0, MAX_HINT_LENGTH);
  if (!clean) return {ok:false, reason:"empty"};
  const now = Date.now();
  const inserted = await env.AZRAIL_D1.prepare(`
    INSERT INTO mission_hints(mission_id,text,expires_at)
    SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM missions WHERE id=? AND status IN ('queued','executing'))
    AND (SELECT COUNT(*) FROM mission_hints WHERE mission_id=? AND expires_at>?) < ?
    RETURNING id
  `).bind(missionId, clean, now + HINT_TTL_SECONDS * 1000, missionId, missionId, now, MAX_PENDING_HINTS).first();
  if (inserted) return {ok:true, reason:"queued"};
  const row = await env.AZRAIL_D1.prepare("SELECT status FROM missions WHERE id = ?")
    .bind(missionId).first<{status:string}>();
  if (!row) return {ok:false, reason:"not_found"};
  return {ok:false, reason:["queued","executing"].includes(row.status) ? "too_many" : "already_finished"};
}

/** Atomically takes the queue. Concurrent new messages cannot be erased. */
export async function drainHints(env: Env, missionId: string): Promise<string[]> {
  try {
    const {results} = await env.AZRAIL_D1.prepare(
      "DELETE FROM mission_hints WHERE mission_id=? RETURNING id,text,expires_at",
    ).bind(missionId).all<{id:number;text:string;expires_at:number}>();
    return (results ?? []).filter(r=>r.expires_at>Date.now()).sort((a,b)=>a.id-b.id).map(r=>r.text);
  } catch (err) {
    log("warn", "mission.hint_drain_failed", {missionId, error:err instanceof Error ? err.message : String(err)});
    return [];
  }
}
