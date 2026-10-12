import type { Env } from "../types";
import { log } from "./resilience";

/** Compatibility hook; existence is now checked in the actual binding on every call. */
export function forgetProject(_projectId: string): void {}

export async function ensureProject(env: Env, projectId: string, name?: string): Promise<boolean> {
  if (!projectId) return false;
  try {
    await env.AZRAIL_D1.batch([
      env.AZRAIL_D1.prepare("INSERT OR IGNORE INTO users(id,name) VALUES('system','AZRAIL system')"),
      env.AZRAIL_D1.prepare("INSERT OR IGNORE INTO projects(id,user_id,name,status) VALUES(?,'system',?,'active')")
        .bind(projectId,name ?? projectId),
    ]);
    return true;
  } catch (err) {
    log("error", "project.ensure_failed", {projectId,error:err instanceof Error ? err.message : String(err)});
    return false;
  }
}
