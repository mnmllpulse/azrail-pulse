import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import { agentPrompt } from "../lib/azrail-prompt";
import { log } from "../lib/resilience";
import { runModel, extractText } from "../lib/model-router";
import { taskTrace } from "../lib/observability-context";
import { recallContext } from "../lib/memory-agent";
import type { Env, EvolutionAgentState, TaskRequest, TaskResult } from "../types";
import { readSource } from "../lib/source-reader";
import { parseDependencies } from "../lib/cve-scan";
import { checkFreshness, type FreshnessFinding } from "../lib/freshness";
import { listFacts, rememberFact } from "../lib/memory-agent";

/**
 * EVOLUTION AGENT
 *
 * Отличие от Code Agent: тот видит СНИМОК кода, этот видит ТРАЕКТОРИЮ —
 * что ломалось повторно, какие known_issue висят непочиненными, где чаще
 * всего переписывались версии. Такие выводы нельзя сделать из одного
 * состояния репозитория, только из накопленной истории в D1.
 *
 * Плюс детерминированная часть: свежесть зависимостей по npm registry
 * (реальные даты релизов и флаги deprecated, а не догадки модели).
 *
 * Запускается последним в дорожной карте намеренно: в первый день работы
 * системы анализировать нечего — истории ещё нет.
 */

const EVOLUTION_SYSTEM_PROMPT_ROLE = `Ты — Evolution Agent внутри AZRAIL. Роль: технический аудитор проекта.

Тебе дают НЕ снимок кода, а накопленные факты о проекте: историю выполненных
задач с их статусами, известные проблемы, зафиксированные архитектурные решения,
и результат проверки свежести зависимостей.

Твоя задача — ответить на четыре вопроса, опираясь ТОЛЬКО на переданные данные:
1. Что стоит улучшить в первую очередь и почему именно это.
2. Какие технические решения устарели или начали мешать.
3. Где узкие места — что ломается повторно, что висит непочиненным.
4. Что делать с зависимостями (данные по ним уже посчитаны, не выдумывай версии).

Правила:
- Приоритизируй: сначала то, что уже проявилось в истории как проблема, потом гипотезы.
- Если данных мало (короткая история, мало задач) — так и скажи, не выдавай
  общие советы по разработке за анализ конкретного проекта.
- Никаких "рекомендуется следовать лучшим практикам" без привязки к фактам ниже.
- Не выдумывай проблемы, которых нет в данных.

Если приходишь к выводу, который стоит зафиксировать про проект НА БУДУЩЕЕ:
---MEMORY---
category: known_issue | key: короткий-slug | value: суть
---END---`;

const EVOLUTION_SYSTEM_PROMPT = agentPrompt(EVOLUTION_SYSTEM_PROMPT_ROLE);


interface HistoryRow {
  agent: string;
  intent: string | null;
  status: string;
  output_summary: string | null;
  error: string | null;
  started_at: string;
}

export class EvolutionAgent extends Agent<Env, EvolutionAgentState> {
  initialState: EvolutionAgentState = { lastRunAt: null };

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

    if (!request.projectId) {
      return {
        status: "needs_input",
        agent: "evolution-agent",
        summary: "Нужен projectId — агент анализирует накопленную историю проекта, а не разовый вход.",
        questions: ['Передай "projectId" проекта, по которому уже выполнялись задачи.'],
      };
    }

    // 1. Траектория из D1
    const history = await this.loadHistory(request.projectId);
    const facts = await listFacts(this.env, request.projectId, 50);
    const versionCount = await this.countVersions(request.projectId);

    // 2. Детерминированная часть — свежесть зависимостей
    let freshness: FreshnessFinding[] = [];
    let freshnessNote: string | null = null;
    if (request.inputType || request.r2Key) {
      try {
        const files = await readSource(this.env, request);
        const deps = parseDependencies(files);
        if (deps.length === 0) {
          freshnessNote = "Манифестов зависимостей не найдено.";
        } else {
          freshness = await checkFreshness(deps);
        }
      } catch (err) {
        freshnessNote = `Не удалось проверить зависимости: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      freshnessNote = "Исходники не приложены — проверка зависимостей не выполнялась.";
    }

    // 3. Агрегаты, которые видно только по истории
    const failures = history.filter((h) => h.status === "failed");
    const repeatOffenders = this.findRepeats(failures);
    const openIssues = facts.filter((f) => f.category === "known_issue");

    if (history.length === 0 && facts.length === 0) {
      return {
        status: "needs_input",
        agent: "evolution-agent",
        summary: "По этому проекту ещё нет истории — анализировать нечего.",
        questions: ["Выполни несколько задач через AZRAIL, потом запусти Evolution Agent повторно."],
      };
    }

    // 4. Синтез моделью поверх РЕАЛЬНЫХ агрегатов
    const dataBlock = this.buildDataBlock(history, openIssues, repeatOffenders, versionCount, freshness, freshnessNote);

    /* Память проекта в аудит.
     *
     * Единственный агент из «безмолвной четвёрки», которому она вообще
     * нужна: qa, security, git и deploy к модели не обращаются — это
     * чистая логика над GitHub API и статические сканеры, память там
     * некуда подставить.
     *
     * Здесь она меняет вывод по существу: аудит без прошлых решений
     * повторно предлагает то, что уже пробовали и отвергли.
     *
     * Сбой памяти аудит не останавливает — детерминированная часть
     * ценна и без неё. */
    let memory: string | null = null;
    try {
      memory = request.projectId ? await recallContext(this.env, request.projectId, 30, {missionId:request._missionId}) : null;
    } catch {
      memory = null;
    }

    let modelOutput = "";
    try {
      const routed = await runModel<{ response?: string }>(this.env, "evolution_audit", {
        messages: [
          { role: "system", content: EVOLUTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: memory
              ? `РАНЕЕ ПРИНЯТЫЕ РЕШЕНИЯ ПО ПРОЕКТУ:\n${memory}\n\n${dataBlock}`
              : dataBlock,
          },
        ],
      }, { preferredModel: request.preferredModel, trace: taskTrace(request) });
      modelOutput = extractText(routed.output);
    } catch (err) {
      // Модель упала — детерминированная часть всё равно ценна, отдаём её.
      return {
        status: "done",
        agent: "evolution-agent",
        summary: `Синтез недоступен (${err instanceof Error ? err.message : String(err)}), но собранные факты ниже.`,
        data: { history: history.length, openIssues, repeatOffenders, freshness, freshnessNote },
      };
    }

    const facts_extracted = modelOutput.match(/---MEMORY---([\s\S]*?)---END---/);
    if (facts_extracted) {
      const line = facts_extracted[1].match(/key:\s*([^|]+)\|\s*value:\s*(.+)/);
      if (line) {
        await rememberFact(this.env, request.projectId, {
          category: "known_issue",
          key: line[1].trim(),
          value: line[2].trim(),
          sourceAgent: "evolution-agent",
        });
      }
    }
    const clean = modelOutput.replace(/---MEMORY---[\s\S]*?---END---/, "").trim();

    return {
      status: "done",
      agent: "evolution-agent",
      summary: clean.length > 400 ? clean.slice(0, 400) + "…" : clean,
      data: {
        report: clean,
        tasksAnalyzed: history.length,
        failedTasks: failures.length,
        repeatOffenders,
        openIssues,
        versionCount,
        freshness,
        freshnessNote,
      },
    };
  }

  private async loadHistory(projectId: string): Promise<HistoryRow[]> {
    try {
      const { results } = await this.env.AZRAIL_D1.prepare(
        `SELECT agent, intent, status, output_summary, error, started_at
         FROM task_history WHERE project_id = ? ORDER BY started_at DESC LIMIT 100`,
      )
        .bind(projectId)
        .all<HistoryRow>();
      return results ?? [];
    } catch (err) {
      // Молчаливый возврат пустого списка уже однажды замаскировал настоящую
      // поломку (внешние ключи роняли все вставки, а выглядело это как
      // "истории нет"). Пустой результат отдаём, но в логах он различим.
      log("error", "evolution.history_read_failed", {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  private async countVersions(projectId: string): Promise<number> {
    try {
      const { results } = await this.env.AZRAIL_D1.prepare(
        "SELECT COUNT(*) AS n FROM project_versions WHERE project_id = ?",
      )
        .bind(projectId)
        .all<{ n: number }>();
      return results?.[0]?.n ?? 0;
    } catch (err) {
      log("error", "evolution.version_count_failed", {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }

  /** Повторяющиеся сбои — то, что нельзя увидеть в снимке кода. */
  private findRepeats(failures: HistoryRow[]): Array<{ signature: string; count: number }> {
    const counts = new Map<string, number>();
    for (const f of failures) {
      // Группируем по агенту + первым словам ошибки: одинаковый сбой,
      // повторившийся у одного агента, важнее разрозненных единичных.
      const sig = `${f.agent}: ${(f.error ?? f.output_summary ?? "неизвестная ошибка").slice(0, 80)}`;
      counts.set(sig, (counts.get(sig) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([signature, count]) => ({ signature, count }))
      .sort((a, b) => b.count - a.count);
  }

  private buildDataBlock(
    history: HistoryRow[],
    openIssues: Array<{ key: string; value: string }>,
    repeats: Array<{ signature: string; count: number }>,
    versionCount: number,
    freshness: FreshnessFinding[],
    freshnessNote: string | null,
  ): string {
    const byIntent = new Map<string, number>();
    for (const h of history) byIntent.set(h.intent ?? "?", (byIntent.get(h.intent ?? "?") ?? 0) + 1);

    const lines = [
      `ВСЕГО ЗАДАЧ В ИСТОРИИ: ${history.length}`,
      `ИЗ НИХ УПАЛО: ${history.filter((h) => h.status === "failed").length}`,
      `ВЕРСИЙ АРТЕФАКТОВ СОХРАНЕНО: ${versionCount}`,
      "",
      "РАСПРЕДЕЛЕНИЕ ПО ТИПАМ ЗАДАЧ:",
      ...[...byIntent.entries()].map(([intent, n]) => `  ${intent}: ${n}`),
      "",
      "ПОВТОРЯЮЩИЕСЯ СБОИ (важнее единичных):",
      repeats.length > 0 ? repeats.map((r) => `  ×${r.count} — ${r.signature}`).join("\n") : "  нет",
      "",
      "ОТКРЫТЫЕ ИЗВЕСТНЫЕ ПРОБЛЕМЫ (из памяти проекта):",
      openIssues.length > 0 ? openIssues.map((i) => `  ${i.key}: ${i.value}`).join("\n") : "  нет",
      "",
      "ЗАВИСИМОСТИ:",
    ];

    if (freshnessNote) {
      lines.push(`  ${freshnessNote}`);
    } else if (freshness.length === 0) {
      lines.push("  все проверенные зависимости актуальны");
    } else {
      for (const f of freshness) {
        const marks = [
          f.drift !== "up-to-date" ? `отставание: ${f.drift}` : null,
          f.deprecated ? `DEPRECATED: ${f.deprecated.slice(0, 100)}` : null,
          f.stale ? `нет релизов ${Math.floor((f.daysSinceRelease ?? 0) / 365)}+ лет` : null,
        ].filter(Boolean);
        lines.push(`  ${f.package} ${f.current} → ${f.latest} (${marks.join("; ")})`);
      }
    }

    return lines.join("\n");
  }
}
