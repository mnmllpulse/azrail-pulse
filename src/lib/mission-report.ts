import type { QualityGateResult } from "../types";

export type ReportInput = {
  goal: string;
  status: string;
  summary?: string | null;
  error?: string | null;
  quality?: QualityGateResult | null;
  steps: Array<{ title: string; status: string }>;
  approvals: Array<{ status: string; summary: string }>;
  uncertainCount: number;
};

export type MissionReport = {
  headline: string;
  done: string[];
  checked: string[];
  left: string[];
  needsYou: string[];
  text: string;
};

const HEADLINES: Record<string, string> = {
  completed: "Миссия выполнена и проверена.",
  unverified: "Миссия выполнена, но проверка результат не подтвердила.",
  failed: "Миссия завершилась ошибкой.",
  cancelled: "Миссия остановлена.",
  terminated: "Миссия остановлена.",
  cancelling: "Миссия останавливается.",
  paused: "Миссия на паузе.",
  pausing: "Миссия ставится на паузу.",
  waiting_approval: "Миссия ждёт твоего разрешения.",
  queued: "Миссия в очереди.",
  executing: "Миссия в работе.",
};

const GATE: Record<string, string> = { passed: "пройдена", failed: "не пройдена", blocked: "заблокирована", skipped: "пропущена" };

const clip = (text: string, max = 160) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Итог миссии простыми словами. Без модели: только то, что записано в базе. Не заявляет «проверено», если проверка этого не подтвердила. */
export function buildMissionReport(input: ReportInput): MissionReport {
  const finished = ["completed", "unverified", "failed", "cancelled", "terminated"].includes(input.status);
  const done = input.steps.filter((step) => step.status === "done").map((step) => clip(step.title));
  const left = input.steps.filter((step) => step.status !== "done" && step.status !== "skipped").map((step) => clip(step.title));
  const skipped = input.steps.filter((step) => step.status === "skipped").length;

  const checked: string[] = [];
  const quality = input.quality;
  if (quality) {
    for (const gate of quality.gates ?? []) checked.push(`${gate.name}: ${GATE[gate.status] ?? gate.status}${gate.detail ? ` (${clip(gate.detail, 80)})` : ""}`);
    if (!quality.gates?.length) checked.push(quality.status === "verified" ? "Независимая проверка подтвердила результат." : `Проверка: ${quality.reason ?? "результат не подтверждён"}.`);
  } else if (finished) checked.push("Проверка результата не записана.");

  const needsYou: string[] = [];
  for (const approval of input.approvals.filter((item) => item.status === "pending")) needsYou.push(`Подтвердить: ${clip(approval.summary)}`);
  if (input.uncertainCount > 0) needsYou.push("Сверить исход внешнего действия: результат неизвестен, повторять нельзя.");
  if (input.status === "failed" && input.error && input.error !== "cancelled") needsYou.push(`Причина ошибки: ${clip(input.error)}`);

  const headline = HEADLINES[input.status] ?? `Статус миссии: ${input.status}.`;
  const lines = [headline, `Цель: ${clip(input.goal, 200)}`];
  if (input.summary) lines.push(`Итог: ${clip(input.summary, 400)}`);
  if (done.length) lines.push(`Сделано (${done.length} из ${input.steps.length}):`, ...done.map((title) => `• ${title}`));
  else if (input.steps.length) lines.push("Ни один шаг пока не завершён.");
  if (skipped) lines.push(`Пропущено шагов: ${skipped}.`);
  if (checked.length) lines.push("Проверено:", ...checked.map((item) => `• ${item}`));
  if (left.length && !finished) lines.push("Осталось:", ...left.map((title) => `• ${title}`));
  else if (left.length) lines.push("Не выполнено:", ...left.map((title) => `• ${title}`));
  if (needsYou.length) lines.push("Нужно от тебя:", ...needsYou.map((item) => `• ${item}`));
  return { headline, done, checked, left, needsYou, text: lines.join("\n") };
}
