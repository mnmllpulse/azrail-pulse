import type { Env } from "../types";

export type R2GcScope = "all" | "projects" | "backups" | "studio" | "uploads";

export type R2GcCandidate = {
  key: string;
  bytes: number;
  uploadedAt: string;
  reason: "unreferenced";
};

export type R2GcPreview = {
  dryRun: true;
  scope: R2GcScope;
  minAgeHours: number;
  scanned: number;
  protected: number;
  candidates: R2GcCandidate[];
  candidateBytes: number;
  truncated: boolean;
  referenceSetTruncated: boolean;
  safeToApply: false;
  note: string;
};

const REF_LIMIT = 5001;
const DEFAULT_SCAN_LIMIT = 1000;
const MAX_SCAN_LIMIT = 5000;
const MAX_RETURNED_CANDIDATES = 250;

function normalizePrefix(prefix: string): string {
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function uploadedMs(value: unknown): number | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = typeof value === "number" ? value : Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validScope(value: string): value is R2GcScope {
  return ["all", "projects", "backups", "studio", "uploads"].includes(value);
}

export function parseR2GcRequest(url: URL): {scope: R2GcScope; minAgeHours: number; maxObjects: number} {
  const rawScope = url.searchParams.get("scope") ?? "all";
  if (!validScope(rawScope)) throw new Error("scope должен быть all, projects, backups, studio или uploads.");
  const minAgeHours = Number(url.searchParams.get("minAgeHours") ?? 168);
  const maxObjects = Number(url.searchParams.get("maxObjects") ?? DEFAULT_SCAN_LIMIT);
  if (!Number.isSafeInteger(minAgeHours) || minAgeHours < 24 || minAgeHours > 24 * 365) {
    throw new Error("minAgeHours должен быть целым числом от 24 до 8760.");
  }
  if (!Number.isSafeInteger(maxObjects) || maxObjects < 1 || maxObjects > MAX_SCAN_LIMIT) {
    throw new Error(`maxObjects должен быть целым числом от 1 до ${MAX_SCAN_LIMIT}.`);
  }
  return {scope: rawScope, minAgeHours, maxObjects};
}

async function collectReferenceState(env: Env): Promise<{
  direct: Set<string>;
  prefixes: string[];
  truncated: boolean;
}> {
  const direct = new Set<string>();
  const prefixes = new Set<string>();
  let truncated = false;

  const rows = async <T>(sql: string): Promise<T[]> => {
    const result = await env.AZRAIL_D1.prepare(sql).all<T>();
    if (result.results.length >= REF_LIMIT) truncated = true;
    return result.results.slice(0, REF_LIMIT - 1);
  };

  for (const row of await rows<{id: string; r2_prefix: string | null}>(`SELECT id,r2_prefix FROM projects LIMIT ${REF_LIMIT}`)) {
    // Legacy project objects may predate one or more provenance tables. Until a
    // dedicated catalog migration proves every historical object, GC must be
    // conservative for the namespaces that old releases wrote directly.
    for (const suffix of ["workspace/","versions/","code/","ui/","snapshots/","snapshots-v2/"]) {
      prefixes.add(`projects/${row.id}/${suffix}`);
    }
    if (row.r2_prefix) prefixes.add(normalizePrefix(row.r2_prefix));
  }
  for (const row of await rows<{prefix: string}>(`SELECT prefix FROM workspace_heads LIMIT ${REF_LIMIT}`)) {
    if (row.prefix) prefixes.add(normalizePrefix(row.prefix));
  }
  for (const row of await rows<{prefix: string}>(`SELECT prefix FROM workspace_publications LIMIT ${REF_LIMIT}`)) {
    if (row.prefix) prefixes.add(normalizePrefix(row.prefix));
  }
  for (const row of await rows<{r2_object_key: string}>(`SELECT r2_object_key FROM project_versions LIMIT ${REF_LIMIT}`)) {
    if (!row.r2_object_key) continue;
    if (row.r2_object_key.endsWith("/")) prefixes.add(row.r2_object_key);
    else direct.add(row.r2_object_key);
  }
  for (const row of await rows<{r2_key: string}>(`SELECT r2_key FROM mission_snapshots LIMIT ${REF_LIMIT}`)) {
    if (!row.r2_key) continue;
    if (row.r2_key.endsWith("/")) prefixes.add(row.r2_key);
    else direct.add(row.r2_key);
  }
  for (const row of await rows<{r2_key: string}>(`SELECT r2_key FROM backup_manifests LIMIT ${REF_LIMIT}`)) {
    if (!row.r2_key) continue;
    direct.add(row.r2_key);
    const slash = row.r2_key.lastIndexOf("/");
    if (slash >= 0) prefixes.add(row.r2_key.slice(0, slash + 1));
  }
  for (const row of await rows<{r2_key: string}>(`SELECT r2_key FROM studio_artifacts LIMIT ${REF_LIMIT}`)) {
    if (row.r2_key) direct.add(row.r2_key);
  }
  for (const row of await rows<{resource_id: string}>(`SELECT resource_id FROM resource_owners WHERE kind='upload' LIMIT ${REF_LIMIT}`)) {
    if (row.resource_id) direct.add(row.resource_id);
  }

  return {direct, prefixes: [...prefixes].sort(), truncated};
}

function protectedByReference(key: string, direct: Set<string>, prefixes: string[]): boolean {
  if (direct.has(key)) return true;
  return prefixes.some((prefix) => key.startsWith(prefix));
}

function scopePrefixes(scope: R2GcScope): string[] {
  if (scope === "projects") return ["projects/"];
  if (scope === "backups") return ["backups/"];
  if (scope === "studio") return ["studio/"];
  if (scope === "uploads") return ["uploads/"];
  return ["projects/", "backups/", "studio/", "uploads/"];
}

/**
 * Build a bounded, read-only orphan plan. RC12 deliberately has no apply mode:
 * object deletion needs a second reviewed phase after this preview proves the
 * reference model against staging/production data.
 */
export async function previewR2GarbageCollection(
  env: Env,
  options: {scope?: R2GcScope; minAgeHours?: number; maxObjects?: number; now?: number} = {},
): Promise<R2GcPreview> {
  const scope = options.scope ?? "all";
  const minAgeHours = options.minAgeHours ?? 168;
  const maxObjects = Math.min(MAX_SCAN_LIMIT, Math.max(1, options.maxObjects ?? DEFAULT_SCAN_LIMIT));
  const now = options.now ?? Date.now();
  const cutoff = now - minAgeHours * 60 * 60 * 1000;
  const refs = await collectReferenceState(env);

  // An incomplete reference set cannot prove that any object is orphaned.
  // RC12 exposed candidates with a warning in this situation; RC14 fails
  // closed earlier so a human cannot accidentally treat a false positive as
  // deletion evidence.
  if (refs.truncated) {
    return {
      dryRun: true,
      scope,
      minAgeHours,
      scanned: 0,
      protected: 0,
      candidates: [],
      candidateBytes: 0,
      truncated: true,
      referenceSetTruncated: true,
      safeToApply: false,
      note: "Reference set достиг защитного лимита; orphan-кандидаты не вычисляются до полного набора ссылок.",
    };
  }

  let scanned = 0;
  let protectedCount = 0;
  let candidateBytes = 0;
  const candidates: R2GcCandidate[] = [];
  const states = scopePrefixes(scope).map(prefix => ({
    prefix,
    cursor: undefined as string | undefined,
    seen: new Set<string>(),
    done: false,
  }));

  // Round-robin pages across namespaces. The old sequential scan could spend
  // the entire global budget on projects/ and never inspect backups/studio/
  // uploads at all when scope=all.
  while (scanned < maxObjects && states.some(state => !state.done)) {
    for (const state of states) {
      if (state.done || scanned >= maxObjects) continue;
      const active = Math.max(1, states.filter(item => !item.done).length);
      const remaining = maxObjects - scanned;
      const limit = Math.max(1, Math.min(100, Math.floor(remaining / active) || 1));
      const page = await env.AZRAIL_R2.list({prefix: state.prefix, limit, cursor: state.cursor});
      for (const object of page.objects) {
        if (scanned >= maxObjects) break;
        scanned++;
        const key = object.key;
        if (protectedByReference(key, refs.direct, refs.prefixes)) {
          protectedCount++;
          continue;
        }
        const uploaded = uploadedMs((object as {uploaded?: unknown}).uploaded);
        // Unknown age is never considered deletion evidence.
        if (uploaded === null || uploaded > cutoff) continue;
        const bytes = Number.isFinite(object.size) && object.size >= 0 ? object.size : 0;
        candidateBytes += bytes;
        if (candidates.length < MAX_RETURNED_CANDIDATES) {
          candidates.push({key, bytes, uploadedAt: new Date(uploaded).toISOString(), reason: "unreferenced"});
        }
      }
      if (!page.truncated) {
        state.done = true;
        continue;
      }
      const next = page.cursor;
      if (!next || state.seen.has(next)) throw new Error(`R2 pagination cursor зациклился для ${state.prefix}`);
      state.seen.add(next);
      state.cursor = next;
    }
  }

  const truncated = states.some(state => !state.done);
  return {
    dryRun: true,
    scope,
    minAgeHours,
    scanned,
    protected: protectedCount,
    candidates,
    candidateBytes,
    truncated,
    referenceSetTruncated: false,
    safeToApply: false,
    note: truncated
      ? "Preview достиг общего лимита объектов; результаты распределены между scope-префиксами, но набор всё ещё неполон."
      : "Только preview. Автоматическое удаление R2 отключено.",
  };
}
