import type { StepRecord } from "./execution-types";

export interface LocalCheck {
  label: string;
  tool: "local_list" | "local_read";
  input: Record<string, unknown>;
  test: (output: string) => string | null;
}

const MUTATIONS = new Set(["local_mkdir", "local_write", "local_move", "local_trash"]);
const split = (path: string) => path.trim().replace(/[\\/]+$/, "").split(/[\\/]+/).filter(Boolean);
const parentOf = (path: string) => split(path).slice(0, -1).join("/");
const nameOf = (path: string) => split(path).at(-1) ?? "";
const lines = (output: string) => output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const hasEntry = (output: string, name: string) => lines(output).some((line) => line.replace(/\/$/, "") === name);
const unix = (text: string) => text.replace(/\r\n/g, "\n");

const succeeded = (step: StepRecord) => step.ok && /"status":"done"/.test(step.result);
const str = (value: unknown) => (typeof value === "string" ? value : "");

function checkFor(step: StepRecord): LocalCheck[] {
  const path = str(step.input.path);
  if (!path) return [];
  const root = step.input.root;
  const withRoot = (input: Record<string, unknown>) => (root ? { ...input, root } : input);
  const name = nameOf(path);
  const listParent = (target: string, label: string, test: (out: string) => string | null): LocalCheck => ({
    label,
    tool: "local_list",
    input: withRoot({ path: parentOf(target) }),
    test,
  });
  switch (step.tool) {
    case "local_mkdir":
      return [listParent(path, `папка «${name}» есть`, (out) => (hasEntry(out, name) ? null : `папки «${name}» нет в «${parentOf(path) || "корне"}»`))];
    case "local_write": {
      const content = unix(str(step.input.content));
      return [{
        label: `файл «${name}» записан`,
        tool: "local_read",
        input: withRoot({ path }),
        test: (out) => (unix(out).startsWith(content.slice(0, 2000)) ? null : `содержимое «${name}» не совпадает с записанным`),
      }];
    }
    case "local_move": {
      const to = str(step.input.to);
      if (!to) return [];
      const target = to.includes("/") || to.includes("\\") ? to : [parentOf(path), to].filter(Boolean).join("/");
      return [
        listParent(path, `«${name}» ушёл из старого места`, (out) => (hasEntry(out, name) && parentOf(path) !== parentOf(target) ? `«${name}» всё ещё на старом месте` : null)),
        listParent(target, `«${nameOf(target)}» появился в новом месте`, (out) => (hasEntry(out, nameOf(target)) ? null : `«${nameOf(target)}» не найден в «${parentOf(target) || "корне"}»`)),
      ];
    }
    case "local_trash":
      return [listParent(path, `«${name}» убран`, (out) => (hasEntry(out, name) ? `«${name}» всё ещё на месте` : null))];
    default:
      return [];
  }
}

/** Успешные мутации на компьютере, появившиеся после последней проверки, и что проверить по каждой. */
export function pendingLocalChecks(history: StepRecord[]): LocalCheck[] {
  const lastVerify = history.map((step) => step.tool).lastIndexOf("verify");
  const latest = new Map<string, StepRecord>();
  history.forEach((step, index) => {
    if (index > lastVerify && MUTATIONS.has(step.tool) && succeeded(step)) latest.set(`${step.tool}:${str(step.input.path)}`, step);
  });
  return [...latest.values()].flatMap(checkFor);
}

const CODE_PATH = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|cs|rb|php|swift|c|h|cpp|hpp|vue|svelte)$/i;
const TEST_COMMAND = /\b(?:test|tests|vitest|jest|pytest|mocha|check|tsc|lint|build|typecheck)\b/i;

/** Код правили, а после последней правки ни тестов, ни сборки не запускали. */
export function testsMissingAfterCodeEdit(history: StepRecord[]): boolean {
  const lastEdit = history.reduce((found, step, index) => (["local_edit", "local_write"].includes(step.tool) && succeeded(step) && CODE_PATH.test(str(step.input.path)) ? index : found), -1);
  if (lastEdit < 0) return false;
  return !history.some((step, index) => index > lastEdit && ["local_shell", "local_run"].includes(step.tool) && TEST_COMMAND.test(str(step.input.command) || str(step.input.path)));
}
