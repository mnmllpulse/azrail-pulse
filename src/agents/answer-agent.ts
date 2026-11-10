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
      ? "АКТИВНЫЙ ГОЛОС: Серый. Пиши как собранный мужчина: 1–3 короткие фразы, без шуток, без восклицаний, без тепла и без пафоса. На «привет» ответь ровно: «Привет. Слушаю.»"
      : voice === "aria"
        ? "АКТИВНЫЙ ГОЛОС: Ария. Пиши как мягкая женщина: тепло, ясно, доброжелательно, без сюсюканья. На «привет» ответь: «Привет. Я рядом, говори.»"
        : "АКТИВНЫЙ ГОЛОС: Люмен. Пиши как живой доброжелательный мужчина: тепло, умно, с лёгкой радостью. На «привет» ответь: «Привет. Рад тебя слышать.»";
    const system = [
      voiceLine,
      "Ты — AZRAIL. Отвечаешь владельцу в живом чате на «ты», по-русски. Тон из активного голоса обязателен с первой фразы и не меняется внутри ответа.",
      "Один голос на весь ответ. Не представляйся заново в каждой реплике и не предлагай помощь в конце.",
      "Всегда отвечай на сообщение. Никогда не отказывайся из‑за «технических ограничений» или «не могу поддерживать диалог»: сбои платформы озвучивает сама платформа.",
      "Если чего-то не знаешь — скажи прямо. Выдумывать факты, тарифы и числа запрещено.",
      "В этом чате уже есть действия: картинка по фразе «нарисуй», страница по фразе «сделай сайт», правка прошлой картинки или страницы следующей фразой, раскадровка ролика, трек только если генератор вернул звук. На вопрос что умеешь перечисли это. Не говори, что умеешь только текст.",
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
      .map((m) => ({ role: m.role, content: m.content }));

    let text: string;
    let usedModel: string | undefined;
    let attempts = 1;
    try {
      const routed = await runModel<{ response?: string }>(
        this.env,
        "answer",
        {
          messages: [
            { role: "system", content: system.join("\n\n") },
            ...priorTurns,
            { role: "user", content: voice === "lumen" ? question : `${question}\n\nОтветь только голосом ${voice === "shade" ? "Серый" : "Ария"}. Тон прошлых ответов не копируй.` },
          ],
        },
        { preferredModel: request.preferredModel || (voice === "lumen" ? undefined : "@cf/meta/llama-3.3-70b-instruct-fp8-fast"), trace: taskTrace(request) },
      );
      attempts = routed.attempts;
      text = withFallbackNotice(extractText(routed.output).trim(), attempts, routed.model);
      usedModel = routed.model;
    } catch (err) {
      return {
        status: "failed",
        agent: "answer-agent",
        summary: "Модель недоступна.",
        error: err instanceof Error ? err.message : String(err),
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
