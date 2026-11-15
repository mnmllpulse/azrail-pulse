import type { Env } from "../types";
import { permissionMode, type PermissionMode } from "./permission-levels";

const KEY = "azrail:permission-mode:v1";
export const SETTABLE_MODES = ["ask", "trusted"] as const;

export async function readPermissionMode(env: Env): Promise<PermissionMode> {
  try {
    const stored = await env.AZRAIL_KV.get(KEY);
    if (stored) return permissionMode(stored);
  } catch {
    return "ask";
  }
  return permissionMode(env.AZRAIL_PERMISSION_MODE);
}

export async function writePermissionMode(env: Env, raw: unknown): Promise<PermissionMode> {
  if (typeof raw !== "string" || !(SETTABLE_MODES as readonly string[]).includes(raw)) {
    throw new RangeError("Режим: ask или trusted.");
  }
  await env.AZRAIL_KV.put(KEY, raw);
  return raw as PermissionMode;
}
