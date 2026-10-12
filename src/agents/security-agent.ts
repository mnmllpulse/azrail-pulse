import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import type { Env, SecurityAgentState, TaskRequest, TaskResult } from "../types";
import { readSource } from "../lib/source-reader";
import { scanSecrets, type SecretFinding } from "../lib/secret-scan";
import { parseDependencies, scanDependencies, type VulnFinding } from "../lib/cve-scan";
import { rememberFact } from "../lib/memory-agent";

/**
 * SECURITY AGENT
 *
 * Сознательно НЕ делает AI-ревью на XSS/SQLi/SSRF — это уже есть в системном
 * промпте Code Agent, и второй агент с тем же промптом был бы переклейкой
 * вывески, а не новой возможностью.
 *
 * Делает ровно то, чего модель надёжно не может:
 *   1. CVE-скан зависимостей по живой базе OSV.dev — модель не знает уязвимости,
 *      вышедшие после обучения, и выдумывает идентификаторы.
 *   2. Скан утёкших секретов по regex — воспроизводимо, с номерами строк,
 *      с маскировкой значений (полный секрет не уходит в ответ и логи).
 */
export class SecurityAgent extends Agent<Env, SecurityAgentState> {
  initialState: SecurityAgentState = { lastRunAt: null };

  /** См. RunnableAgent.ping — проверка того, что DO поднимается и отвечает. */
  async ping() {
    let storageReadable = false;
    try {
      // Прямой запрос к хранилищу Durable Object, а не чтение this.state:
      // геттер состояния кеширует и на тёплом экземпляре не дошёл бы до
      // SQLite вообще. Подробности — в комментарии к AgentPing.
      this.sql`SELECT 1`;
      storageReadable = true;
    } catch {
      storageReadable = false;
    }
    return { storageReadable };
  }

  async run(request: TaskRequest): Promise<TaskResult> {
    return withBillingScope(request._billingScope ?? projectBillingScope(request.projectId), () => this.runScoped(request));
  }

  private async runScoped(request: TaskRequest): Promise<TaskResult> {
    this.setState({ lastRunAt: new Date().toISOString() });

    let files;
    try {
      files = await readSource(this.env, request);
    } catch (err) {
      return {
        status: "failed",
        agent: "security-agent",
        summary: "Не удалось прочитать исходники для скана.",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (files.length === 0) {
      return {
        status: "needs_input",
        agent: "security-agent",
        summary: "Нечего сканировать.",
        questions: ["Пришли ZIP-архив проекта (inputType=zip + r2Key) или репозиторий (inputType=github)."],
      };
    }

    const secrets = scanSecrets(files);

    const deps = parseDependencies(files);
    let vulns: VulnFinding[] = [];
    let cveError: string | null = null;
    if (deps.length > 0) {
      try {
        vulns = await scanDependencies(deps);
      } catch (err) {
        // OSV лёг или изменил формат — не выдаём это за "уязвимостей нет".
        cveError = err instanceof Error ? err.message : String(err);
      }
    }

    const summary = this.buildSummary(files.length, secrets, deps.length, vulns, cveError);

    // Утёкший секрет — факт про проект, который должен всплыть в следующих
    // задачах, а не потеряться в одном отчёте.
    if (request.projectId && secrets.length > 0) {
      await rememberFact(this.env, request.projectId, {
        category: "known_issue",
        key: "leaked-secrets",
        value: `Найдены захардкоженные секреты: ${secrets
          .slice(0, 5)
          .map((s) => `${s.file}:${s.line} (${s.type})`)
          .join("; ")}. Требуется ротация ключей и вынос в секреты окружения.`,
        sourceAgent: "security-agent",
      });
    }

    return {
      status: "done",
      agent: "security-agent",
      summary,
      data: {
        filesScanned: files.length,
        secrets,
        dependenciesChecked: deps.length,
        vulnerabilities: vulns,
        cveScanError: cveError,
      },
    };
  }

  private buildSummary(
    fileCount: number,
    secrets: SecretFinding[],
    depCount: number,
    vulns: VulnFinding[],
    cveError: string | null,
  ): string {
    const parts = [`Просканировано файлов: ${fileCount}.`];

    if (secrets.length > 0) {
      const critical = secrets.filter((s) => s.severity === "critical").length;
      parts.push(`Секретов найдено: ${secrets.length}${critical ? ` (критичных: ${critical})` : ""}.`);
    } else {
      parts.push("Утёкших секретов не найдено.");
    }

    if (depCount === 0) {
      parts.push("Манифестов зависимостей (package.json / requirements.txt / Cargo.toml) не найдено — CVE-скан не выполнялся.");
    } else if (cveError) {
      parts.push(`Зависимостей: ${depCount}, но CVE-скан не прошёл: ${cveError}. Это НЕ значит, что уязвимостей нет.`);
    } else if (vulns.length > 0) {
      parts.push(`Уязвимых зависимостей: ${vulns.length} из ${depCount} проверенных.`);
    } else {
      parts.push(`Проверено зависимостей: ${depCount}, известных уязвимостей нет.`);
    }

    return parts.join(" ");
  }
}
