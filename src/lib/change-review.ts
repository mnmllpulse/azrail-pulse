import type { GeneratedFile } from "../types";
import { scanSecrets } from "./secret-scan";

export type ReviewChange = { path: string; kind: string; added: number; removed: number };
export type ReviewFinding = { level: "block" | "warn"; rule: string; text: string };
export type ChangeReview = { blocking: ReviewFinding[]; warnings: ReviewFinding[]; summary: string };

const PROTECTED: Array<[RegExp, string]> = [
  [/^\.github\/workflows\//, "настройки автоматических проверок и выкладки"],
  [/(^|\/)wrangler[^/]*\.jsonc?$/, "настройки Cloudflare"],
  [/^config\/environments\.json$/, "эталон конфигурации окружений"],
  [/^migrations\//, "миграции базы данных"],
  [/(^|\/)\.env(\.|$)/, "файл с секретами окружения"],
  [/(^|\/)package-lock\.json$/, "замок зависимостей"],
];
const MANY_FILES = 15;
const BIG_DELETE = 200;

/** Бесплатное ревью изменений по правилам, без модели. Блокирует только заведомо опасное; остальное — предупреждения. */
export function reviewChanges(changes: ReviewChange[], files: GeneratedFile[]): ChangeReview {
  const blocking: ReviewFinding[] = [];
  const warnings: ReviewFinding[] = [];
  const touched = new Set(changes.filter((c) => c.kind !== "удалён").map((c) => c.path));

  for (const finding of scanSecrets(files.filter((file) => touched.has(file.path))).filter((f) => f.severity === "high" || f.severity === "critical")) {
    blocking.push({ level: "block", rule: "secret", text: `Похоже на секрет в ${finding.file}:${finding.line} (${finding.type}, ${finding.masked}). Убери его из кода.` });
  }
  for (const change of changes) {
    const guard = PROTECTED.find(([re]) => re.test(change.path));
    if (guard) warnings.push({ level: "warn", rule: "protected", text: `Изменён ${change.path}: ${guard[1]}. Проверь глазами.` });
    if (change.kind === "удалён" && change.removed >= BIG_DELETE) warnings.push({ level: "warn", rule: "big-delete", text: `Удалён ${change.path} (${change.removed} строк).` });
    if (change.kind === "изменён" && change.removed >= BIG_DELETE && change.added < change.removed / 4) warnings.push({ level: "warn", rule: "wipe", text: `Из ${change.path} почти всё убрано: −${change.removed}, +${change.added}.` });
  }
  if (changes.length > MANY_FILES) warnings.push({ level: "warn", rule: "many-files", text: `Затронуто ${changes.length} файлов: слишком много для одной миссии.` });

  const summary = blocking.length
    ? blocking.map((f) => f.text).join(" ")
    : warnings.length
      ? `Замечаний: ${warnings.length}. ${warnings.map((f) => f.text).join(" ")}`
      : "Ревью по правилам: замечаний нет.";
  return { blocking, warnings, summary };
}
