import type { Env } from "../types";
import { log } from "./resilience";

/** Best-effort cleanup for objects that were staged but never published. */
export async function deleteR2KeysBestEffort(
  env: Env,
  keys: Iterable<string>,
  event: string,
  data: Record<string, unknown> = {},
): Promise<number> {
  let deleted = 0;
  for (const key of keys) {
    try {
      await env.AZRAIL_R2.delete(key);
      deleted++;
    } catch (error) {
      log("error", `${event}.delete_failed`, {
        ...data,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return deleted;
}

/**
 * Clean up staged R2 objects only after D1 proves that the publication record
 * does not exist. If the reference check itself fails, preserve the objects:
 * deleting a possibly committed version/backup is worse than leaving an orphan
 * for a later GC pass.
 */
export async function cleanupUnpublishedR2(
  env: Env,
  keys: Iterable<string>,
  isPublished: () => Promise<boolean>,
  event: string,
  data: Record<string, unknown> = {},
): Promise<{ deleted: number; preserved: boolean; published: boolean | null }> {
  const list = [...keys];
  if (!list.length) return { deleted: 0, preserved: false, published: false };

  let published: boolean;
  try {
    published = await isPublished();
  } catch (error) {
    log("error", `${event}.reference_check_failed`, {
      ...data,
      objects: list.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return { deleted: 0, preserved: true, published: null };
  }

  if (published) return { deleted: 0, preserved: true, published: true };
  return { deleted: await deleteR2KeysBestEffort(env, list, event, data), preserved: false, published: false };
}
