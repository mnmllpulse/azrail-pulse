import type { Env } from "../types";

type Probe = { name: string; status: "ok" | "error" | "absent"; ms: number | null; error: string | null };

async function check(name: string, probe: () => Promise<unknown>): Promise<Probe> {
  const t0 = Date.now();
  try {
    await probe();
    return { name, status: "ok", ms: Date.now() - t0, error: null };
  } catch (err) {
    return { name, status: "error", ms: Date.now() - t0, error: err instanceof Error ? err.message : String(err) };
  }
}

const absent = (name: string): Probe => ({ name, status: "absent", ms: null, error: null });

// Реальный round-trip к D1, KV и R2. AI, Vectorize и Queue не пробуем: вызов модели стоит денег,
// а запись в очередь порождала бы мусорные сообщения, поэтому для них показываем только наличие биндинга.
export async function healthReport(env: Env, version: string, agents: number, now: Date = new Date()) {
  const services = await Promise.all([
    env.AZRAIL_D1 ? check("d1", () => env.AZRAIL_D1.prepare("SELECT 1").all()) : absent("d1"),
    env.AZRAIL_KV ? check("kv", () => env.AZRAIL_KV.get("__healthcheck__")) : absent("kv"),
    env.AZRAIL_R2 ? check("r2", () => env.AZRAIL_R2.head("__healthcheck__")) : absent("r2"),
  ]);
  const degraded = services.some((s) => s.status !== "ok");
  return {
    status: degraded ? 503 : 200,
    body: {
      system: "AZRAIL OS",
      version,
      status: degraded ? "degraded" : "healthy",
      services,
      bindings: {
        ai: env.AI ? "bound" : "absent",
        vectorize: env.AZRAIL_VECTORIZE ? "bound" : "absent",
        queue: env.AZRAIL_QUEUE ? "bound" : "absent",
      },
      agents,
      timestamp: now.toISOString(),
    },
  };
}
