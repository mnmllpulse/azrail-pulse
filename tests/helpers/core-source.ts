import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");

/**
 * Execution Engine разнесён по модулям src/core/execution-*.ts
 * (engine, tools, journal, planning, protocol, types). Тесты, сверяющие
 * исходный код, читают их как единое целое, чтобы не зависеть от того,
 * в какой из файлов перенесён конкретный фрагмент.
 */
export function coreEngineSource(): string {
  const order = ["execution-journal", "execution-tools", "execution-engine", "execution-planning", "execution-protocol", "execution-types"];
  const extra = readdirSync(resolve(root, "src/core"))
    .filter((f) => /^execution-.*\.ts$/.test(f) && !order.includes(f.replace(/\.ts$/, "")))
    .map((f) => f.replace(/\.ts$/, ""));
  return [...order, ...extra].map((f) => readFileSync(resolve(root, `src/core/${f}.ts`), "utf8")).join("\n");
}
