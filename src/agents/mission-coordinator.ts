import { initializeMissionBudget } from "../lib/billing";
import { loadCheckpoints, requiredApprovalCallIds, validateReplayableCheckpoints } from "../lib/checkpoints";
import {
  claimMissionDelivery,
  loadMissionDelivery,
  markMissionDeliveryScheduled,
  queueMissionRecovery,
  releaseMissionDeliveryLease,
} from "../lib/mission-delivery";
import { loadMissionSnapshotKey } from "../lib/mission-snapshot";
import { clampIterations } from "../lib/mission-limits";
import { drainHints, finalizeControlInterruption, finishMission, isCancelRequested, markRunning, statusForResult } from "../lib/mission-state";
import { log } from "../lib/resilience";
import { UsageLedger } from "../lib/usage";
import { ExecutionEngine } from "../core/execution-engine";
import type { Env, TaskRequest, TaskResult } from "../types";
import type { Capability } from "../lib/agent-registry";
import type { EventEnvelope } from "../lib/event-stream";
import { emitMissionEvent } from "../lib/event-store";
import { traceLog, type TraceContext } from "../lib/observability-context";

export interface MissionParams {
  missionId: string;
  projectId: string;
  goal: string;
  maxIterations: number;
  preferredModel?: string;
  publicHostname?: string;
  requestId?: string;
  traceId?: string;
}

export interface ScheduledMissionParams extends MissionParams {
  deliveryGeneration: number;
}

async function persistAndBroadcastMissionEvent(
  host: MissionCoordinatorHost,
  missionId: string,
  projectId: string,
  event: string,
  data?: Record<string, unknown>,
  trace?: TraceContext,
): Promise<void> {
  try {
    const streamEvent = await emitMissionEvent(host.env, missionId, event, data, trace);
    await host.broadcast({
      streamEvent,
      id: streamEvent.id,
      seq: streamEvent.seq,
      domain: streamEvent.domain,
      event,
      reason: typeof data?.reason === "string" ? data.reason : undefined,
    }, projectId);
  } catch (error) {
    log("warn", "mission.event_stream_failed", { missionId, projectId, event, ...traceLog(trace), error: error instanceof Error ? error.message : String(error) });
  }
}

export interface MissionCoordinatorHost {
  env: Env;
  activeMissions: Set<string>;
  createAbortController(missionId: string): AbortController;
  releaseAbortController(missionId: string): void;
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<boolean | void>;
  };
  schedule(delay: number, method: string, payload: unknown): Promise<unknown>;
  keepAlive(): Promise<() => void>;
  broadcast(payload: { streamEvent?: EventEnvelope; id?: string; seq?: number; domain?: string; event: string; tool?: string; reason?: string; iteration?: number; maxIterations?: number; steps?: number; files?: number }, projectId?: string): Promise<void>;
  invokeCapability(capability: Capability, request: TaskRequest): Promise<TaskResult>;
  startMission(params: MissionParams): Promise<{ scheduled: true; missionId: string }>;
}

export async function scheduleMission(host: MissionCoordinatorHost, params: MissionParams): Promise<{ scheduled: true; missionId: string }> {
  const canonical = await loadMissionDelivery(host.env, params.missionId);
  if (!canonical || canonical.status !== "queued") throw new Error("Mission is not queued or has no valid delivery envelope.");
  const expected = canonical.params;
  const deliveryGeneration = canonical.generation;
  const same = expected.projectId === params.projectId && expected.goal === params.goal && expected.maxIterations === params.maxIterations
    && (expected.preferredModel ?? "") === (params.preferredModel ?? "")
    && (expected.publicHostname ?? "") === (params.publicHostname ?? "")
    && (expected.requestId ?? "") === (params.requestId ?? "")
    && (expected.traceId ?? "") === (params.traceId ?? "");
  if (!same) throw new Error("Mission delivery parameters do not match persisted state.");

  const deliveryLease = await claimMissionDelivery(
    host.env,
    params.missionId,
    deliveryGeneration,
    `orchestrator:${expected.projectId}`,
  );
  if (!deliveryLease) return { scheduled: true, missionId: params.missionId };

  const deliveryKey = `delivery:${params.missionId}:${deliveryGeneration}`;
  try {
    const delivered = await host.storage.get<boolean>(deliveryKey);
    if (!delivered) {
      await host.schedule(0, "runMissionTask", { ...expected, deliveryGeneration });
      await host.storage.put(deliveryKey, true);
    }
    const marked = await markMissionDeliveryScheduled(
      host.env,
      params.missionId,
      deliveryGeneration,
      deliveryLease.leaseId,
    );
    if (!marked) {
      log("warn", "mission.schedule_stale_generation", {
        missionId: params.missionId,
        projectId: expected.projectId,
        ...traceLog(expected.requestId && expected.traceId ? {requestId:expected.requestId,traceId:expected.traceId,missionId:params.missionId} : undefined),
        deliveryGeneration,
        leaseId: deliveryLease.leaseId,
      });
      return { scheduled: true, missionId: params.missionId };
    }
    log("info", "mission.scheduled", {
      missionId: params.missionId,
      projectId: expected.projectId,
      ...traceLog(expected.requestId && expected.traceId ? {requestId:expected.requestId,traceId:expected.traceId,missionId:params.missionId} : undefined),
      deliveryGeneration,
      leaseId: deliveryLease.leaseId,
    });
    return { scheduled: true, missionId: params.missionId };
  } catch (error) {
    log("error", "mission.schedule_ambiguous", {
      missionId: params.missionId,
      projectId: expected.projectId,
      ...traceLog(expected.requestId && expected.traceId ? {requestId:expected.requestId,traceId:expected.traceId,missionId:params.missionId} : undefined),
      deliveryGeneration,
      leaseId: deliveryLease.leaseId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    const outbox = await host.env.AZRAIL_D1.prepare("SELECT delivered FROM mission_outbox WHERE mission_id=?")
      .bind(params.missionId)
      .first<{ delivered: number }>()
      .catch(() => null);
    if (outbox?.delivered === 1) {
      try { await releaseMissionDeliveryLease(host.env, deliveryLease); } catch {}
    }
  }
}

export async function runBenchMission(host: MissionCoordinatorHost, params: Omit<MissionParams, "preferredModel" | "publicHostname">): Promise<TaskResult> {
  const stopHeartbeat = await host.keepAlive();
  try {
    await initializeMissionBudget(host.env, params.missionId);
    if (!await markRunning(host.env, params.missionId)) throw new Error("Миссия уже запущена или остановлена.");
    const engine = new ExecutionEngine(host.env);
    const abortController = host.createAbortController(params.missionId);
    const benchTrace: TraceContext = {
      requestId: params.requestId ?? crypto.randomUUID(),
      traceId: params.traceId ?? crypto.randomUUID().replace(/-/g, ""),
      missionId: params.missionId,
    };
    const result = await engine.runMission(
      { message: params.goal, projectId: params.projectId, _requestId: benchTrace.requestId, _traceId: benchTrace.traceId, _missionId: params.missionId },
      {
        missionId: params.missionId,
        projectId: params.projectId,
        requestId: benchTrace.requestId,
        traceId: benchTrace.traceId,
        iteration: 0,
        maxIterations: params.maxIterations,
        usage: new UsageLedger(`mission:${params.missionId}`),
        signal: abortController.signal,
        onEvent: (payload) => host.broadcast(payload, params.projectId),
        invokeCapability: (capability, request) => host.invokeCapability(capability, { ...request, _missionId: request._missionId ?? params.missionId }),
        shouldAbort: () => isCancelRequested(host.env, params.missionId),
        takeHints: () => drainHints(host.env, params.missionId),
      },
    );
    const persistedStatus = await finishMission(host.env, params.missionId, statusForResult(result), result);
    if (persistedStatus === "cancelled") {
      return { status: "failed", agent: "orchestrator", summary: "Миссия измерителя отменена владельцем.", error: "cancelled" };
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failedResult: TaskResult = {
      status: "failed",
      agent: "orchestrator",
      summary: "Миссия измерителя прервалась.",
      error: message,
    };
    const persistedStatus = await finishMission(host.env, params.missionId, "failed", failedResult);
    return persistedStatus === "cancelled"
      ? { status: "failed", agent: "orchestrator", summary: "Миссия измерителя отменена владельцем.", error: "cancelled" }
      : failedResult;
  } finally {
    host.releaseAbortController(params.missionId);
    stopHeartbeat();
  }
}

export async function recoverMission(host: MissionCoordinatorHost, missionId: string): Promise<{ resumed: boolean; reason?: string }> {
  if (host.activeMissions.has(missionId)) return { resumed: false, reason: "Миссия ещё выполняется." };
  const mission = await host.env.AZRAIL_D1.prepare("SELECT status,project_id,goal FROM missions WHERE id=?")
    .bind(missionId)
    .first<{ status: string; project_id: string; goal: string }>();
  if (!mission || !["failed", "cancelled", "waiting_approval", "paused"].includes(mission.status)) {
    return { resumed: false, reason: "Миссия отсутствует или уже завершена." };
  }

  const delivery = await loadMissionDelivery(host.env, missionId);
  if (!delivery || delivery.status !== mission.status) {
    return { resumed: false, reason: "Нет согласованного сохранённого задания или delivery generation." };
  }
  const params = delivery.params;
  const observedDeliveryGeneration = delivery.generation;
  const recoveryTrace: TraceContext | undefined = params.requestId && params.traceId
    ? { requestId: params.requestId, traceId: params.traceId, missionId }
    : undefined;

  const points = await loadCheckpoints(host.env, missionId);
  let replay;
  try {
    replay = validateReplayableCheckpoints(points, clampIterations(params.maxIterations));
  } catch (error) {
    return { resumed: false, reason: `Checkpoint-цепочка повреждена или содержит неопределённый результат: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (mission.status === "waiting_approval") {
    let callIds: string[];
    try {
      callIds = requiredApprovalCallIds(replay);
    } catch (error) {
      return { resumed: false, reason: `Миссия помечена waiting_approval, но checkpoint подтверждения повреждён: ${error instanceof Error ? error.message : String(error)} Автоматическое восстановление запрещено.` };
    }
    for (const callId of callIds) {
      const call = await host.env.AZRAIL_D1.prepare(`SELECT c.status FROM connector_calls c
        JOIN resource_owners o ON o.kind='project' AND o.resource_id=? AND o.account_id=c.account_id
        WHERE c.id=?`)
        .bind(params.projectId, callId)
        .first<{ status: string }>();
      if (!call || call.status !== "succeeded") {
        const state = call?.status ?? "missing_or_wrong_owner";
        return { resumed: false, reason: `Внешнее действие ещё не подтверждено и не завершено (статус: ${state}). Сначала завершите его в Подключениях; автоматический пропуск запрещён.` };
      }
    }
  }

  try {
    await loadMissionSnapshotKey(host.env, params.projectId, missionId);
  } catch {
    return { resumed: false, reason: "Snapshot миссии повреждён или больше не подтверждён историей версий; автоматическое восстановление запрещено." };
  }

  if (host.activeMissions.has(missionId)) return { resumed: false, reason: "Миссия ещё выполняется." };
  const busy = await host.env.AZRAIL_D1.prepare(`SELECT owner FROM project_lock_leases WHERE project_id=?
    UNION ALL
    SELECT owner FROM operation_locks WHERE project_id=?
      AND NOT EXISTS(SELECT 1 FROM project_lock_leases WHERE project_id=?)
    LIMIT 1`)
    .bind(params.projectId, params.projectId, params.projectId)
    .first<{ owner: string }>();
  if (busy && busy.owner !== missionId) return { resumed: false, reason: "Проект занят другой операцией." };

  try {
    await host.env.AZRAIL_D1.batch([
      host.env.AZRAIL_D1.prepare(`DELETE FROM project_lock_leases WHERE project_id=? AND owner=?
        AND EXISTS(SELECT 1 FROM missions WHERE id=? AND status=?)`)
        .bind(params.projectId, missionId, missionId, mission.status),
      host.env.AZRAIL_D1.prepare(`DELETE FROM operation_locks WHERE project_id=? AND owner=?
        AND EXISTS(SELECT 1 FROM missions WHERE id=? AND status=?)
        AND NOT EXISTS(SELECT 1 FROM project_lock_leases WHERE project_id=?)`)
        .bind(params.projectId, missionId, missionId, mission.status, params.projectId),
    ]);
    await host.storage.delete(`delivery:${missionId}`);
    await host.storage.delete(`delivery:${missionId}:${observedDeliveryGeneration}`);
  } catch {
    return { resumed: false, reason: "Не удалось очистить состояние предыдущего запуска; миссия оставлена без изменений." };
  }

  const claimed = await queueMissionRecovery(host.env, missionId, params.projectId, mission.status);
  if (!claimed) return { resumed: false, reason: "Состояние изменилось, нет outbox-задания или проект занят другой миссией." };
  await persistAndBroadcastMissionEvent(host, missionId, params.projectId, "recovery.queued", { previousStatus: mission.status }, recoveryTrace);

  try {
    await host.startMission(params);
  } catch (error) {
    log("error", "mission.recovery_schedule_failed", {
      missionId,
      projectId: params.projectId,
      ...traceLog(recoveryTrace),
      error: error instanceof Error ? error.message : String(error),
    });
    await persistAndBroadcastMissionEvent(host, missionId, params.projectId, "recovery.delivery_deferred", { reason: "outbox retry required" }, params.requestId && params.traceId ? {requestId:params.requestId,traceId:params.traceId,missionId} : undefined);
    return { resumed: true, reason: "Миссия поставлена в очередь; немедленная доставка не удалась и будет повторена через outbox." };
  }
  await persistAndBroadcastMissionEvent(host, missionId, params.projectId, "recovery.scheduled", undefined, recoveryTrace);
  return { resumed: true };
}

export async function runScheduledMission(host: MissionCoordinatorHost, params: ScheduledMissionParams): Promise<void> {
  const { missionId, projectId, goal, deliveryGeneration } = params;
  const trace: TraceContext = {
    requestId: params.requestId ?? crypto.randomUUID(),
    traceId: params.traceId ?? crypto.randomUUID().replace(/-/g, ""),
    missionId,
  };
  if (host.activeMissions.has(missionId)) return;
  const final = await host.env.AZRAIL_D1.prepare(`SELECT m.status,d.generation
    FROM missions m JOIN mission_delivery_state d ON d.mission_id=m.id WHERE m.id=?`)
    .bind(missionId)
    .first<{ status: string; generation: number }>();
  if (!final || final.generation !== deliveryGeneration) return;
  if (["cancelling","pausing","terminating"].includes(final.status)) {
    const controlled=await finalizeControlInterruption(host.env,missionId);
    if(!controlled&&final.status==="cancelling") await finishMission(host.env, missionId, "cancelled", { status: "failed", agent: "orchestrator", summary: "Миссия отменена.", error: "cancelled" });
    return;
  }
  if (final.status !== "queued") return;
  if (host.activeMissions.has(missionId)) return;
  host.activeMissions.add(missionId);
  const abortController = host.createAbortController(missionId);
  let stopHeartbeat = () => {};

  try {
    if (!await markRunning(host.env, missionId)) return;
    stopHeartbeat = await host.keepAlive();
    await initializeMissionBudget(host.env, missionId);
    const engine = new ExecutionEngine(host.env);
    const result = await engine.runMission(
      { message: goal, projectId, preferredModel: params.preferredModel, _requestId: trace.requestId, _traceId: trace.traceId, _missionId: missionId },
      {
        missionId,
        projectId,
        requestId: trace.requestId,
        traceId: trace.traceId,
        iteration: 0,
        maxIterations: params.maxIterations,
        usage: new UsageLedger(`mission:${params.missionId}`),
        preferredModel: params.preferredModel,
        signal: abortController.signal,
        onEvent: (payload) => host.broadcast(payload, params.projectId),
        invokeCapability: (capability, request) => host.invokeCapability(capability, { ...request, _missionId: request._missionId ?? params.missionId }),
        publicHostname: params.publicHostname,
        shouldAbort: async () => {
          if (abortController.signal.aborted) return true;
          const cancelled = await isCancelRequested(host.env, missionId);
          if (cancelled && !abortController.signal.aborted) abortController.abort(new DOMException("Mission cancelled", "AbortError"));
          return cancelled;
        },
        takeHints: () => drainHints(host.env, missionId),
      },
    );

    const controlled=await finalizeControlInterruption(host.env,missionId);
    if(controlled){
      await persistAndBroadcastMissionEvent(host,missionId,projectId,`mission.${controlled}`,{reason:`Metatron control finalized: ${controlled}.`},trace);
      return;
    }
    const persistedStatus = await finishMission(host.env, missionId, statusForResult(result), result);
    const cancelled = persistedStatus === "cancelled";
    const persistedEvent = cancelled || result.error === "cancelled"
      ? "mission.cancelled"
      : persistedStatus === "completed"
        ? "mission.completed"
        : persistedStatus === "unverified"
          ? "mission.unverified"
          : `mission.${result.status}`;
    await persistAndBroadcastMissionEvent(host, missionId, projectId, persistedEvent, {
      reason: cancelled ? "Миссия отменена владельцем; поздний результат не перезаписал отмену." : result.summary,
      quality: result.quality ?? null,
    }, trace);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const controlled=await finalizeControlInterruption(host.env,missionId);
    if(controlled){
      log("info","mission.controlled_interrupt",{missionId,status:controlled,...traceLog(trace)});
      await persistAndBroadcastMissionEvent(host,missionId,projectId,`mission.${controlled}`,{reason:`Metatron control finalized: ${controlled}.`},trace);
      return;
    }
    log("error", "mission.crashed", { missionId, ...traceLog(trace), error: message });
    await finishMission(host.env, missionId, "failed", {
      status: "failed",
      agent: "orchestrator",
      summary: "Миссия прервалась из-за внутренней ошибки.",
      error: message,
    });
    await persistAndBroadcastMissionEvent(host, missionId, projectId, "mission.failed", { reason: message }, trace);
  } finally {
    host.activeMissions.delete(missionId);
    stopHeartbeat();
  }
}
