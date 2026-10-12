import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import { assertRepo, UnsafePathError } from "../lib/safe-path";
import { listZip, ZipError } from "../lib/zip-reader";
import { githubRequest, readGithubError } from "../services/github-client";
import type { Env, DeployAgentState, TaskRequest, TaskResult } from "../types";
import { approvalDigest, claimApproval, completeApproval, requestApproval } from "../lib/approval-engine";

const REQUIRED_FILES = ["package.json", ".env.example", ".gitignore"];
const CLOUDFLARE_CONFIG_FILES = ["config/environments.json", "wrangler.staging.json", "wrangler.production.json"];
const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 5000;
const MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;

function hasArchivePath(names: string[], expected: string): boolean {
  return names.some((name) => name === expected || name.endsWith(`/${expected}`));
}

/**
 * DEPLOY AGENT
 *
 * Честное ограничение платформы: Cloudflare Worker не может выполнять
 * npm install / build / test (нет доступа к процессам/shell). Поэтому
 * MVP-версия агента:
 *   1. безопасно индексирует ZIP без полной распаковки и проверяет canonical Cloudflare configs;
 *   2. формирует чек-лист рисков;
 *   3. если заданы GITHUB_TOKEN + GITHUB_REPO — триггерит уже существующий
 *      GitHub Actions → Cloudflare Workers Builds пайплайн через
 *      repository_dispatch, вместо того чтобы пытаться собрать проект сам.
 * Реальный build/test выполняет существующий CI (см. память проекта: деплой
 * идёт через Cloudflare Workers Builds, подключённый к GitHub).
 */
export class DeployAgent extends Agent<Env, DeployAgentState> {
  initialState: DeployAgentState = { lastRunAt: null };

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

    if (request.inputType === "zip" && request.r2Key) {
      return this.checkZipReadiness(request);
    }

    if (this.env.GITHUB_TOKEN && this.env.GITHUB_REPO) {
      return this.triggerCi(request);
    }

    return {
      status: "needs_input",
      agent: "deploy-agent",
      summary: "Готов проверить готовность к деплою или запустить существующий CI.",
      questions: [
        "Чтобы проверить архив — пришли input_type=zip с r2Key.",
        "Чтобы триггерить GitHub CI напрямую — задай секреты GITHUB_TOKEN и GITHUB_REPO (wrangler secret put).",
      ],
    };
  }

  private async checkZipReadiness(request: TaskRequest): Promise<TaskResult> {
    const obj = await this.env.AZRAIL_R2.get(request.r2Key!);
    if (!obj) {
      return { status: "failed", agent: "deploy-agent", summary: `Объект ${request.r2Key} не найден в AZRAIL_R2.` };
    }
    if (obj.size > MAX_ZIP_BYTES) {
      return {
        status: "needs_input",
        agent: "deploy-agent",
        summary: `ZIP слишком большой для безопасной проверки в Worker (${obj.size} байт; лимит ${MAX_ZIP_BYTES}).`,
      };
    }

    try {
      const archive = await obj.arrayBuffer();
      const listing = listZip(archive, MAX_ZIP_ENTRIES);
      if (listing.total > MAX_ZIP_ENTRIES) {
        return { status: "needs_input", agent: "deploy-agent", summary: `В архиве ${listing.total} файлов; лимит проверки ${MAX_ZIP_ENTRIES}.` };
      }

      const names = listing.entries.map((entry) => entry.path);
      const unsafe = listing.entries.filter((entry) => entry.skipped);
      const totalUncompressed = listing.entries.reduce((sum, entry) => sum + entry.size, 0);
      if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
        return {
          status: "needs_input",
          agent: "deploy-agent",
          summary: `Распакованный объём архива слишком большой (${totalUncompressed} байт; лимит ${MAX_UNCOMPRESSED_BYTES}).`,
          data: { fileCount: listing.total, totalUncompressedBytes: totalUncompressed },
        };
      }

      const missing = REQUIRED_FILES.filter((file) => !hasArchivePath(names, file));
      const missingCloudflare = CLOUDFLARE_CONFIG_FILES.filter((file) => !hasArchivePath(names, file));
      if (missingCloudflare.length > 0) missing.push(...missingCloudflare);

      const risks: string[] = [];
      if (unsafe.length > 0) risks.push(`${unsafe.length} ZIP-записей отклонены как небезопасные/неподдерживаемые.`);
      if (names.some((name) => name.includes("node_modules/"))) risks.push("В архиве лежит node_modules — его нужно исключить из source package.");
      if (!hasArchivePath(names, "SOURCE_MANIFEST.json")) risks.push("Нет SOURCE_MANIFEST.json — невозможно доказать точный состав source package.");

      const blocked = missing.length > 0 || unsafe.length > 0;
      return {
        status: blocked ? "needs_input" : "done",
        agent: "deploy-agent",
        summary: blocked
          ? `${missing.length ? `Не хватает обязательных файлов: ${missing.join(", ")}. ` : ""}${unsafe.length ? "ZIP содержит небезопасные или неподдерживаемые записи." : ""}`.trim()
          : "Source package безопасно проиндексирован без полной распаковки; canonical Cloudflare staging/production конфигурация присутствует.",
        data: {
          missingFiles: missing,
          risks,
          fileCount: listing.total,
          totalUncompressedBytes: totalUncompressed,
          rejectedEntries: unsafe.slice(0, 20).map((entry) => ({ path: entry.path, reason: entry.skipped })),
        },
        questions: blocked ? ["Исправь состав ZIP и повтори readiness check."] : undefined,
      };
    } catch (error) {
      if (error instanceof ZipError) {
        return { status: "failed", agent: "deploy-agent", summary: "ZIP не прошёл безопасный структурный разбор.", error: error.message };
      }
      throw error;
    }
  }

  private async triggerCi(request: TaskRequest): Promise<TaskResult> {
    // GITHUB_REPO — секрет окружения, а не поле из тела запроса, поэтому
    // риск здесь ниже, чем у аналогичных мест в git-agent.ts/qa-agent.ts,
    // где repo приходит из request. Но именно этот вызов до сих пор
    // интерполировал значение напрямую в URL, не пройдя через assertRepo,
    // хотя импорт уже стоял в файле — найдено при аудите, не было
    // отдельного теста, который бы это поймал.
    let repo: string;
    try {
      repo = assertRepo(this.env.GITHUB_REPO);
    } catch (err) {
      if (err instanceof UnsafePathError) {
        return {
          status: "failed",
          agent: "deploy-agent",
          summary: "GITHUB_REPO настроен некорректно — не похож на owner/name.",
          error: err.message,
        };
      }
      throw err;
    }

    const payloadDigest = await approvalDigest({ repo, eventType: "azrail-deploy", projectId: request.projectId ?? null });
    const scopeId = `${repo}:${request.projectId ?? "global"}`;
    const actor = `deploy:${request.userId ?? request.projectId ?? "unknown"}`;
    if (!request.approvalId) {
      const approval = await requestApproval(this.env, {
        accountId: request.userId,
        projectId: request.projectId,
        actionType: "deployment",
        risk: "critical",
        scopeType: "deployment",
        scopeId,
        payloadDigest,
        summary: `Запустить deployment pipeline для ${repo}${request.projectId ? ` / ${request.projectId}` : ""}`,
        requestedBy: actor,
      });
      return {
        status: "needs_input",
        agent: "deploy-agent",
        summary: "Deployment pipeline не запущен. Нужен отдельный approval.",
        data: { approvalId: approval.id, approvalStatus: approval.status, payloadDigest },
        questions: ["Подтверди deployment в Approval Center и повтори запрос с approvalId."],
      };
    }

    await claimApproval(this.env, {
      id: request.approvalId,
      actionType: "deployment",
      scopeType: "deployment",
      scopeId,
      payloadDigest,
      actor,
    });

    let dispatched = false;
    try {
      dispatched = true;
      const res = await githubRequest(this.env.GITHUB_TOKEN!, `/repos/${repo}/dispatches`, {
        method: "POST",
        body: JSON.stringify({
          event_type: "azrail-deploy",
          client_payload: { projectId: request.projectId ?? null, triggeredAt: new Date().toISOString() },
        }),
      });

      if (!res.ok) {
        const detail = await readGithubError(res);
        await completeApproval(this.env, { id: request.approvalId, actor, outcome: "failed", detail: { status: res.status } });
        return {
          status: "failed",
          agent: "deploy-agent",
          summary: `GitHub repository_dispatch вернул ${res.status}.`,
          error: detail,
        };
      }

      await completeApproval(this.env, { id: request.approvalId, actor, outcome: "executed", detail: { repo, eventType: "azrail-deploy" } });
      return {
        status: "done",
        agent: "deploy-agent",
        summary: `Событие azrail-deploy отправлено в ${repo} — дальше сборку и тесты ведёт существующий CI.`,
        data: { approvalId: request.approvalId },
      };
    } catch (error) {
      await completeApproval(this.env, { id: request.approvalId, actor, outcome: dispatched ? "uncertain" : "failed", detail: { error: error instanceof Error ? error.message : String(error) } }).catch(() => {});
      throw error;
    }
  }
}
