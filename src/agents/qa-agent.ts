import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import type { Env, QaAgentState, TaskRequest, TaskResult, QaOperation } from "../types";
import { readSource } from "../lib/source-reader";
import { rememberFact } from "../lib/memory-agent";
import { assertRepo, pathSegment, UnsafePathError } from "../lib/safe-path";
import { githubRequest, readGithubError } from "../services/github-client";

/**
 * QA AGENT
 *
 * ГЛАВНОЕ ОГРАНИЧЕНИЕ, КОТОРОЕ НЕ ОБХОДИТСЯ: Cloudflare Worker не запускает
 * процессы — ни `npm test`, ни линтер, ни сборку. Агент, который заявляет
 * "я прогнал тесты", в этой среде врал бы.
 *
 * Поэтому QA Agent делает две реальные вещи:
 *   1. ДРАЙВИТ чужой раннер: триггерит GitHub Actions (workflow_dispatch),
 *      опрашивает статус, вытаскивает упавшие джобы и шаги. Тесты выполняет CI,
 *      AZRAIL ими управляет и читает результат — это честная граница.
 *   2. Статический анализ покрытия: какие модули не имеют тест-файла вообще.
 *      Это считается по файловой структуре, без выполнения кода, и потому
 *      воспроизводимо.
 *
 * ЧЕСТНО ПРО ИСТОЧНИК: формы ответов GitHub Actions API взяты по знанию API,
 * живыми запросами не проверены (api.github.com отдал rate-limit на IP
 * песочницы). Эндпоинты стабильные; проверяется одним вызовом latest_run.
 */


const TEST_FILE_RE = /\.(test|spec)\.[tj]sx?$|(^|\/)(__tests__|tests?)\//i;
const SOURCE_FILE_RE = /\.(ts|tsx|js|jsx)$/i;
const NON_MODULE_RE = /\.d\.ts$|(^|\/)(index|types|constants)\.[tj]sx?$/i;

export class QaAgent extends Agent<Env, QaAgentState> {
  initialState: QaAgentState = { lastRunAt: null };

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

    const op: QaOperation = request.qaOp ?? { type: "coverage_gaps" };

    if (op.type === "coverage_gaps") {
      return this.coverageGaps(request);
    }

    // Остальные операции идут в GitHub Actions
    if (!this.env.GITHUB_TOKEN) {
      return {
        status: "needs_input",
        agent: "qa-agent",
        summary: "Нет GITHUB_TOKEN — без него нельзя ни запустить CI, ни прочитать результаты.",
        questions: ["Задай секрет: `wrangler secret put GITHUB_TOKEN` (нужны права actions)."],
      };
    }

    const repo = request.gitRepo ?? this.env.GITHUB_REPO;
    if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      return {
        status: "needs_input",
        agent: "qa-agent",
        summary: "Не указан репозиторий.",
        questions: ['Передай "gitRepo": "owner/name" в запросе, либо задай секрет GITHUB_REPO.'],
      };
    }

    try {
      switch (op.type) {
        case "trigger_tests":
          return await this.triggerTests(repo, op);
        case "latest_run":
          return await this.latestRun(repo, op);
        case "check_run":
          return await this.checkRun(repo, op);
        default:
          return { status: "needs_input", agent: "qa-agent", summary: `Неизвестная операция: ${(op as { type: string }).type}` };
      }
    } catch (err) {
      if (err instanceof UnsafePathError) {
        return {
          status: "needs_input",
          agent: "qa-agent",
          summary: "Запрос отклонён: параметр не прошёл проверку безопасности.",
          error: err.message,
        };
      }
      return {
        status: "failed",
        agent: "qa-agent",
        summary: "Сбой при обращении к GitHub Actions API.",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async gh(path: string, init: RequestInit = {}): Promise<Response> {
    return githubRequest(this.env.GITHUB_TOKEN!, path, init);
  }

  /** Модули без единого тест-файла. Считается по структуре, без выполнения. */
  private async coverageGaps(request: TaskRequest): Promise<TaskResult> {
    let files;
    try {
      files = await readSource(this.env, request);
    } catch (err) {
      return {
        status: "failed",
        agent: "qa-agent",
        summary: "Не удалось прочитать исходники.",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const testFiles = files.filter((f) => TEST_FILE_RE.test(f.path));
    const sourceFiles = files.filter(
      (f) => SOURCE_FILE_RE.test(f.path) && !TEST_FILE_RE.test(f.path) && !NON_MODULE_RE.test(f.path),
    );

    if (sourceFiles.length === 0) {
      return {
        status: "needs_input",
        agent: "qa-agent",
        summary: "Не найдено исходных модулей для анализа.",
        questions: ["Пришли ZIP проекта (inputType=zip + r2Key) или репозиторий (inputType=github)."],
      };
    }

    // Модуль считается покрытым, если его basename упоминается в имени
    // какого-либо тест-файла ИЛИ импортируется из него. Это эвристика уровня
    // структуры, не метрика покрытия строк — так и называем в ответе.
    const testCorpus = testFiles.map((t) => `${t.path}\n${t.content}`).join("\n");
    const gaps = sourceFiles
      .map((f) => f.path)
      .filter((path) => {
        const base = (path.split("/").pop() ?? "").replace(/\.[tj]sx?$/, "");
        if (!base) return false;
        return !new RegExp(`\\b${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(testCorpus);
      });

    const covered = sourceFiles.length - gaps.length;
    const summary =
      testFiles.length === 0
        ? `Тест-файлов не найдено вообще. Модулей без тестов: ${sourceFiles.length}.`
        : `Тест-файлов: ${testFiles.length}. Модулей упомянуто в тестах: ${covered} из ${sourceFiles.length}. Без упоминания: ${gaps.length}.`;

    if (request.projectId && testFiles.length === 0 && sourceFiles.length > 3) {
      await rememberFact(this.env, request.projectId, {
        category: "known_issue",
        key: "no-tests",
        value: `В проекте нет ни одного тест-файла (${sourceFiles.length} модулей).`,
        sourceAgent: "qa-agent",
      });
    }

    return {
      status: "done",
      agent: "qa-agent",
      summary,
      data: {
        method: "структурный анализ (какие модули упоминаются в тестах), не метрика покрытия строк",
        testFiles: testFiles.map((t) => t.path),
        modulesWithoutTests: gaps,
        totals: { sourceModules: sourceFiles.length, testFiles: testFiles.length, withoutTests: gaps.length },
      },
    };
  }

  private async triggerTests(repo: string, op: Extract<QaOperation, { type: "trigger_tests" }>): Promise<TaskResult> {
    const res = await this.gh(`/repos/${assertRepo(repo)}/actions/workflows/${pathSegment(op.workflow, "workflow")}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: op.ref ?? "main" }),
    });
    if (!res.ok) {
      const detail = await readGithubError(res);
      return {
        status: "failed",
        agent: "qa-agent",
        summary: `Не удалось запустить workflow "${op.workflow}": GitHub вернул ${res.status}.`,
        error: detail.slice(0, 500),
      };
    }
    // GitHub отвечает 204 без тела и НЕ возвращает id запущенного прогона —
    // за статусом надо идти отдельно через latest_run.
    return {
      status: "done",
      agent: "qa-agent",
      summary: `Workflow "${op.workflow}" запущен на "${op.ref ?? "main"}". GitHub не возвращает id сразу — статус смотри через latest_run.`,
      data: { repo, workflow: op.workflow, ref: op.ref ?? "main" },
    };
  }

  private async latestRun(repo: string, op: Extract<QaOperation, { type: "latest_run" }>): Promise<TaskResult> {
    const query = new URLSearchParams({ per_page: "1" });
    if (op.branch) query.set("branch", op.branch);
    const path = op.workflow
      ? `/repos/${assertRepo(repo)}/actions/workflows/${pathSegment(op.workflow, "workflow")}/runs?${query}`
      : `/repos/${assertRepo(repo)}/actions/runs?${query}`;

    const res = await this.gh(path);
    if (!res.ok) {
      return { status: "failed", agent: "qa-agent", summary: `GitHub вернул ${res.status} на запрос прогонов.` };
    }
    const data = (await res.json()) as {
      workflow_runs?: Array<{ id: number; name?: string; status?: string; conclusion?: string | null; head_branch?: string; html_url?: string; created_at?: string }>;
    };
    const run = data.workflow_runs?.[0];
    if (!run) {
      return { status: "done", agent: "qa-agent", summary: "Прогонов не найдено.", data: { repo, run: null } };
    }

    return {
      status: "done",
      agent: "qa-agent",
      summary: `Прогон #${run.id} (${run.name ?? "?"}): ${run.status}${run.conclusion ? ` → ${run.conclusion}` : " (ещё идёт)"}.`,
      data: { repo, run },
    };
  }

  private async checkRun(repo: string, op: Extract<QaOperation, { type: "check_run" }>): Promise<TaskResult> {
    // runId объявлен как number, но приходит из JSON и типом не защищён:
    // строка "1/../../../user/repos" увела бы запрос на другой эндпоинт
    // GitHub — вместе с токеном из секретов воркера.
    const res = await this.gh(`/repos/${assertRepo(repo)}/actions/runs/${pathSegment(op.runId, "runId")}/jobs`);
    if (!res.ok) {
      return { status: "failed", agent: "qa-agent", summary: `GitHub вернул ${res.status} на запрос джобов прогона ${op.runId}.` };
    }
    const data = (await res.json()) as {
      jobs?: Array<{
        name: string;
        status?: string;
        conclusion?: string | null;
        html_url?: string;
        steps?: Array<{ name: string; status?: string; conclusion?: string | null; number?: number }>;
      }>;
    };
    const jobs = data.jobs ?? [];
    const failedJobs = jobs.filter((j) => j.conclusion && j.conclusion !== "success" && j.conclusion !== "skipped");

    // Вытаскиваем именно упавшие шаги — без них "job failed" бесполезен
    const failures = failedJobs.map((j) => ({
      job: j.name,
      conclusion: j.conclusion,
      url: j.html_url,
      failedSteps: (j.steps ?? [])
        .filter((s) => s.conclusion && s.conclusion !== "success" && s.conclusion !== "skipped")
        .map((s) => ({ step: s.name, conclusion: s.conclusion })),
    }));

    const running = jobs.some((j) => j.status !== "completed");
    return {
      status: "done",
      agent: "qa-agent",
      summary: running
        ? `Прогон ${op.runId} ещё идёт: завершено ${jobs.filter((j) => j.status === "completed").length} из ${jobs.length} джобов.`
        : failures.length > 0
          ? `Прогон ${op.runId}: упало джобов ${failures.length} из ${jobs.length}.`
          : `Прогон ${op.runId}: все ${jobs.length} джобов прошли.`,
      data: { repo, runId: op.runId, stillRunning: running, totalJobs: jobs.length, failures },
    };
  }
}
