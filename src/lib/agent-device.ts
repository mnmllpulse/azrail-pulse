import { AccessError } from "./accounts";
import { authenticateAgent, sanitizeAgentRoot, sanitizeAgentRoots, sha256Hex, type AgentRoot, type AgentStore } from "./local-agent";

/** Привязанный компьютер: постоянный ключ, доступ всё равно открывается только окном «Включить» в чате. */
export interface AgentDevice {
  tokenHash: string;
  pairedAt: number;
  lastSeen: number | null;
  root?: string | null;
  roots?: AgentRoot[];
}

export interface AgentPairing {
  code: string;
  secretHash: string;
  expiresAt: number;
  createdAt: number;
  attempts: number;
  /** Ключ для агента: живёт здесь только до первой выдачи. */
  deviceToken: string | null;
}

export interface DeviceStore {
  getDevice(): Promise<AgentDevice | null>;
  setDevice(device: AgentDevice | null): Promise<void>;
  getPairing(): Promise<AgentPairing | null>;
  setPairing(pairing: AgentPairing | null): Promise<void>;
}

export const PAIRING_TTL_MS = 10 * 60 * 1000;
export const PAIRING_THROTTLE_MS = 5_000;
export const PAIRING_MAX_ATTEMPTS = 5;

const randomHex = (bytes: number) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");

export function newDeviceToken(): string {
  return `azdev_${randomHex(32)}`;
}

function newCode(): string {
  const digits = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => String(b % 10)).join("");
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export const normalizeCode = (raw: unknown): string => (typeof raw === "string" ? raw.replace(/\D/g, "") : "");

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Агент просит привязку: получает код для показа владельцу и тайну для опроса. */
export async function startPairing(store: DeviceStore, now = Date.now()): Promise<{ code: string; secret: string; expiresAt: number }> {
  const current = await store.getPairing();
  if (current && current.expiresAt > now && now - current.createdAt < PAIRING_THROTTLE_MS) throw new AccessError("Запрос привязки уже создан. Подожди несколько секунд.", 429);
  const secret = `azpair_${randomHex(24)}`;
  const code = newCode();
  const expiresAt = now + PAIRING_TTL_MS;
  await store.setPairing({ code: normalizeCode(code), secretHash: await sha256Hex(secret), expiresAt, createdAt: now, attempts: 0, deviceToken: null });
  return { code, secret, expiresAt };
}

/** Владелец вводит код, показанный в окне агента. После пяти ошибок запрос сгорает. */
export async function approvePairing(store: DeviceStore, rawCode: unknown, now = Date.now()): Promise<void> {
  const pairing = await store.getPairing();
  if (!pairing || pairing.expiresAt <= now) throw new AccessError("Нет ожидающей привязки. Запусти агента на компьютере.", 404);
  if (pairing.deviceToken) throw new AccessError("Этот компьютер уже подтверждён.", 409);
  const code = normalizeCode(rawCode);
  if (code.length !== 8 || !sameText(code, pairing.code)) {
    const attempts = pairing.attempts + 1;
    await store.setPairing(attempts >= PAIRING_MAX_ATTEMPTS ? null : { ...pairing, attempts });
    throw new AccessError(attempts >= PAIRING_MAX_ATTEMPTS ? "Слишком много ошибок. Запусти агента заново." : "Код не подходит. Сверь с окном на компьютере.", 400);
  }
  const token = newDeviceToken();
  await store.setDevice({ tokenHash: await sha256Hex(token), pairedAt: now, lastSeen: null, root: null, roots: [] });
  await store.setPairing({ ...pairing, deviceToken: token });
}

export type PairPoll = { status: "pending" } | { status: "approved"; token: string };

/** Агент спрашивает, подтвердил ли владелец. Ключ отдаётся один раз. */
export async function pollPairing(store: DeviceStore, rawSecret: unknown, now = Date.now()): Promise<PairPoll> {
  const pairing = await store.getPairing();
  if (!pairing || pairing.expiresAt <= now) throw new AccessError("Запрос привязки истёк. Запусти агента заново.", 410);
  if (typeof rawSecret !== "string" || !sameText(await sha256Hex(rawSecret), pairing.secretHash)) throw new AccessError("Неверная тайна привязки.", 401);
  if (!pairing.deviceToken) return { status: "pending" };
  await store.setPairing(null);
  return { status: "approved", token: pairing.deviceToken };
}

export async function forgetDevice(store: DeviceStore): Promise<void> {
  await store.setDevice(null);
  await store.setPairing(null);
}

/** Проверка постоянного ключа. Всегда отмечает присутствие; возвращает устройство или null. */
export async function authenticateDevice(store: DeviceStore, header: string | null, now = Date.now(), root?: string | null, roots?: string | null): Promise<AgentDevice | null> {
  const token = header?.match(/^Bearer (azdev_[a-f0-9]{64})$/)?.[1];
  if (!token) return null;
  const device = await store.getDevice();
  if (!device || !sameText(await sha256Hex(token), device.tokenHash)) return null;
  const parsedRoots = sanitizeAgentRoots(roots);
  const next: AgentDevice = { ...device, lastSeen: now, root: parsedRoots?.[0]?.path ?? sanitizeAgentRoot(root) ?? device.root ?? null, roots: parsedRoots ?? device.roots };
  await store.setDevice(next);
  return next;
}

/** Любой ключ агента: сессионный (старый путь) или постоянный. `active` — открыто ли окно «Включить» и можно ли отдавать задачи. */
export async function authenticateAnyAgent(agent: AgentStore, devices: DeviceStore, header: string | null, now = Date.now(), root?: string | null, roots?: string | null): Promise<{ ok: boolean; active: boolean }> {
  if (header?.startsWith("Bearer azdev_")) {
    const device = await authenticateDevice(devices, header, now, root, roots);
    if (!device) return { ok: false, active: false };
    const state = await agent.getState();
    const active = !!state && state.expiresAt > now;
    if (active) await agent.setState({ ...state!, lastSeen: now, root: device.root ?? state!.root, roots: device.roots?.length ? device.roots : state!.roots });
    return { ok: true, active };
  }
  const ok = await authenticateAgent(agent, header, now, root, roots);
  return { ok, active: ok };
}

export async function deviceStatus(store: DeviceStore, now = Date.now()) {
  const [device, pairing] = await Promise.all([store.getDevice(), store.getPairing()]);
  return {
    paired: !!device,
    deviceOnline: !!device?.lastSeen && now - device.lastSeen < 20_000,
    pairedAt: device?.pairedAt ?? null,
    pairingWaiting: !!pairing && pairing.expiresAt > now && !pairing.deviceToken,
  };
}
