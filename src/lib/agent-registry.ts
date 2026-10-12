// AZRAIL — реестр агентов и система возможностей.
//
// Зачем: раньше Orchestrator знал каждого агента поимённо через цепочку
// if/else по intent. Добавление агента требовало правки маршрутизации.
// Теперь Orchestrator спрашивает: "кто умеет X?" — и реестр отвечает.
//
// ЧЕСТНО ПРО СТАТУС: в реестре НЕТ поля "online". Агенты здесь — это классы
// Durable Object'ов, которые поднимаются по требованию; они не "висят
// онлайн" и не шлют heartbeat. Писать status:"online" означало бы показывать
// в дашборде выдуманную зелёную лампочку. Поле называется `registered` и
// значит ровно то, что значит: агент объявлен и может быть запущен.

import { Agent } from "agents";
import type { Env, Intent, TaskRequest, TaskResult } from "../types";
import { CodeAgent } from "../agents/code-agent";
import { DeployAgent } from "../agents/deploy-agent";
import { ArchitectAgent } from "../agents/architect-agent";
import { GitAgent } from "../agents/git-agent";
import { UiAgent } from "../agents/ui-agent";
import { SecurityAgent } from "../agents/security-agent";
import { QaAgent } from "../agents/qa-agent";
import { EvolutionAgent } from "../agents/evolution-agent";
import { AnswerAgent } from "../agents/answer-agent";

export type Capability =
  | "reasoning"
  | "architecture"
  | "code_review"
  | "code_generation"
  | "ui_generation"
  | "git"
  | "deploy"
  | "security"
  | "qa"
  | "audit";

/** Общий контракт: любой агент в реестре умеет run(request) → TaskResult.
 *  Единый метод — условие того, чтобы Orchestrator мог вызывать агента,
 *  не зная его класса. */
export interface RunnableAgent {
  run(request: TaskRequest): Promise<TaskResult>;

  /**
   * Дешёвая проверка живости. Не трогает модели, сеть и хранилища —
   * доказывает ровно одно: Durable Object поднимается и отвечает по RPC.
   *
   * Почему это в обязательном контракте, а не отдельным хелпером: subAgent()
   * на момент написания ни разу не выполнялся в проде. Если он работает не
   * так, как ожидается, без ping все девять агентов падали бы одинаково
   * ("задача не выполнена"), и причину пришлось бы искать перебором.
   */
  ping(): Promise<AgentPing>;
}

export interface AgentPing {
  /**
   * Отвечает ли SQLite-хранилище самого Durable Object.
   *
   * Проверяется прямым запросом, а не обращением к `this.state`: геттер
   * состояния в SDK ходит в хранилище лишь при первом обращении, а дальше
   * отдаёт кеш (`if (this._state !== DEFAULT_STATE) return this._state`).
   * На "тёплом" экземпляре такая проверка всегда проходила бы, ничего не
   * проверяя, — а проверка, которая не может упасть, хуже её отсутствия:
   * она даёт ложную уверенность.
   *
   * Больше в ответе ничего нет намеренно: id и версия агента живут в
   * реестре. Первая версия дублировала их в агенте, и они сразу разъехались —
   * реестр говорил "architect" / "1.0", агент "architect-agent" / "1.0.0".
   */
  storageReadable: boolean;
}

/** Класс агента должен удовлетворять ДВУМ условиям сразу: наследовать Agent
 *  (иначе subAgent() его не примет) и реализовывать run(). Пересечение типов,
 *  а не каст — иначе ошибка в реестре всплыла бы только в рантайме. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgentClass = new (...args: any[]) => Agent<Env, any> & RunnableAgent;

export interface AgentEntry {
  id: string;
  name: string;
  version: string;
  capabilities: Capability[];
  /** Меньше = выше приоритет при равных возможностях */
  priority: number;
  /** Краткое описание для дашборда и Planner Agent'а */
  description: string;
  agentClass: AgentClass;
}

export const AGENT_REGISTRY: AgentEntry[] = [
  {
    id: "answer",
    name: "Answer",
    version: "1.0",
    capabilities: ["reasoning"],
    priority: 1,
    description: "Отвечает на вопросы: от простых до счётных. Числа считает вычислителем, не моделью.",
    agentClass: AnswerAgent,
  },
  {
    id: "architect",
    name: "Architect",
    version: "1.0",
    capabilities: ["architecture"],
    priority: 1,
    description: "Проектирует стек, модули, зависимости и риски до написания кода. Отдаёт Mermaid-диаграмму.",
    agentClass: ArchitectAgent,
  },
  {
    id: "code",
    name: "Code",
    version: "1.0",
    capabilities: ["code_review", "code_generation"],
    priority: 1,
    description: "Разбирает и генерирует код: качество, архитектура, безопасность, производительность.",
    agentClass: CodeAgent,
  },
  {
    id: "ui",
    name: "UI",
    version: "1.0",
    capabilities: ["ui_generation"],
    priority: 1,
    description: "Генерирует готовые файлы интерфейса (React/TS/Tailwind), а не текстовое описание.",
    agentClass: UiAgent,
  },
  {
    id: "git",
    name: "Git",
    version: "1.0",
    capabilities: ["git"],
    priority: 1,
    description: "Ветки, коммиты, PR, diff, список коммитов через GitHub REST API.",
    agentClass: GitAgent,
  },
  {
    id: "deploy",
    name: "Deploy",
    version: "1.0",
    capabilities: ["deploy"],
    priority: 1,
    description: "Проверяет готовность к деплою и триггерит существующий CI. Сборку выполняет CI, не Worker.",
    agentClass: DeployAgent,
  },
  {
    id: "security",
    name: "Security",
    version: "1.0",
    capabilities: ["security"],
    priority: 1,
    description: "CVE зависимостей по OSV.dev и детерминированный скан утёкших секретов.",
    agentClass: SecurityAgent,
  },
  {
    id: "qa",
    name: "QA",
    version: "1.0",
    capabilities: ["qa"],
    priority: 1,
    description: "Драйвит GitHub Actions и считает структурные пробелы в тестах. Тесты выполняет CI.",
    agentClass: QaAgent,
  },
  {
    id: "evolution",
    name: "Evolution",
    version: "1.0",
    capabilities: ["audit"],
    priority: 1,
    description: "Аудит по накопленной истории проекта: повторяющиеся сбои, старые зависимости, узкие места.",
    agentClass: EvolutionAgent,
  },
];

/** Какая возможность нужна под каждое намерение. Это единственное место,
 *  где intent связан с возможностью — маршрутизация в Orchestrator больше
 *  не знает имён агентов. */
const INTENT_CAPABILITY: Record<Exclude<Intent, "unclear">, Capability> = {
  answer: "reasoning",
  analyze_spec: "architecture",
  generate_code: "architecture", // сначала план, затем код — цепочка в Orchestrator
  review_repo: "code_review",
  generate_ui: "ui_generation",
  git_operation: "git",
  deploy: "deploy",
  security_scan: "security",
  qa_check: "qa",
  evolution_audit: "audit",
};

export function capabilityForIntent(intent: Intent): Capability | null {
  if (intent === "unclear") return null;
  return INTENT_CAPABILITY[intent] ?? null;
}

/** Кто умеет делать X. Сортировка по priority — при нескольких кандидатах
 *  берётся первый. */
export function findByCapability(capability: Capability): AgentEntry[] {
  return AGENT_REGISTRY.filter((a) => a.capabilities.includes(capability)).sort((a, b) => a.priority - b.priority);
}


/** Публичное описание реестра — для дашборда и будущего Planner Agent'а. */
export function describeRegistry() {
  return AGENT_REGISTRY.map((a) => ({
    id: a.id,
    name: a.name,
    version: a.version,
    capabilities: a.capabilities,
    priority: a.priority,
    description: a.description,
    // Не "online": агенты поднимаются по требованию и heartbeat не шлют.
    // Показывать здесь выдуманную зелёную лампочку было бы враньём.
    status: "registered" as const,
  }));
}

export function allCapabilities(): Capability[] {
  return [...new Set(AGENT_REGISTRY.flatMap((a) => a.capabilities))];
}
