// AZRAIL — свежесть зависимостей по npm registry.
//
// ИСТОЧНИК ПРОВЕРЕН ЖИВЬЁМ (в отличие от OSV и GitHub Actions API в этом
// проекте): формы ответов registry.npmjs.org сверены реальными запросами —
// GET /{pkg}/latest отдаёт {version}, GET /{pkg} отдаёт dist-tags, флаг
// deprecated на версии и time[version] с датой релиза.
//
// Почему не спросить модель "какие зависимости устарели": модель не знает
// релизы после обучения и не может знать дату последнего релиза пакета.

import type { Dependency } from "./cve-scan";
import { fetchJsonBounded, mapConcurrent } from "../services/http-json";

const REGISTRY = "https://registry.npmjs.org";
const MAX_CHECKS = 60;
const STALE_AFTER_DAYS = 730; // 2 года без релиза — сигнал, не приговор

export interface FreshnessFinding {
  package: string;
  current: string;
  latest: string;
  /** major | minor | patch | up-to-date */
  drift: string;
  deprecated: string | null;
  /** Дней с последнего релиза latest-версии */
  daysSinceRelease: number | null;
  stale: boolean;
}

function parseSemver(v: string): [number, number, number] | null {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function driftLevel(current: string, latest: string): string {
  const a = parseSemver(current);
  const b = parseSemver(latest);
  if (!a || !b) return "unknown";
  if (b[0] > a[0]) return "major";
  if (b[0] === a[0] && b[1] > a[1]) return "minor";
  if (b[0] === a[0] && b[1] === a[1] && b[2] > a[2]) return "patch";
  return "up-to-date";
}

export async function checkFreshness(deps: Dependency[]): Promise<FreshnessFinding[]> {
  const npmDeps = deps.filter((d) => d.ecosystem === "npm").slice(0, MAX_CHECKS);
  if (npmDeps.length === 0) return [];

  const results = await mapConcurrent(npmDeps, 6, async (dep): Promise<FreshnessFinding | null> => {
    try {
      const { data: doc } = await fetchJsonBounded<{
        "dist-tags"?: { latest?: string };
        versions?: Record<string, { deprecated?: string }>;
        time?: Record<string, string>;
      }>(`${REGISTRY}/${encodeURIComponent(dep.name)}`, { timeoutMs: 10_000, maxBytes: 4 * 1024 * 1024 });
      if (!doc) return null;
      const latest = doc["dist-tags"]?.latest;
      if (!latest) return null;

      const releasedAt = doc.time?.[latest];
      const daysSinceRelease = releasedAt
        ? Math.floor((Date.now() - new Date(releasedAt).getTime()) / 86_400_000)
        : null;

      return {
        package: dep.name,
        current: dep.version,
        latest,
        drift: driftLevel(dep.version, latest),
        deprecated: doc.versions?.[latest]?.deprecated ?? null,
        daysSinceRelease,
        stale: daysSinceRelease !== null && daysSinceRelease > STALE_AFTER_DAYS,
      };
    } catch {
      return null;
    }
  });

  // Актуальные и живые пакеты в отчёт не тащим — это шум.
  return results.filter(
    (r): r is FreshnessFinding => r !== null && (r.drift !== "up-to-date" || r.deprecated !== null || r.stale),
  );
}
