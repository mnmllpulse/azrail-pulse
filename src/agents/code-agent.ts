import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import { agentPrompt } from "../lib/azrail-prompt";
import { log } from "../lib/resilience";
import { runModel, extractText } from "../lib/model-router";
import { taskTrace } from "../lib/observability-context";
import type { Env, CodeAgentState, TaskRequest, TaskResult, GeneratedFile } from "../types";
import { ensureProject } from "../lib/project";
import { cleanupUnpublishedR2, deleteR2KeysBestEffort } from "../lib/r2-consistency";
import { recallContext, rememberFact, extractMemoryFacts, stripMemoryBlock } from "../lib/memory-agent";
import { readSource, joinForPrompt, MAX_CONTEXT_CHARS } from "../lib/source-reader";
import { extractFiles } from "./ui-agent";

const REVIEW_SYSTEM_PROMPT_ROLE = `Ты — Code Agent внутри AZRAIL (автономная система для production-разработки).
Роли, которые ты закрываешь в одиночку на MVP-этапе: Software Architect, Senior Full Stack Engineer, Security Engineer.

Обязательный процесс (без сокращений):
1. Диагностика: качество кода, архитектура, безопасность, производительность, масштабируемость.
2. Поиск проблем: ошибки, антипаттерны, дублирование, утечки памяти, небезопасный код.
3. Security checklist: SQL Injection, XSS, CSRF, SSRF, Command Injection, Path Traversal, Race Conditions, Memory Leak, Deadlock.
4. Best practices: SOLID, DRY, KISS, YAGNI.

Никаких демо, заглушек и учебного кода — только конкретные, применимые правки.
Если данных недостаточно для части выводов — прямо скажи, чего не хватает, не домысливай.
Ответь структурированно: краткий анализ, затем найденные проблемы (с указанием файла/строки, если видно), затем конкретные исправления или сгенерированный код.

Если в ходе анализа ты пришёл к чему-то, что стоит запомнить про этот проект НА БУДУЩЕЕ
(архитектурное решение, стиль кода, выбор технологии, повторяющаяся проблема,
предпочтение пользователя) — в самом конце ответа добавь блок в точности такого вида
(можно несколько строк, можно ни одной, если запоминать нечего):
---MEMORY---
category: architecture_decision | key: короткий-slug | value: сама суть факта одним-двумя предложениями
---END---
Категории: architecture_decision, code_style, tech_choice, known_issue, preference.
Не используй блок для того, что и так очевидно из кода — только для решений и фактов,
которые повлияют на будущие задачи по этому проекту.`;

const REVIEW_SYSTEM_PROMPT = agentPrompt(REVIEW_SYSTEM_PROMPT_ROLE);

// ГЕНЕРАЦИЯ, а не только ревью.
//
// До этой правки Code Agent при ЛЮБОМ intent вёл себя одинаково: читал
// контекст, возвращал прозу, сохранял её как .md-версию. UI Agent уже пишет
// файлы и коммитит их через Git Agent; Code Agent — нет, хотя имя обещает
// обратное. Это главный разрыв: назван в docs/product/ARCHITECTURE-v2.md, и независимо —
// в двух списках улучшений от 2026-08-26 (моём и присланном пользователем).
//
// Режим определяется по request.architecturePlan: Orchestrator выставляет
// это поле ТОЛЬКО для analyze_spec/generate_code (см. orchestrator.ts,
// комментарий "review_repo сюда не попадает") — сигнал структурно
// гарантирован веткой кода в другом файле, а не соглашением, которое можно
// забыть соблюсти. Контракт закреплён тестом, а не оставлен неявным.
const GENERATE_SYSTEM_PROMPT_ROLE = `Ты — Code Agent внутри AZRAIL, сейчас в режиме ГЕНЕРАЦИИ, а не ревью.
Тебе дан план архитектуры или описание задачи — твоя работа написать реальный рабочий код, а не обсудить его.

Правила:
1. Пиши ПОЛНЫЕ файлы, не диффы построчно — Git Agent коммитит файл целиком, частичный патч не применить.
2. Никаких демо, заглушек, TODO вместо реализации и учебного кода — только то, что реально работает.
3. Меняешь существующий файл — выведи его полное новое содержимое, не только изменённый кусок.
4. Следуй уже принятым в проекте соглашениям (стиль, обработка ошибок), если они видны во входном контексте.
5. Не хватает данных для важного места — не выдумывай: скажи об этом в пояснении вне файловых блоков, не угадывай в коде.

Формат вывода обязателен, файл за файлом:
---FILE: путь/к/файлу.ts---
(полное содержимое файла)
---ENDFILE---

Можно несколько блоков подряд. Вне блоков — только краткое пояснение, не код.

Если пришёл к факту, который стоит запомнить про этот проект НА БУДУЩЕЕ — в самом конце,
ПОСЛЕ всех ---FILE--- блоков, добавь (можно ни одной строки, если запоминать нечего):
---MEMORY---
category: architecture_decision | key: короткий-slug | value: суть одним-двумя предложениями
---END---
Категории: architecture_decision, code_style, tech_choice, known_issue, preference.`;

const GENERATE_SYSTEM_PROMPT = agentPrompt(GENERATE_SYSTEM_PROMPT_ROLE);


export class CodeAgent extends Agent<Env, CodeAgentState> {
  initialState: CodeAgentState = { lastRunAt: null };

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

    let context: string;
    try {
      context = joinForPrompt(await readSource(this.env, request));
    } catch (err) {
      return {
        status: "failed",
        agent: "code-agent",
        summary: "Не удалось прочитать входные данные.",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (!context.trim()) {
      return {
        status: "needs_input",
        agent: "code-agent",
        summary: "После разбора входа не осталось читаемого содержимого.",
        questions: ["Проверь, что файл/репозиторий не пустой и содержит текстовые файлы поддерживаемых типов."],
      };
    }

    const isGenerate = typeof request.architecturePlan === "string";

    const knowledge = await this.retrieveKnowledge(context.slice(0, 500), request);
    const memory = request.projectId ? await recallContext(this.env, request.projectId, 30, {missionId:request._missionId}) : null;

    const messages = [
      { role: "system", content: isGenerate ? GENERATE_SYSTEM_PROMPT : REVIEW_SYSTEM_PROMPT },
      ...(request.architecturePlan
        ? [{ role: "system", content: `План архитектуры от Architect Agent — следуй ему, если он не противоречит найденным фактам:\n${request.architecturePlan}` }]
        : []),
      ...(memory ? [{ role: "system", content: `То, что уже известно про этот проект (Memory Agent):\n${memory}` }] : []),
      ...(knowledge
        ? [{ role: "system", content: `Релевантный контекст из базы знаний (Vectorize):\n${knowledge}` }]
        : []),
      { role: "user", content: context.slice(0, MAX_CONTEXT_CHARS) },
    ];

    let modelOutput: string;
    try {
      // Модель выбирает маршрутизатор по возможностям, а не жёстко заданный
      // слаг: см. lib/model-router.ts. При отказе перейдёт на следующую.
      // generate_code — отдельная запись в ROUTING_POLICY, не review_repo:
      // генерация и ревью — разные требования к модели, разная цена ошибки.
      const routed = await runModel<{ response?: string }>(this.env, isGenerate ? "generate_code" : "review_repo", { messages }, {
        preferredModel: request.preferredModel,
        trace: taskTrace(request),
      });
      const result = routed.output;
      modelOutput = extractText(result);
    } catch (err) {
      return {
        status: "failed",
        agent: "code-agent",
        summary: "Модель недоступна.",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    let newFactsCount = 0;
    if (request.projectId) {
      const facts = extractMemoryFacts(modelOutput, "code-agent");
      for (const fact of facts) {
        await rememberFact(this.env, request.projectId, fact);
      }
      newFactsCount = facts.length;
    }

    if (isGenerate) {
      // Тот же парсер, что и у UI Agent, а не свой: он уже проверен на
      // ведущий слэш, пустое содержимое, маркеры внутри строковых литералов
      // и path traversal — переизобретать заново значит терять эту защиту.
      const files = extractFiles(modelOutput);

      if (files.length === 0) {
        return {
          status: "needs_input",
          agent: "code-agent",
          summary: "Модель не вернула ни одного файла в формате ---FILE:---.",
          questions: ["Уточни задачу — либо не хватило конкретики для генерации кода, либо это скорее вопрос на ревью, а не на генерацию."],
        };
      }

      if (request.projectId) {
        await this.saveGeneratedVersion(request.projectId, files);
      }

      return {
        status: "done",
        agent: "code-agent",
        summary: `Сгенерировано файлов: ${files.length}.`,
        data: { files, usedKnowledgeBase: knowledge !== null, usedMemory: memory !== null, newFactsRemembered: newFactsCount },
      };
    }

    const cleanOutput = stripMemoryBlock(modelOutput);

    if (request.projectId) {
      await this.saveVersion(request.projectId, cleanOutput);
    }

    return {
      status: "done",
      agent: "code-agent",
      summary: cleanOutput.length > 400 ? cleanOutput.slice(0, 400) + "…" : cleanOutput,
      data: { output: cleanOutput, usedKnowledgeBase: knowledge !== null, usedMemory: memory !== null, newFactsRemembered: newFactsCount },
    };
  }

  /** Retrieval из Vectorize. Если индекс ещё не подключен — тихо возвращает null (не роняет задачу). */
  private async retrieveKnowledge(query: string, request: TaskRequest): Promise<string | null> {
    if (!this.env.AZRAIL_VECTORIZE) return null;
    try {
      // Через маршрутизатор, как и всё остальное: слаг живёт только в
      // реестре. Захардкоженный здесь пришлось бы искать отдельно, когда
      // модель снимут с поддержки, — а именно так уже сломался классификатор.
      const embRouted = await runModel(this.env, "embeddings", { text: [query] }, { trace: taskTrace(request) });
      const embedding = embRouted.output as {
        data: number[][];
      };
      const matches = await this.env.AZRAIL_VECTORIZE.query(embedding.data[0], { topK: 3, returnMetadata: true });
      return matches.matches.map((m) => JSON.stringify(m.metadata)).join("\n") || null;
    } catch {
      return null;
    }
  }

  private async saveVersion(projectId: string, output: string) {
    const key = `projects/${projectId}/versions/${Date.now()}-${crypto.randomUUID()}.md`;
    const versionId=crypto.randomUUID();
    let wrote=false,publishAttempted=false;
    try {
      await this.env.AZRAIL_R2.put(key, output);wrote=true;
      // FK на projects(id) — см. lib/project.ts
      await ensureProject(this.env, projectId);

      publishAttempted=true;
      await this.env.AZRAIL_D1.prepare(
        `INSERT INTO project_versions (id, project_id, version_number, r2_object_key, summary, created_by_agent)
         SELECT ?, ?, COALESCE(MAX(version_number), 0) + 1, ?, ?, 'code-agent'
         FROM project_versions WHERE project_id = ?`,
      )
        .bind(versionId, projectId, key, output.slice(0, 300), projectId)
        .run();
    } catch (err) {
      if(wrote){
        if(!publishAttempted){
          await deleteR2KeysBestEffort(this.env,[key],"version.stage_cleanup",{projectId,versionId,key,agent:"code-agent"});
          log("error", "version.save_failed", {projectId,error: err instanceof Error ? err.message : String(err)});
          return;
        }
        const cleanup=await cleanupUnpublishedR2(
          this.env,[key],
          async()=>!!(await this.env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM project_versions WHERE id=? AND project_id=?").bind(versionId,projectId).first()),
          "version.save_cleanup",{projectId,versionId,key,agent:"code-agent"},
        );
        if(cleanup.published===true){
          log("warn","version.save_response_lost",{projectId,versionId,key,agent:"code-agent"});
          return;
        }
      }
      log("error", "version.save_failed", {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Версия для generate-режима: НЕСКОЛЬКО файлов под общим префиксом —
   * тот же контракт, что у ui-agent.ts:saveArtifact (r2_object_key оканчивается
   * на "/", а не указывает на один объект). lib/versions.ts уже умеет читать
   * оба формата — эта функция специально не заводит третий.
   */
  private async saveGeneratedVersion(projectId: string, files: GeneratedFile[]) {
    const prefix = `projects/${projectId}/code/${Date.now()}-${crypto.randomUUID()}/`;
    const versionId=crypto.randomUUID(),written:string[]=[];
    let publishAttempted=false;
    try {
      for (const file of files) {
        const key=prefix + file.path;
        await this.env.AZRAIL_R2.put(key, file.content);written.push(key);
      }
      await ensureProject(this.env, projectId);
      publishAttempted=true;
      await this.env.AZRAIL_D1.prepare(
        `INSERT INTO project_versions (id, project_id, version_number, r2_object_key, summary, created_by_agent)
         SELECT ?, ?, COALESCE(MAX(version_number), 0) + 1, ?, ?, 'code-agent'
         FROM project_versions WHERE project_id = ?`,
      )
        .bind(versionId, projectId, prefix, `Сгенерировано файлов: ${files.length}`, projectId)
        .run();
    } catch (err) {
      if(written.length){
        if(!publishAttempted){
          await deleteR2KeysBestEffort(this.env,written,"version.stage_cleanup",{projectId,versionId,prefix,agent:"code-agent"});
          log("error", "version.save_failed", {projectId,error: err instanceof Error ? err.message : String(err)});
          return;
        }
        const cleanup=await cleanupUnpublishedR2(
          this.env,written,
          async()=>!!(await this.env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM project_versions WHERE id=? AND project_id=?").bind(versionId,projectId).first()),
          "version.save_cleanup",{projectId,versionId,prefix,agent:"code-agent"},
        );
        if(cleanup.published===true){
          log("warn","version.save_response_lost",{projectId,versionId,prefix,agent:"code-agent"});
          return;
        }
      }
      log("error", "version.save_failed", {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
