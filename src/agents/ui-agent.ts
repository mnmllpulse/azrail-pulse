import {readDesignContract,designInstruction,DEFAULT_DESIGN} from '../unified/design-contract';
import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import { agentPrompt } from "../lib/azrail-prompt";
import { log } from "../lib/resilience";
import { runModel, estimateComplexity, extractText } from "../lib/model-router";
import { taskTrace } from "../lib/observability-context";
import type { Env, UiAgentState, TaskRequest, TaskResult, GeneratedFile } from "../types";
import { ensureProject } from "../lib/project";
import { cleanupUnpublishedR2, deleteR2KeysBestEffort } from "../lib/r2-consistency";
import { recallContext, rememberFact, extractMemoryFacts, stripMemoryBlock } from "../lib/memory-agent";

// Чем UI Agent реально отличается от Code Agent (а не просто вывеской):
// Code Agent возвращает ТЕКСТ разбора. UI Agent возвращает ФАЙЛЫ —
// массив {path, content}, который напрямую скармливается Git Agent'у
// (commit_file) без ручного копипаста. Это и есть его смысл существования.

const UI_SYSTEM_PROMPT_ROLE = `Ты — UI Agent внутри AZRAIL. Роль: фронтенд-разработчик и дизайн-лид.
Стек по умолчанию: React + TypeScript + Tailwind. Next.js — если задача явно про роутинг/SSR.

ПРОЦЕСС (двухпроходный, не пропускай первый проход):
Проход 1 — дизайн-план. Прежде чем писать код, определи:
- палитру: 4-6 именованных hex-значений;
- типографику: минимум 2 роли (характерный display-шрифт, используемый сдержанно, + body-шрифт);
- концепцию лейаута одним-двумя предложениями;
- signature-элемент: одна вещь, по которой этот интерфейс запомнится.
Затем проверь план на шаблонность: если любая его часть — то, что ты выдал бы
для ЛЮБОГО похожего задания, а не выбор именно под эту задачу, переделай эту часть.
Калибровка: типовые AI-дефолты, которых стоит избегать без прямого запроса, —
кремовый фон с высококонтрастным serif и терракотовым акцентом; near-black фон
с одним кислотно-зелёным акцентом; broadsheet-лейаут с hairline-линейками.
Все три легитимны для некоторых задач, но это дефолты, а не решения.

Проход 2 — код, строго по утверждённому плану, каждый цвет и шрифт выводится из него.

КАЧЕСТВО (без объявлений об этом в интерфейсе):
адаптивность до мобильного, видимый keyboard focus, соблюдение prefers-reduced-motion.
Смелость тратится в одном месте — signature-элемент; всё вокруг тихое и дисциплинированное.

ТЕКСТЫ В ИНТЕРФЕЙСЕ — тоже дизайн-материал, не декорация:
активный залог, кнопка называется действием ("Сохранить изменения", не "Отправить"),
одно и то же действие называется одинаково на всём пути. Пустые состояния —
приглашение к действию, ошибки объясняют что случилось и как починить, не извиняются.

ФОРМАТ ОТВЕТА — обязательный.
Сначала кратко: дизайн-план и что в нём изменено после самопроверки на шаблонность.
Затем каждый файл строго между маркерами (путь — относительный, без ведущего слэша):

---FILE: src/components/Example.tsx---
<полный код файла>
---ENDFILE---

Файлов может быть несколько. Никаких "// ...остальной код" и заглушек —
каждый файл полный и рабочий. Ничего вне маркеров в файлы не попадёт.

Если данных для части решений не хватает — прямо скажи, чего именно, не выдумывай.

Если пришёл к решению, которое стоит запомнить про этот проект НА БУДУЩЕЕ
(выбор стека, конвенция именования, дизайн-направление) — добавь блок:
---MEMORY---
category: tech_choice | key: короткий-slug | value: суть решения
---END---`;

const UI_SYSTEM_PROMPT = agentPrompt(UI_SYSTEM_PROMPT_ROLE);


/** Разбирает ---FILE: path--- ... ---ENDFILE--- в массив файлов.
 *  Всё, что вне маркеров (рассуждения модели), в файлы не попадает. */
export function extractFiles(text: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const re = /---FILE:\s*(.+?)---\n([\s\S]*?)---ENDFILE---/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const path = m[1].trim().replace(/^\/+/, ""); // без ведущего слэша
    const content = m[2].replace(/^\n+|\n+$/g, "");
    if (!path || !content.trim()) continue;
    if (path.includes("..")) continue; // path traversal — не пускаем в коммит
    files.push({ path, content });
  }
  return files;
}

function stripFileBlocks(text: string): string {
  return text.replace(/---FILE:\s*.+?---\n[\s\S]*?---ENDFILE---/g, "").trim();
}

export class UiAgent extends Agent<Env, UiAgentState> {
  initialState: UiAgentState = { lastRunAt: null };

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
        agent: "ui-agent",
        summary: "Нужно описание интерфейса.",
        questions: [
          "Что за экран/компонент нужен, для кого он и какую одну задачу решает?",
          "Есть ли направление по стилю/бренду, или выбрать самому?",
        ],
      };
    }

    const memory = request.projectId ? await recallContext(this.env, request.projectId, 30, {missionId:request._missionId}) : null;

    const design=request.projectId?(await readDesignContract(this.env,request.projectId)).contract:DEFAULT_DESIGN;
    const messages = [
      { role: "system", content: UI_SYSTEM_PROMPT },
      { role: "system", content: designInstruction(design) },
      ...(request.architecturePlan
        ? [{ role: "system", content: `План архитектуры от Architect Agent — следуй ему:\n${request.architecturePlan}` }]
        : []),
      ...(memory ? [{ role: "system", content: `Уже известно про этот проект (Memory Agent):\n${memory}` }] : []),
      ...(request.designBrief
        ? [{ role: "system", content: `Дизайн-направление от пользователя — оно приоритетнее твоих предпочтений:\n${request.designBrief}` }]
        : []),
      { role: "user", content: request.payload.slice(0, 20_000) },
    ];

    let modelOutput: string;
    try {
      // Модель выбирает маршрутизатор по возможностям, а не жёстко заданный
      // слаг: см. lib/model-router.ts. При отказе перейдёт на следующую.
      // Сложность — по бесплатным сигналам, без вызова модели.
      const complexity = estimateComplexity({
        text: request.payload,
        hasArchitecturePlan: !!request.architecturePlan,
      });

      const routed = await runModel<{ response?: string }>(this.env, "generate_ui", { messages }, {
        complexity: complexity.level,
        preferredModel: request.preferredModel,
        trace: taskTrace(request),
        // Ответ без единого блока ---FILE:--- непригоден в принципе: UI Agent
        // тем и отличается от Code Agent, что возвращает файлы, а не прозу.
        // Проверка структурная и бесплатная — качество ею не оценивается,
        // оценивать качество могла бы только другая модель, а это уже плата
        // за то, что мы пытались сэкономить.
        validate: (out) =>
          extractFiles(extractText(out)).length > 0 ? true : "ни одного блока ---FILE:---",
      });
      const result = routed.output;
      modelOutput = extractText(result);
    } catch (err) {
      return {
        status: "failed",
        agent: "ui-agent",
        summary: "Модель недоступна.",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const files = extractFiles(modelOutput);

    let newFactsCount = 0;
    if (request.projectId) {
      const facts = extractMemoryFacts(modelOutput, "ui-agent");
      for (const fact of facts) {
        await rememberFact(this.env, request.projectId, fact);
      }
      newFactsCount = facts.length;
    }

    const notes = stripMemoryBlock(stripFileBlocks(modelOutput));

    if (files.length === 0) {
      // Модель не выдала ни одного файла в нужном формате — не выдаём это за
      // успех и не пытаемся угадать код из свободного текста.
      return {
        status: "failed",
        agent: "ui-agent",
        summary: "Модель не вернула ни одного файла в формате ---FILE:---.",
        data: { rawOutput: notes.slice(0, 2000) },
      };
    }

    if (request.projectId) {
      await this.saveArtifact(request.projectId, files, notes);
    }

    return {
      status: "done",
      agent: "ui-agent",
      summary: `Сгенерировано файлов: ${files.length} — ${files.map((f) => f.path).join(", ")}.`,
      data: { files, notes, usedMemory: memory !== null, newFactsRemembered: newFactsCount },
    };
  }

  /** Кладёт сгенерированные файлы в R2 и версионирует в D1 — тем же способом,
   *  что и Code Agent, чтобы история проекта была единообразной. */
  private async saveArtifact(projectId: string, files: GeneratedFile[], notes: string) {
    const prefix = `projects/${projectId}/ui/${Date.now()}-${crypto.randomUUID()}/`;
    const versionId=crypto.randomUUID(),written:string[]=[];
    let publishAttempted=false;
    try {
      for (const file of files) {
        const key=prefix+file.path;
        await this.env.AZRAIL_R2.put(key, file.content);written.push(key);
      }
      // FK на projects(id) — см. lib/project.ts
      await ensureProject(this.env, projectId);

      publishAttempted=true;
      await this.env.AZRAIL_D1.prepare(
        `INSERT INTO project_versions (id, project_id, version_number, r2_object_key, summary, created_by_agent)
         SELECT ?, ?, COALESCE(MAX(version_number), 0) + 1, ?, ?, 'ui-agent'
         FROM project_versions WHERE project_id = ?`,
      )
        .bind(versionId,projectId,prefix,notes.slice(0, 300),projectId)
        .run();
    } catch (err) {
      if(written.length){
        if(!publishAttempted){
          await deleteR2KeysBestEffort(this.env,written,"artifact.stage_cleanup",{projectId,versionId,prefix,agent:"ui-agent"});
          log("error", "artifact.save_failed", {projectId,error: err instanceof Error ? err.message : String(err)});
          return;
        }
        const cleanup=await cleanupUnpublishedR2(
          this.env,written,
          async()=>!!(await this.env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM project_versions WHERE id=? AND project_id=?").bind(versionId,projectId).first()),
          "artifact.save_cleanup",{projectId,versionId,prefix,agent:"ui-agent"},
        );
        if(cleanup.published===true){
          log("warn","artifact.save_response_lost",{projectId,versionId,prefix});
          return;
        }
      }
      log("error", "artifact.save_failed", {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
