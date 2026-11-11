import type { Env } from "../types";
import { AccessError } from "./accounts";

/** Пробные потолки. Ноль у выкладки значит: фраза из чата её не запускает. */
export const TRIAL_LIMITS = { speech: 10, sandbox: 3, github: 0 } as const;

const KEY = "azrail:trial:v1";

export type TrialState = {
  speech: boolean;
  sandbox: boolean;
  speechUsed: number;
  sandboxUsed: number;
};

function blank(): TrialState {
  return { speech: false, sandbox: false, speechUsed: 0, sandboxUsed: 0 };
}

function used(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

export async function readTrial(env: Env): Promise<TrialState> {
  const raw = await env.AZRAIL_KV.get(KEY, "json");
  if (!raw || typeof raw !== "object") return blank();
  const row = raw as Partial<TrialState>;
  return {
    speech: row.speech === true,
    sandbox: row.sandbox === true,
    speechUsed: used(row.speechUsed),
    sandboxUsed: used(row.sandboxUsed),
  };
}

export function trialView(state: TrialState) {
  return {
    ...state,
    limits: TRIAL_LIMITS,
    speechLeft: Math.max(0, TRIAL_LIMITS.speech - state.speechUsed),
    sandboxLeft: Math.max(0, TRIAL_LIMITS.sandbox - state.sandboxUsed),
    githubLeft: TRIAL_LIMITS.github,
  };
}

export async function writeTrialFlags(env: Env, flags: { speech?: boolean; sandbox?: boolean }) {
  const state = await readTrial(env);
  if (typeof flags.speech === "boolean") state.speech = flags.speech;
  if (typeof flags.sandbox === "boolean") state.sandbox = flags.sandbox;
  await env.AZRAIL_KV.put(KEY, JSON.stringify(state));
  return trialView(state);
}

/** Списывает одну попытку. На потолке сам гасит переключатель. Счётчик назад не откатывается. */
export async function consumeTrial(env: Env, lane: "speech" | "sandbox"): Promise<TrialState> {
  const state = await readTrial(env);
  const spent = lane === "speech" ? state.speechUsed : state.sandboxUsed;
  const open = lane === "speech" ? state.speech : state.sandbox;
  if (!open || spent >= TRIAL_LIMITS[lane]) {
    throw new AccessError(
      lane === "speech"
        ? "Озвучка ElevenLabs выключена. Говорит браузер."
        : "Команды в контейнере выключены. В настройках есть 3 пробных запуска.",
      403,
    );
  }
  if (lane === "speech") {
    state.speechUsed += 1;
    if (state.speechUsed >= TRIAL_LIMITS.speech) state.speech = false;
  } else {
    state.sandboxUsed += 1;
    if (state.sandboxUsed >= TRIAL_LIMITS.sandbox) state.sandbox = false;
  }
  await env.AZRAIL_KV.put(KEY, JSON.stringify(state));
  return state;
}

export async function runTrialSandbox(env: Env, projectId: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectId)) throw new AccessError("Нет проекта, тесты запускать негде.", 400);
  const state = await readTrial(env);
  if (!state.sandbox || state.sandboxUsed >= TRIAL_LIMITS.sandbox) {
    throw new AccessError("Команды в контейнере выключены. В настройках есть 3 пробных запуска.", 403);
  }
  const { ExecutionToolExecutor } = await import("../core/execution-tools");
  const box = new ExecutionToolExecutor(env);
  let spent = state;
  const result = await box.runTestsInContainer(projectId, async () => {
    spent = await consumeTrial(env, "sandbox");
  });
  if (!result) {
    return { ok: false, note: "В проекте нет тестов, запуск не списывался.", ...trialView(spent) };
  }
  const note = result.ok
    ? `Тесты прошли. Пробных запусков осталось ${Math.max(0, TRIAL_LIMITS.sandbox - spent.sandboxUsed)}.`
    : `Тесты не прошли. Пробных запусков осталось ${Math.max(0, TRIAL_LIMITS.sandbox - spent.sandboxUsed)}.`;
  return { ok: result.ok, note, output: result.output, exitCode: result.exitCode, ...trialView(spent) };
}
