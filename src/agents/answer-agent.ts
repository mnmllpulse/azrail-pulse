import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import type { Env, AnswerAgentState, TaskRequest, TaskResult } from "../types";
import { runModel, extractText } from "../lib/model-router";
import { taskTrace, type TraceContext } from "../lib/observability-context";
import { recallContext } from "../lib/memory-agent";
import { calculateAll, CALC_VOCABULARY, type CalcStep } from "../lib/calc";

/**
 * ANSWER AGENT — отвечает на вопросы.
 *
 * ЗАЧЕМ. До него у AZRAIL не было namerения «ответить»: все десять вели к
 * действию над кодом (сгенерировать, задеплоить, просканировать). Вопрос
 * «как это работает» или «сколько получится» падал в unclear. Чат отвечал
 * голой моделью — без памяти, без счёта, без доступа к системе.
 *
 * СТУПЕНИ. Вопросы неодинаковы по цене, и гонять тяжёлый путь ради «что
 * такое D1» — это трата секунд и денег на пустом месте. Поэтому:
 *
 *   0. прямой   — знание модели, один вызов. Определения, объяснения.
 *   1. память   — прошлые решения по проекту подмешиваются в контекст,
 *                 когда спрашивают про «мою систему», «мы решили», «почему так».
 *   2. счёт     — числа считает ВЫЧИСЛИТЕЛЬ, не модель. Модель только
 *                 выписывает выражение и объясняет полученное.
 *
 * ГЛАВНОЕ ПРАВИЛО, РАДИ КОТОРОГО ВСЁ ЗАТЕВАЛОСЬ. Модель не считает — она
 * предсказывает правдоподобный текст. «4871 * 3392» она выдаст числом
 * нужного порядка и уверенным тоном, и оно будет неверным. Поэтому
 * арифметика уходит в lib/calc.ts, а модель получает уже готовые значения
 * и не имеет права их пересчитывать. Это единственный способ называть
 * происходящее вычислением, а не имитацией.
 */

/** Признаки того, что в вопросе есть что считать. */
const MATH_HINT =
  /\d\s*[+\-*/^%]\s*\d|\b(посчитай|вычисли|сколько будет|скольким|рассчитай|calculate|compute)\b|\b(sqrt|корень|процент|среднее|медиан|отклонен)/i;

/** Признаки того, что спрашивают про эту систему, а не про мир вообще. */
const SELF_HINT =
  /\b(мо[йея]|наш|мы|у меня|этот проект|система|азраил|azrail|почему так|мы решили|решено)\b/i;

export type AnswerTier = "direct" | "memory" | "compute";

export interface AnswerData {
  tier: AnswerTier;
  /** Что реально посчитано — с выражениями, чтобы результат можно было перепроверить. */
  calculations?: CalcStep[];
  usedMemory: boolean;
  model?: string;
  attempts?: number;
}

/** Запасная модель той же задачи. Первая попытка остаётся без приписки. */
export function withFallbackNotice(text: string, attempts: number, model?: string): string {
  if (attempts <= 1 || !text) return text;
  const leaf = model?.split("/").pop()?.replace(/[-_]+/g, " ").trim();
  return `${text}\n\nПервая модель не ответила. Ответ дала ${leaf || "запасная модель"}.`;
}

/** Серый закреплён за Llama 3.3 70B. Провайдер отказал на 24 000 токенах. */
const SHADE_WINDOW = 24_000;
const PROMPT_CAP = 72_000;

export function promptBudget(text: string, earlier = ""): { text: string; tokens: number; long: boolean } {
  let body = text;
  let trimmed = false;
  if (body.length > PROMPT_CAP) {
    body = `${body.slice(0, 48_000)}\n\n[Середина вложения пропущена: файл длиннее окна модели.]\n\n${body.slice(-16_000)}`;
    trimmed = true;
  }
  const tokens = Math.ceil((earlier.length + body.length) / 3) + 4_096;
  return { text: body, tokens, long: trimmed || tokens > SHADE_WINDOW };
}

/** В истории остаётся реплика и уже сделанный разбор. Полный архив второй раз в модель не кладётся. */
export function rememberTurn(role: string, content: string): string {
  const marks = role === "user"
    ? [...content.matchAll(/\[АРХИВ r2=\S+ name=[^\]]+\]/g)].map((item) => item[0]).join("\n")
    : "";
  const marker = "\n\nПРИЛОЖЕННЫЕ ФАЙЛЫ";
  const at = content.indexOf(marker);
  let kept: string;
  if (role === "user" && at >= 0 && content.length > 1_500) {
    const words = content.slice(0, at).trim().slice(0, 1_500);
    kept = `${words}\n\n[К этой реплике был приложен файл. Его разбор уже в ответе, архив повторно не вкладывается.]`;
  } else if (content.length <= 8_000) {
    kept = content;
  } else {
    kept = `${content.slice(0, 5_000)}\n\n[Середина реплики пропущена.]\n\n${content.slice(-2_000)}`;
  }
  if (!marks || kept.includes(marks)) return kept;
  return `${kept}\n${marks}`;
}

/** Оставляет хвост истории, который вместе с вопросом влезает в окно. */
export function fitTurns(
  turns: Array<{ role: string; content: string }>,
  question: string,
  limit = 12_000,
): Array<{ role: string; content: string }> {
  let room = limit - 3_700 - Math.ceil(question.length / 3);
  if (room < 400) room = 400;
  const kept: Array<{ role: string; content: string }> = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    if (room < 80) break;
    let content = turns[i].content;
    if (Math.ceil(content.length / 3) > room) {
      content = `${content.slice(0, Math.max(0, room * 3 - 40))}\n[Реплика обрезана.]`;
    }
    kept.unshift({ role: turns[i].role, content });
    room -= Math.ceil(content.length / 3);
  }
  return kept;
}

export function contextMiss(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /context length|context window|input_tokens|maximum context|exceeded this model/i.test(raw);
}

export class AnswerAgent extends Agent<Env, AnswerAgentState> {
  initialState: AnswerAgentState = { lastAnsweredAt: null, answerCount: 0 };

  /** См. RunnableAgent.ping. */
  async ping() {
    let storageReadable = false;
    try {
      this.sql`SELECT 1`;
      storageReadable = true;
    } catch {
      storageReadable = false;
    }
    return { agent: "answer-agent", storageReadable };
  }

  /** Выбор ступени. Дешёвое — дёшево, дорогое — только когда нужно. */
  static chooseTier(question: string): AnswerTier {
    if (MATH_HINT.test(question)) return "compute";
    if (SELF_HINT.test(question)) return "memory";
    return "direct";
  }

  async run(request: TaskRequest): Promise<TaskResult> {
    return withBillingScope(request._billingScope ?? projectBillingScope(request.projectId), () => this.runScoped(request));
  }

  private async runScoped(request: TaskRequest): Promise<TaskResult> {
    const question = (request.payload ?? "").toString().trim();

    if (!question) {
      return {
        status: "needs_input",
        agent: "answer-agent",
        summary: "Вопрос пустой.",
        questions: ["О чём вопрос?"],
      };
    }

    const tier = AnswerAgent.chooseTier(question);

    // ── Ступень 1: память проекта ────────────────────────────────────────
    let memory: string | null = null;
    if (tier === "memory" && request.projectId) {
      try {
        memory = await recallContext(this.env, request.projectId, 20, {missionId:request._missionId});
      } catch {
        // Недоступная память — не повод не ответить. Ответ будет без
        // прошлого контекста, и это лучше, чем отказ.
        memory = null;
      }
    }

    // ── Ступень 2: настоящий счёт ────────────────────────────────────────
    // Модель выписывает выражения; считает вычислитель. Порядок именно
    // такой: сначала числа, потом текст вокруг них.
    let calculations: CalcStep[] | undefined;
    if (tier === "compute") {
      calculations = await this.computeFor(question, request.preferredModel, taskTrace(request));
    }

    const voice = request.voice === "shade" || request.voice === "aria" ? request.voice : "lumen";
    const voiceLine = voice === "shade"
      ? "АКТИВНЫЙ ГОЛОС: Серый. Пиши как собранный мужчина, без шуток, без восклицаний, без тепла и без пафоса. На «привет» и только на него ответь ровно: «Привет. Слушаю.» Разбор, код и ответ по делу с приветствия не начинай. Код, разбор, таблицу и документ отдавай целиком."
      : voice === "aria"
        ? "АКТИВНЫЙ ГОЛОС: Ария. Пиши как мягкая женщина: тепло, ясно, доброжелательно, без сюсюканья. На «привет» ответь: «Привет. Я рядом, говори.»"
        : "АКТИВНЫЙ ГОЛОС: Люмен. Пиши как живой доброжелательный мужчина: тепло, умно, с лёгкой радостью. На «привет» ответь: «Привет. Рад тебя слышать.»";
    const system = [
      voiceLine,
      "Ты — AZRAIL. Отвечаешь владельцу в живом чате на «ты», по-русски. Тон из активного голоса обязателен с первой фразы и не меняется внутри ответа.",
      "Один голос на весь ответ. Не представляйся заново в каждой реплике и не предлагай помощь в конце.",
      "Всегда отвечай на сообщение. Никогда не отказывайся из‑за «технических ограничений» или «не могу поддерживать диалог»: сбои платформы озвучивает сама платформа.",
      "Если чего-то не знаешь — скажи прямо. Выдумывать факты, тарифы и числа запрещено.",
      "Ты персональный архитектор, разработчик, аналитик, дизайнер и агент владельца. В одном чате делаешь саму работу: код на JS, TS, Python, SQL, HTML, CSS и Cloudflare Workers; рефакторинг и разбор ошибок; декомпозицию и сравнение вариантов; расчёты по CSV и JSON; технические и художественные тексты; редактуру и перевод; схему или HTML-страницу.",
      "Прикреплённые ZIP, текст, DOCX, XLSX, PPTX, PDF и описание картинки уже лежат в сообщении, если они прочитаны. Опирайся на них. Если во входе есть строка «Прочитано N из M», первая строка ответа повторяет её и не называет архив прочитанным целиком. Запрещено отвечать «не умею писать код» и «не умею читать zip».",
      "Если во входе есть блок ИСТОЧНИКИ или РЕПОЗИТОРИЙ, опирайся только на него и не добавляй ссылок от себя. Блок СОСТОЯНИЕ СВЯЗЕЙ пересказывай как есть.",
      "Не выдумывай выполненное действие. Push в GitHub, деплой Cloudflare, Figma, Canva, Gmail и Google Drive этот ответ не выполняет. Нет расписаний, нет браузера, нет доступа к компьютеру владельца. Картинка — «нарисуй». Страница — «сделай сайт». Файл — «сделай pdf», «docx», «xlsx» или «pptx». Схема — «схема» или «диаграмма». Ролик — раскадровка. Трек обещай только если во входе уже есть звук.",
    ];

    if (memory) {
      system.push(
        "РАНЕЕ ПРИНЯТЫЕ РЕШЕНИЯ ПО ЭТОМУ ПРОЕКТУ (опирайся на них, не противоречь):\n" + memory,
      );
    }

    if (calculations && calculations.length) {
      const done = calculations
        .map((c) => (c.value === null ? `${c.expression} → ОШИБКА: ${c.error}` : `${c.expression} = ${c.value}`))
        .join("\n");
      system.push(
        "ВЫЧИСЛЕНО ТОЧНО (посчитано вычислителем, не тобой):\n" +
          done +
          "\n\nИспользуй ЭТИ значения. Не пересчитывай их в уме и не округляй молча — " +
          "твой пересчёт будет менее точным. Если выражение дало ошибку, скажи об этом прямо.",
      );
    }

    // Предыдущие реплики — иначе «а почему?» следом за ответом теряет предмет.
    const priorTurns = (request.conversationHistory ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role, content: rememberTurn(m.role, m.content) }));

    const budget = promptBudget(question, priorTurns.map((turn) => turn.content).join("\n"));
    const history = budget.long ? fitTurns(priorTurns, budget.text) : priorTurns;
    const voiceNote = voice === "lumen" ? "" : `\n\nОтветь только голосом ${voice === "shade" ? "Серый" : "Ария"}. Тон прошлых ответов не копируй.`;
    const shadePin = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const preferred = request.preferredModel || (voice === "lumen" || budget.long ? undefined : shadePin);
    const ask = (turns: Array<{ role: string; content: string }>, preferredModel: string | undefined, maxTokens?: number) => runModel<{ response?: string }>(
      this.env,
      "answer",
      {
        messages: [
          { role: "system", content: system.join("\n\n") },
          ...turns,
          { role: "user", content: `${budget.text}${voiceNote}` },
        ],
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      },
      { preferredModel, estimatedTokens: budget.tokens, trace: taskTrace(request) },
    );

    let text: string;
    let usedModel: string | undefined;
    let attempts = 1;
    try {
      let routed: Awaited<ReturnType<typeof ask>>;
      try {
        routed = await ask(history, preferred);
      } catch (err) {
        if (request.preferredModel || !contextMiss(err)) throw err;
        routed = await ask(fitTurns(priorTurns, budget.text, 8_000), undefined, 800);
      }
      attempts = routed.attempts;
      text = withFallbackNotice(extractText(routed.output).trim(), attempts, routed.model);
      usedModel = routed.model;
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        agent: "answer-agent",
        summary: contextMiss(err)
          ? "Файл длиннее окна модели. Серый держит 24 тысячи токенов, архив с запасом ответа за них вышел."
          : "Модель недоступна.",
        error: raw,
      };
    }

    if (!text) {
      return {
        status: "failed",
        agent: "answer-agent",
        summary: "Модель вернула пустой ответ.",
        error: "empty_model_output",
      };
    }

    this.setState({
      lastAnsweredAt: new Date().toISOString(),
      answerCount: this.state.answerCount + 1,
    });

    const data: AnswerData = {
      tier,
      calculations,
      usedMemory: Boolean(memory),
      model: usedModel,
      attempts,
    };

    return { status: "done", agent: "answer-agent", summary: text, data };
  }

  /**
   * Достаёт из вопроса выражения и считает их.
   *
   * Модель здесь работает переводчиком с русского на арифметику, а не
   * счётчиком: её просят вернуть только выражения. Всё, что она вернёт,
   * проходит через вычислитель — если она попытается вписать готовый
   * ответ вместо выражения, это либо посчитается заново, либо отвалится
   * с ошибкой разбора. Соврать в обход вычислителя нельзя.
   */
  private async computeFor(question: string, preferredModel?: string, trace?: TraceContext): Promise<CalcStep[]> {
    let raw = "";
    try {
      const routed = await runModel<{ response?: string }>(
        this.env,
        "answer",
        {
          messages: [
            {
              role: "system",
              content:
                "Извлеки из вопроса пользователя арифметические выражения, которые нужно вычислить.\n" +
                "Верни ТОЛЬКО выражения, по одному в строке, без пояснений, без markdown, без знака '='.\n" +
                "Доступны: числа, + - * / % ^, скобки и функции: " +
                CALC_VOCABULARY +
                ".\nПеременных нет — подставляй числа из вопроса.\n" +
                "Если считать нечего, верни пустую строку.",
            },
            { role: "user", content: question },
          ],
        },
        { preferredModel, complexity: "trivial", trace },
      );
      raw = extractText(routed.output);
    } catch {
      // Не смогли извлечь — ответим без вычислений. Ступень мягко
      // опускается до обычной, вместо того чтобы уронить весь ответ.
      return [];
    }

    const lines = raw
      .split("\n")
      .map((l) => l.replace(/^[-*\d.)\s]+/, "").replace(/`/g, "").trim())
      .filter((l) => l.length > 0 && /\d/.test(l))
      .slice(0, 10);

    if (lines.length === 0) return [];
    return calculateAll(lines);
  }
}
