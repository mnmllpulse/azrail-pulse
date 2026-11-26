import { getAgentByName } from "agents";
import { approvePairing, authenticateAnyAgent, deviceStatus, forgetDevice, pollPairing, startPairing, type AgentDevice, type AgentPairing, type DeviceStore } from "../lib/agent-device";
import { AccessError, authenticate } from "../lib/accounts";
import { assertSubsystem } from "../lib/kill-switch";
import {
  agentStatus,
  createJob,
  decideJob,
  disableAgent,
  enableAgent,
  finishJob,
  pollJob,
  setTrust,
  publicJob,
  type AgentJob,
  type AgentState,
  type AgentStore,
} from "../lib/local-agent";
import { resumeAfterLocalJob } from "../lib/approval-resume";
import type { Env } from "../types";
import { readJsonRecord } from "./request-json";

type StoreCall = (op: string, arg?: unknown) => Promise<unknown>;

export async function openStore(env: Env): Promise<AgentStore> {
  const stub = await getAgentByName(env.Orchestrator, "local-agent");
  // Через RPC-стаб возвращаемый тип схлопывается, поэтому вызов приводится явно.
  const call = ((op: string, arg?: unknown) => (stub as unknown as { agentStore: StoreCall }).agentStore(op, arg)) as StoreCall;
  return {
    getState: () => call("getState") as Promise<AgentState | null>,
    setState: async (state) => void (await call("setState", state)),
    insertJob: async (job) => void (await call("insertJob", job)),
    getJob: (id) => call("getJob", id) as Promise<AgentJob | null>,
    updateJob: async (id, patch) => void (await call("updateJob", { id, patch })),
    claimQueued: (since) => call("claimQueued", since) as Promise<AgentJob | null>,
    recentJobs: (limit) => call("recentJobs", limit) as Promise<AgentJob[]>,
  };
}

export async function openDeviceStore(env: Env): Promise<DeviceStore> {
  const stub = await getAgentByName(env.Orchestrator, "local-agent");
  const call = ((op: string, arg?: unknown) => (stub as unknown as { agentStore: StoreCall }).agentStore(op, arg)) as StoreCall;
  return {
    getDevice: () => call("getDevice") as Promise<AgentDevice | null>,
    setDevice: async (device) => void (await call("setDevice", device)),
    getPairing: () => call("getPairing") as Promise<AgentPairing | null>,
    setPairing: async (pairing) => void (await call("setPairing", pairing)),
  };
}

async function requireOwner(request: Request, env: Env): Promise<void> {
  const auth = await authenticate(request, env);
  if (!auth.ok || !auth.principal) throw new AccessError(auth.error ?? "Войдите в аккаунт.", 401);
  if (auth.principal.role !== "admin") throw new AccessError("Агент доступен только владельцу.", 403);
}

export async function agentRoute(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/agent/")) return null;
  assertSubsystem(env, "tools");
  const path = url.pathname.slice("/api/agent/".length);
  const method = request.method;

  if (path === "pair/start" && method === "POST") {
    const started = await startPairing(await openDeviceStore(env));
    return Response.json(started, { status: 201 });
  }
  if (path === "pair/poll" && method === "POST") {
    const body = await readJsonRecord(request, 2_000);
    return Response.json(await pollPairing(await openDeviceStore(env), body.secret));
  }

  if (path === "poll" && method === "GET") {
    const store = await openStore(env);
    const auth = await authenticateAnyAgent(store, await openDeviceStore(env), request.headers.get("Authorization"), Date.now(), request.headers.get("X-Agent-Root"), request.headers.get("X-Agent-Roots"));
    if (!auth.ok) throw new AccessError("Ключ агента недействителен.", 401);
    if (!auth.active) return Response.json({ job: null, idle: true });
    const job = await pollJob(store);
    return Response.json({ job: job ? { id: job.id, kind: job.kind, path: job.path, content: job.content, root: job.root ?? null } : null });
  }

  const result = path.match(/^jobs\/([a-f0-9-]{36})\/result$/);
  if (result && method === "POST") {
    const store = await openStore(env);
    if (!(await authenticateAnyAgent(store, await openDeviceStore(env), request.headers.get("Authorization"), Date.now(), request.headers.get("X-Agent-Root"), request.headers.get("X-Agent-Roots"))).ok) throw new AccessError("Ключ агента недействителен.", 401);
    await finishJob(store, result[1], await readJsonRecord(request, 400_000));
    return Response.json({ ok: true, resumed: await resumeAfterLocalJob(env, result[1]) });
  }

  await requireOwner(request, env);
  const store = await openStore(env);

  if (path === "status" && method === "GET") return Response.json({ ...(await agentStatus(store)), ...(await deviceStatus(await openDeviceStore(env))) });
  if (path === "pair/approve" && method === "POST") {
    await approvePairing(await openDeviceStore(env), (await readJsonRecord(request, 2_000)).code);
    return Response.json({ ok: true });
  }
  if (path === "pair/forget" && method === "POST") {
    await forgetDevice(await openDeviceStore(env));
    await disableAgent(store);
    return Response.json({ ok: true });
  }
  if (path === "enable" && method === "POST") return Response.json(await enableAgent(store));
  if (path === "disable" && method === "POST") {
    await disableAgent(store);
    return Response.json({ ok: true });
  }
  if (path === "trust" && method === "POST") {
    const trust = await setTrust(store, await readJsonRecord(request, 2_000));
    return Response.json({ trust });
  }
  if (path === "jobs" && method === "POST") {
    return Response.json({ job: publicJob(await createJob(store, await readJsonRecord(request, 300_000))) }, { status: 201 });
  }
  const one = path.match(/^jobs\/([a-f0-9-]{36})(?:\/(approve|reject))?$/);
  if (one && method === "GET" && !one[2]) {
    const job = await store.getJob(one[1]);
    if (!job) throw new AccessError("Задача не найдена.", 404);
    return Response.json({ job: publicJob(job) });
  }
  if (one && method === "POST" && one[2]) {
    const approve = one[2] === "approve";
    const decided = publicJob(await decideJob(store, one[1], approve));
    return Response.json({ job: decided, resumed: approve ? [] : await resumeAfterLocalJob(env, one[1]) });
  }
  throw new AccessError("Неизвестный путь агента.", 404);
}
