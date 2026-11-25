import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadDevice, pairWithServer, resolveCredentials, saveDevice } from "../scripts/local-agent/azrail-agent.mjs";
import { AccessError } from "../src/lib/accounts";
import {
  approvePairing, authenticateAnyAgent, authenticateDevice, deviceStatus, forgetDevice, pollPairing, startPairing,
  PAIRING_MAX_ATTEMPTS, PAIRING_THROTTLE_MS, PAIRING_TTL_MS, type AgentDevice, type AgentPairing, type DeviceStore,
} from "../src/lib/agent-device";
import { enableAgent, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";

function devices(): DeviceStore & { device: AgentDevice | null; pairing: AgentPairing | null } {
  const box = { device: null as AgentDevice | null, pairing: null as AgentPairing | null };
  return Object.assign(box, {
    async getDevice() { return box.device && { ...box.device }; },
    async setDevice(d: AgentDevice | null) { box.device = d && { ...d }; },
    async getPairing() { return box.pairing && { ...box.pairing }; },
    async setPairing(p: AgentPairing | null) { box.pairing = p && { ...p }; },
  });
}

function agentStore(): AgentStore {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    async getState() { return state && { ...state }; },
    async setState(next) { state = next; },
    async insertJob(job) { jobs.set(job.id, job); },
    async getJob(id) { return jobs.get(id) ?? null; },
    async updateJob() {},
    async claimQueued() { return null; },
    async recentJobs() { return []; },
  };
}

const NOW = 1_000_000;
const fail = async (promise: Promise<unknown>, status: number) => {
  const error = await promise.then(() => null, (e) => e);
  expect(error).toBeInstanceOf(AccessError);
  expect((error as AccessError).status).toBe(status);
};

describe("привязка: сервер", () => {
  it("выдаёт код и тайну, быстрые повторы получают 429", async () => {
    const store = devices();
    const started = await startPairing(store, NOW);
    expect(started.code).toMatch(/^\d{4}-\d{4}$/);
    expect(started.secret).toMatch(/^azpair_[a-f0-9]{48}$/);
    expect(started.expiresAt).toBe(NOW + PAIRING_TTL_MS);
    await fail(startPairing(store, NOW + 1000), 429);
    await expect(startPairing(store, NOW + PAIRING_THROTTLE_MS + 1)).resolves.toBeTruthy();
  });

  it("верный код подтверждает, ключ отдаётся один раз", async () => {
    const store = devices();
    const { code, secret } = await startPairing(store, NOW);
    expect(await pollPairing(store, secret, NOW + 1)).toEqual({ status: "pending" });
    await approvePairing(store, code, NOW + 2);
    expect(store.device).not.toBeNull();
    const got = await pollPairing(store, secret, NOW + 3);
    expect(got).toMatchObject({ status: "approved", token: expect.stringMatching(/^azdev_[a-f0-9]{64}$/) });
    await fail(pollPairing(store, secret, NOW + 4), 410);
    expect(await authenticateDevice(store, `Bearer ${(got as { token: string }).token}`, NOW + 5)).not.toBeNull();
  });

  it("код принимается с пробелами и без дефиса", async () => {
    const store = devices();
    const { code } = await startPairing(store, NOW);
    await expect(approvePairing(store, ` ${code.replace("-", " ")} `, NOW + 1)).resolves.toBeUndefined();
  });

  it("неверный код сгорает после пяти попыток", async () => {
    const store = devices();
    const { code } = await startPairing(store, NOW);
    const wrong = code === "0000-0000" ? "1111-1111" : "0000-0000";
    for (let i = 1; i < PAIRING_MAX_ATTEMPTS; i++) await fail(approvePairing(store, wrong, NOW + i), 400);
    await fail(approvePairing(store, wrong, NOW + 9), 400);
    expect(store.pairing).toBeNull();
    expect(store.device).toBeNull();
    await fail(approvePairing(store, code, NOW + 10), 404);
  });

  it("истёкший запрос, чужая тайна, повторное подтверждение", async () => {
    const store = devices();
    const { code, secret } = await startPairing(store, NOW);
    await fail(pollPairing(store, "azpair_чужая", NOW + 1), 401);
    await fail(pollPairing(store, secret, NOW + PAIRING_TTL_MS + 1), 410);
    await fail(approvePairing(store, code, NOW + PAIRING_TTL_MS + 1), 404);
    const second = devices();
    const next = await startPairing(second, NOW);
    await approvePairing(second, next.code, NOW + 1);
    await fail(approvePairing(second, next.code, NOW + 2), 409);
  });

  it("«забыть компьютер» стирает ключ, старый ключ перестаёт работать", async () => {
    const store = devices();
    const { code, secret } = await startPairing(store, NOW);
    await approvePairing(store, code, NOW + 1);
    const { token } = (await pollPairing(store, secret, NOW + 2)) as { token: string };
    await forgetDevice(store);
    expect(await authenticateDevice(store, `Bearer ${token}`, NOW + 3)).toBeNull();
    expect((await deviceStatus(store, NOW + 3)).paired).toBe(false);
  });
});

async function paired(store: ReturnType<typeof devices>) {
  const { code, secret } = await startPairing(store, NOW);
  await approvePairing(store, code, NOW + 1);
  return ((await pollPairing(store, secret, NOW + 2)) as { token: string }).token;
}

describe("доступ по постоянному ключу", () => {
  it("без окна «Включить» ключ узнаётся, но задачи не отдаются", async () => {
    const dev = devices();
    const token = await paired(dev);
    const agent = agentStore();
    expect(await authenticateAnyAgent(agent, dev, `Bearer ${token}`, NOW + 10)).toEqual({ ok: true, active: false });
    expect(await agent.getState()).toBeNull();
    expect((await deviceStatus(dev, NOW + 11)).deviceOnline).toBe(true);
    expect((await deviceStatus(dev, NOW + 60_000)).deviceOnline).toBe(false);
  });

  it("с открытым окном — активен, папки агента попадают в состояние сессии", async () => {
    const dev = devices();
    const token = await paired(dev);
    const agent = agentStore();
    await enableAgent(agent, NOW);
    const roots = encodeURIComponent(JSON.stringify([{ name: "p", path: "C:\\p" }]));
    expect(await authenticateAnyAgent(agent, dev, `Bearer ${token}`, NOW + 10, null, roots)).toEqual({ ok: true, active: true });
    expect(await agent.getState()).toMatchObject({ lastSeen: NOW + 10, root: "C:\\p", roots: [{ name: "p", path: "C:\\p" }] });
  });

  it("окно закрыто по времени — снова неактивен", async () => {
    const dev = devices();
    const token = await paired(dev);
    const agent = agentStore();
    await enableAgent(agent, NOW);
    expect((await authenticateAnyAgent(agent, dev, `Bearer ${token}`, NOW + 2 * 3600_000)).active).toBe(false);
  });

  it("чужой и пустой ключ отклоняются, сессионный ключ работает как раньше", async () => {
    const dev = devices();
    await paired(dev);
    const agent = agentStore();
    expect((await authenticateAnyAgent(agent, dev, `Bearer azdev_${"a".repeat(64)}`)).ok).toBe(false);
    expect((await authenticateAnyAgent(agent, dev, null)).ok).toBe(false);
    const { token } = await enableAgent(agent);
    expect(await authenticateAnyAgent(agent, dev, `Bearer ${token}`)).toEqual({ ok: true, active: true });
  });
});

describe("привязка: агент на компьютере", () => {
  const server = () => {
    const store = devices();
    const fetchFn = vi.fn(async (url: string, init?: { body?: string }) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      try {
        if (url.endsWith("/pair/start")) return Response.json(await startPairing(store, Date.now()), { status: 201 });
        if (url.endsWith("/pair/poll")) return Response.json(await pollPairing(store, body.secret, Date.now()));
      } catch (error) {
        return new Response("{}", { status: (error as AccessError).status });
      }
      return new Response("{}", { status: 404 });
    });
    return { store, fetchFn };
  };

  it("показывает код и ждёт подтверждения владельца", async () => {
    const { store, fetchFn } = server();
    const log = vi.fn();
    let polls = 0;
    const sleep = async () => {
      if (++polls === 2) await approvePairing(store, store.pairing!.code);
    };
    const token = await pairWithServer("https://a.example", { fetchFn: fetchFn as never, sleep, log });
    expect(token).toMatch(/^azdev_[a-f0-9]{64}$/);
    expect(log.mock.calls[0][0]).toMatch(/Код привязки: \d{4}-\d{4}/);
  });

  it("истёкший код — понятная ошибка", async () => {
    const fetchFn = vi.fn(async (url: string) => (url.endsWith("/start") ? Response.json({ code: "1234-5678", secret: "s" }) : new Response("{}", { status: 410 })));
    await expect(pairWithServer("https://a.example", { fetchFn: fetchFn as never, sleep: async () => {}, log: () => {} })).rejects.toThrow(/Код истёк/);
  });

  it("не подтверждён вовремя — ошибка", async () => {
    const fetchFn = vi.fn(async (url: string) => (url.endsWith("/start") ? Response.json({ code: "1234-5678", secret: "s" }) : Response.json({ status: "pending" })));
    await expect(pairWithServer("https://a.example", { fetchFn: fetchFn as never, sleep: async () => {}, log: () => {}, attempts: 3 })).rejects.toThrow(/не подтверждён/);
  });

  it("ключ хранится в файле только в нужном виде", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dev-"));
    const file = join(dir, "a.json");
    const token = `azdev_${"b".repeat(64)}`;
    await saveDevice(file, { url: "https://a.example", token });
    expect(await loadDevice(file)).toEqual({ url: "https://a.example", token });
    await writeFile(file, JSON.stringify({ url: "https://a.example", token: "azagent_x" }));
    expect(await loadDevice(file)).toBeNull();
    await writeFile(file, "не json");
    expect(await loadDevice(file)).toBeNull();
    expect(await loadDevice(join(dir, "нет.json"))).toBeNull();
  });

  it("откуда берётся ключ: окружение, файл, новая привязка, ничего", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dev-"));
    const file = join(dir, "a.json");
    expect(await resolveCredentials({ AZRAIL_URL: "https://a.example/", AZRAIL_AGENT_TOKEN: "azagent_x", AZRAIL_DEVICE_FILE: file })).toEqual({ url: "https://a.example", token: "azagent_x", device: false });
    expect(await resolveCredentials({ AZRAIL_DEVICE_FILE: file })).toBeNull();
    const token = `azdev_${"c".repeat(64)}`;
    await saveDevice(file, { url: "https://saved.example/", token });
    expect(await resolveCredentials({ AZRAIL_DEVICE_FILE: file })).toEqual({ url: "https://saved.example", token, device: true });

    const fresh = join(dir, "new.json");
    const { store, fetchFn } = server();
    let n = 0;
    const sleep = async () => {
      if (++n === 1) await approvePairing(store, store.pairing!.code);
    };
    const made = await resolveCredentials({ AZRAIL_URL: "https://a.example", AZRAIL_DEVICE_FILE: fresh }, { fetchFn: fetchFn as never, sleep, log: () => {} });
    expect(made).toMatchObject({ url: "https://a.example", device: true });
    expect(JSON.parse(await readFile(fresh, "utf8")).token).toBe(made!.token);
  });
});
