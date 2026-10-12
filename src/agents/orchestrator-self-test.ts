import { AGENT_REGISTRY } from "../lib/agent-registry";
import { eligibleRegistry } from "../lib/model-policy";
import { route } from "../lib/model-router";
import { ensureProject } from "../lib/project";
import { log } from "../lib/resilience";
import type { Env } from "../types";

type SubAgentFactory = (agentClass: any, name: string) => Promise<any>;

export interface OrchestratorSelfTestResult {
  ok: boolean;
  agents: Array<{ id: string; ok: boolean; ms: number; error?: string; storageReadable?: boolean }>;
  storage: Array<{ name: string; ok: boolean; ms: number; error?: string }>;
  routing: Array<{
    intent: string;
    chosen: string | null;
    fallbacks: string[];
    noFallback: boolean;
    reasoning: string[];
  }>;
}

export async function runOrchestratorSelfTest(env: Env, subAgent: SubAgentFactory): Promise<OrchestratorSelfTestResult> {
  const agents: OrchestratorSelfTestResult["agents"] = [];

  for (const entry of AGENT_REGISTRY) {
    const t0 = Date.now();
    try {
      const agent = await subAgent(entry.agentClass, `selftest-${entry.id}`);
      const pong = await agent.ping();
      agents.push({
        id: entry.id,
        ok: pong.storageReadable,
        ms: Date.now() - t0,
        storageReadable: pong.storageReadable,
        error: pong.storageReadable ? undefined : "агент поднялся, но его хранилище не отвечает",
      });
    } catch (err) {
      agents.push({
        id: entry.id,
        ok: false,
        ms: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const storage: OrchestratorSelfTestResult["storage"] = [];
  const probe = async (name: string, fn: () => Promise<unknown>) => {
    const t0 = Date.now();
    try {
      await fn();
      storage.push({ name, ok: true, ms: Date.now() - t0 });
    } catch (err) {
      storage.push({ name, ok: false, ms: Date.now() - t0, error: err instanceof Error ? err.message : String(err) });
    }
  };

  const probeId = `__selftest_${crypto.randomUUID().slice(0, 8)}__`;
  await probe("D1 (цепочка записи)", async () => {
    const created = await ensureProject(env, probeId, "самопроверка");
    if (!created) throw new Error("не удалось создать проект — проверь внешние ключи и схему");
    await env.AZRAIL_D1.prepare(
      `INSERT INTO task_history (id, project_id, agent, intent, input_type, status, input_summary)
       VALUES (?, ?, 'selftest', 'unclear', 'text', 'done', 'самопроверка')`,
    )
      .bind(probeId, probeId)
      .run();
    const { results } = await env.AZRAIL_D1.prepare("SELECT id FROM task_history WHERE id = ?")
      .bind(probeId)
      .all();
    if (!results?.length) throw new Error("запись прошла, но не читается обратно");
    await env.AZRAIL_D1.prepare("DELETE FROM task_history WHERE id = ?").bind(probeId).run();
    await env.AZRAIL_D1.prepare("DELETE FROM projects WHERE id = ?").bind(probeId).run();
  });

  await probe("KV", async () => {
    await env.AZRAIL_KV.put(probeId, "1", { expirationTtl: 60 });
    if ((await env.AZRAIL_KV.get(probeId)) !== "1") throw new Error("записалось, но не читается");
    await env.AZRAIL_KV.delete(probeId);
  });

  await probe("R2", async () => {
    await env.AZRAIL_R2.put(`selftest/${probeId}`, "1");
    if (!(await env.AZRAIL_R2.head(`selftest/${probeId}`))) throw new Error("записалось, но не находится");
    await env.AZRAIL_R2.delete(`selftest/${probeId}`);
  });

  const eligibleModels = await eligibleRegistry(env);
  const routing = ["generate_code", "classify", "embeddings"].map((intent) => {
    const decision = route(intent, { gatewayAvailable: !!env.AI_GATEWAY_ID }, eligibleModels);
    return {
      intent,
      chosen: decision.candidates[0]?.slug ?? null,
      fallbacks: decision.candidates.slice(1).map((candidate) => candidate.slug),
      noFallback: decision.candidates.length === 1,
      reasoning: decision.reasoning,
    };
  });

  const ok = agents.every((agent) => agent.ok) && storage.every((entry) => entry.ok);
  log(ok ? "info" : "error", "selftest.finished", {
    agentsFailed: agents.filter((agent) => !agent.ok).map((agent) => agent.id),
    storageFailed: storage.filter((entry) => !entry.ok).map((entry) => entry.name),
  });
  return { ok, agents, storage, routing };
}
