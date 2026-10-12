import type { Env } from "../types";
import { positiveLimit, reserveQuota } from "./quota";

export interface BudgetState { allowed: boolean; used: number; limit: number; remaining: number }

/** Estimated writes, reserved atomically. This is not an exact billing ceiling. */
export async function chargeWrites(env: Env, cost: number): Promise<BudgetState> {
  const state = await reserveQuota(env, "writes:shared", cost, positiveLimit(env.AZRAIL_WRITE_BUDGET, 5000));
  return { ...state, remaining: Math.max(0, state.limit - state.used) };
}

/** Сколько записей может потребовать миссия в худшем случае. */
export function estimateMissionWrites(maxIterations: number): number {
  // На шаг: событие начала, событие конца, запись вызова инструмента,
  // обновление плана. Плюс создание миссии, план, проверки, финал.
  const perStep = 4;
  const fixed = 20;
  return maxIterations * perStep + fixed;
}

