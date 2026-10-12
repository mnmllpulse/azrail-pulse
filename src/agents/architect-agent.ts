import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import { agentPrompt } from "../lib/azrail-prompt";
import { runModel, extractText } from "../lib/model-router";
import { taskTrace } from "../lib/observability-context";
import type { Env, ArchitectAgentState, TaskRequest, TaskResult } from "../types";
import { recallContext, rememberFact, extractMemoryFacts, stripMemoryBlock } from "../lib/memory-agent";

const ARCHITECT_SYSTEM_PROMPT_ROLE = `Ты — Architect Agent внутри AZRAIL. Роль: Software/Solutions Architect.

Твоя задача — ДО того, как Code Agent начнёт писать или менять код, спроектировать архитектуру:
1. Выбрать стек — с обоснованием, учитывая саму задачу и то, что уже известно про проект.
2. Разбить систему на модули/компоненты — явно назвать, за что отвечает каждый.
3. Определить зависимости — между модулями, и внешние (библиотеки, сервисы).
4. Явно назвать риски и компромиссы выбранного подхода.

Никаких абстрактных рассуждений без итога — на выходе конкретный план, которым Code
Agent сможет руководствоваться напрямую, без домысливания.
Если данных для части решений не хватает — прямо скажи, чего именно, не выдумывай.

В конце ответа — диаграмма компонентов в синтаксисе Mermaid (graph TD или flowchart),
строго между маркерами:
---DIAGRAM---
graph TD
  A[...] --> B[...]
---END---
Если структуру нельзя осмысленно изобразить (недостаточно данных для схемы) — не
выдумывай диаграмму, пропусти блок целиком.

Как и Code Agent, если приходишь к архитектурному решению, которое стоит запомнить
про этот проект НА БУДУЩЕЕ — добавь блок (можно несколько строк, можно ни одной):
---MEMORY---
category: architecture_decision | key: короткий-slug | value: суть решения
---END---`;

const ARCHITECT_SYSTEM_PROMPT = agentPrompt(ARCHITECT_SYSTEM_PROMPT_ROLE);


function extractDiagram(text: string): string | null {
  const m = text.match(/---DIAGRAM---([\s\S]*?)---END---/);
  return m ? m[1].trim() : null;
}

function stripDiagramBlock(text: string): string {
  return text.replace(/---DIAGRAM---[\s\S]*?---END---/, "").trim();
}

export class ArchitectAgent extends Agent<Env, ArchitectAgentState> {
  initialState: ArchitectAgentState = { lastRunAt: null };

  // Метод называется run(), а не plan(), ради единого контракта RunnableAgent:
  // Orchestrator вызывает агента через реестр, не зная его класса.
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

    if (!request.payload?.trim()) {
      return {
        status: "needs_input",
        agent: "architect-agent",
        summary: "Нужно описание задачи или спецификации, чтобы спланировать архитектуру.",
        questions: ["Опиши, что нужно построить — цель, ограничения, известные требования."],
      };
    }

    const memory = request.projectId ? await recallContext(this.env, request.projectId, 30, {missionId:request._missionId}) : null;

    const messages = [
      { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
      ...(memory ? [{ role: "system", content: `То, что уже известно про этот проект (Memory Agent):\n${memory}` }] : []),
      { role: "user", content: request.payload.slice(0, 20_000) },
    ];

    let modelOutput: string;
    try {
      // Модель выбирает маршрутизатор по возможностям, а не жёстко заданный
      // слаг: см. lib/model-router.ts. При отказе перейдёт на следующую.
      const routed = await runModel<{ response?: string }>(this.env, "analyze_spec", { messages }, {
        preferredModel: request.preferredModel,
        trace: taskTrace(request),
      });
      const result = routed.output;
      modelOutput = extractText(result);
    } catch (err) {
      return {
        status: "failed",
        agent: "architect-agent",
        summary: "Модель недоступна.",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    let newFactsCount = 0;
    if (request.projectId) {
      const facts = extractMemoryFacts(modelOutput, "architect-agent");
      for (const fact of facts) {
        await rememberFact(this.env, request.projectId, fact);
      }
      newFactsCount = facts.length;
    }

    const diagram = extractDiagram(modelOutput);
    const cleanOutput = stripMemoryBlock(stripDiagramBlock(modelOutput));

    if (!cleanOutput.trim()) {
      return {
        status: "failed",
        agent: "architect-agent",
        summary: "Модель вернула пустой план.",
      };
    }

    return {
      status: "done",
      agent: "architect-agent",
      summary: cleanOutput.length > 400 ? cleanOutput.slice(0, 400) + "…" : cleanOutput,
      data: { output: cleanOutput, diagram, usedMemory: memory !== null, newFactsRemembered: newFactsCount },
    };
  }
}
