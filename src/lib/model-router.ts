import { currentBillingScope } from "./billing-context";
import { ProviderOutcomeUncertainError } from "./billing";
import { eligibleRegistry, policyModelCall, ModelPolicyError } from "./model-policy";
import { isNeuronPaidModel, NEURON_PAID_BLOCK } from "./neuron-paid";
// AZRAIL — выбор модели под задачу.
//
// Что этот модуль делает и, что важнее, чего НЕ делает.
//
// НЕ делает: не считает рейтинг вида "97 против 95". Таких чисел не
// существует — их нельзя измерить, а решение, опирающееся на выдуманную
// цифру, невозможно отладить: когда маршрутизатор выберет не то, причину
// будет не восстановить.
//
// Каждый вызов, включая retry, передаётся billing.ts для учёта стоимости.
// AI Gateway остаётся источником независимой сверки с провайдером.
//
// Делает ровно одно, зато то, чего Gateway не умеет: выбирает, КАКУЮ
// модель звать под конкретную задачу, — и объясняет, почему именно её.

import { extractUsage, type ModelUsage, type UsageLedger } from "./usage";
import {
  MODEL_REGISTRY,
  findModel,
  policyFor,
  tiersFor,
  type Complexity,
  type ModelCapability,
  type ModelEntry,
  type RoutePolicy,
} from "./model-registry";
import { clearExhausted, cooldownRemaining, isQuotaError, markExhausted } from "./model-health";
import { log, withRetry, TimeoutError } from "./resilience";
import type { Env } from "../types";
import type { TraceContext } from "./observability-context";
import { recordMissionDecision } from "./mission-decision-log";

export class ModelOutcomeUncertainError extends Error {
  constructor(model: string) {
    super(`Вызов модели ${model} превысил timeout. Исход уже отправленного provider-запроса неопределён; автоматический retry/fallback остановлен.`);
    this.name = "ModelOutcomeUncertainError";
  }
}

/**
 * Оценивает сложность по БЕСПЛАТНЫМ сигналам — без вызова модели.
 *
 * Звать модель, чтобы понять, какую модель звать, чаще всего сводит
 * экономию в ноль: платишь лишний вызов ради выбора вызова.
 *
 * Сигналы намеренно грубые и объявлены таковыми: объём входа, число
 * файлов, наличие готового плана архитектуры. Ни один из них не измеряет
 * трудность по существу — они лишь надёжно опознают ЯВНО МЕЛКОЕ. Поэтому
 * результат используется только для разрешения дешёвого старта и никогда
 * для запрета сильной модели.
 */
export function estimateComplexity(input: {
  text?: string;
  fileCount?: number;
  hasArchitecturePlan?: boolean;
}): { level: Complexity; signals: string[] } {
  const chars = input.text?.length ?? 0;
  const files = input.fileCount ?? 0;
  const signals: string[] = [`объём входа ${chars} символов`, `файлов: ${files}`];

  // Готовый план архитектуры означает, что задача уже признана крупной
  // на предыдущем шаге — этот сигнал сильнее любых размеров.
  if (input.hasArchitecturePlan) {
    signals.push("приложен план архитектуры — задача заведомо не мелкая");
    return { level: "heavy", signals };
  }

  if (files > 10 || chars > 12_000) {
    signals.push("много материала — тяжёлая");
    return { level: "heavy", signals };
  }
  if (files === 0 && chars < 400) {
    signals.push("короткий запрос без файлов — мелкая");
    return { level: "trivial", signals };
  }
  signals.push("обычная");
  return { level: "normal", signals };
}

export interface RouteRequirements {
  /** Дополнительные возможности сверх политики (например, "vision" для картинки) */
  needs?: ModelCapability[];
  /** Оценка нужного окна контекста в токенах */
  estimatedTokens?: number;
  /** Сложность задачи. Влияет только на разрешение дешёвого старта. */
  complexity?: Complexity;
  /** Модели, недоступные прямо сейчас (исчерпан лимит) */
  unavailable?: string[];
  /**
   * Доступен ли AI Gateway. Без него сторонние модели вызвать нельзя.
   *
   * Передаётся явно, чтобы `route` оставался чистой функцией и его можно
   * было вызвать для ПОКАЗА маршрута, не трогая окружение, — и чтобы этот
   * показ не расходился с тем, что произойдёт на самом деле.
   */
  gatewayAvailable?: boolean;
}

export interface RouteDecision {
  /** Кандидаты в порядке попыток: первый — основной, дальше запасные */
  candidates: ModelEntry[];
  /** Человекочитаемое объяснение, попадает в лог и в ответ */
  reasoning: string[];
}

/**
 * Отбирает и упорядочивает модели под задачу.
 *
 * Каждый шаг — проверяемый факт из реестра, а не оценка. Отбракованные
 * модели попадают в объяснение вместе с причиной: если выбор окажется
 * неверным, видно, на каком именно шаге он свернул не туда.
 */
export function route(
  intent: string,
  req: RouteRequirements = {},
  // Реестр передаётся параметром, чтобы поведение роутера можно было
  // проверить на модели с заданными свойствами, а не надеяться, что такая
  // модель случайно окажется в боевом реестре. Свойство "непроверенное окно
  // не отсеивает модель" должно оставаться проверяемым и тогда, когда окна
  // проверены у всех записей.
  registry: ModelEntry[] = MODEL_REGISTRY,
): RouteDecision {
  const policy: RoutePolicy = policyFor(intent);
  const required = [...policy.requires, ...(req.needs ?? [])];
  const complexity = req.complexity ?? "normal";
  const tiers = tiersFor(policy, complexity);
  const unavailable = new Set(req.unavailable ?? []);

  const reasoning: string[] = [`Задача "${intent}" требует: ${required.join(", ") || "ничего особенного"}.`];
  if (complexity === "trivial" && policy.allowDowngradeOnTrivial) {
    reasoning.push("Задача опознана как мелкая — начинаем с дешёвой модели, при провале поднимемся выше.");
  }

  const passed: ModelEntry[] = [];
  for (const model of registry) {
    if (unavailable.has(model.slug)) {
      reasoning.push(`${model.slug} — пропущена: исчерпан лимит, ждём восстановления.`);
      continue;
    }
    // Сторонняя модель без шлюза недоступна физически — отсеиваем здесь,
    // чтобы показ маршрута совпадал с реальным поведением. Раньше это
    // проверялось только в момент вызова, и самопроверка показывала
    // модель, которая на деле была бы пропущена.
    if (model.requiresGateway && req.gatewayAvailable === false) {
      reasoning.push(`${model.slug} — недоступна: нужен AI Gateway, а AI_GATEWAY_ID не задан.`);
      continue;
    }

    const missing = required.filter((c) => !model.capabilities.includes(c));
    if (missing.length) {
      reasoning.push(`${model.slug} — отброшена: не подтверждено ${missing.join(", ")}.`);
      continue;
    }

    // Окно контекста фильтрует ТОЛЬКО когда оно проверено. Отсутствие
    // значения означает "неизвестно", и отбрасывать по нему нельзя —
    // иначе непроверенные модели молча исчезли бы из выдачи.
    const needed = req.estimatedTokens ?? policy.minContext;
    if (needed && model.contextWindow !== undefined && model.contextWindow < needed) {
      reasoning.push(`${model.slug} — отброшена: окно ${model.contextWindow} меньше нужных ${needed}.`);
      continue;
    }
    if (needed && model.contextWindow === undefined) {
      reasoning.push(`${model.slug} — оставлена, но её окно контекста не проверено.`);
    }

    passed.push(model);
  }

  // Порядок задаётся политикой, а не формулой: prefer — это список классов,
  // который ты можешь прочитать целиком и поменять.
  const rank = (m: ModelEntry) => {
    const i = tiers.indexOf(m.tier);
    return i === -1 ? tiers.length : i;
  };
  const candidates = passed.sort((a, b) => rank(a) - rank(b));

  if (candidates.length === 0) {
    reasoning.push("Ни одна модель в реестре не подошла — задача уйдёт с ошибкой, а не на случайную модель.");
  } else {
    reasoning.push(
      `Порядок попыток (политика "${tiers.join(" → ")}"): ${candidates.map((c) => c.slug).join(", ")}.`,
    );
  }

  return { candidates, reasoning };
}

class ModelValidationError extends Error {}

export interface ModelRunResult<T> {
  output: T;
  /** Какая модель в итоге ответила */
  model: string;
  /** Сколько моделей пришлось перебрать до успеха */
  attempts: number;
  reasoning: string[];
  /** Расход, если модель его сообщила. null — «не сообщено», и это НЕ
   *  ноль: подставленный ноль занизит итог и не заметится никогда. */
  usage: ModelUsage | null;
}

/**
 * Вызывает подходящую модель, при отказе переходит к следующей.
 *
 * Отличие от ретраев внутри `withRetry`: те повторяют ТУ ЖЕ модель, что
 * лечит сетевую икоту. Здесь — переход на ДРУГУЮ модель, что лечит
 * недоступность, исчерпанный лимит и снятие модели с поддержки. Второе
 * без первого бесполезно, и наоборот.
 */
export interface RunOptions<T> extends RouteRequirements {
  /**
   * Проверка пригодности ответа. Вернуть true — ответ принят; вернуть
   * строку — причина отказа, и маршрутизатор переходит к следующей модели.
   *
   * Это ключевая часть удешевления: система не ГАДАЕТ, справится ли
   * дешёвая модель, а СМОТРИТ на результат. Для мелких задач цепочка идёт
   * снизу вверх, поэтому отказ здесь означает подъём на сильную модель —
   * то есть эскалация по доказательству, а не по догадке.
   *
   * Проверка должна быть структурной и дешёвой (есть ли ожидаемые блоки,
   * не пустой ли ответ), а не оценкой качества: оценивать качество может
   * только другая модель, а это уже плата за то, что мы пытались сэкономить.
   */
  validate?: (output: T) => true | string;

  /**
   * Явный выбор модели пользователем — точный слаг из реестра.
   *
   * ПОЧЕМУ ЭТО ПОЯВИЛОСЬ: у ROUTING_POLICY для generate_code/review_repo уже
   * стоит prefer: QUALITY_FIRST — маршрутизатор и без этого поля не выбирает
   * дешёвую модель для кода. Но "лучшая по тиру" — это не то же самое, что
   * "конкретная модель, которую хочет пользователь": в тире "frontier" сейчас
   * стоят рядом claude-sonnet-5, gpt-5.5 и несколько моделей от китайских
   * разработчиков (Kimi, GLM, DeepSeek, Qwen) — все обоснованно сильные, но
   * маршрутизатор равноценно готов выбрать любую из них. preferredModel даёт
   * обойти это и закрепить конкретный слаг.
   *
   * Если модель со слагом не найдена в реестре или не подходит по
   * capability — TypeError с ясной причиной, а не тихий откат на
   * автоматический выбор: тихий откат — ровно то поведение, которого
   * это поле должно избегать.
   */
  preferredModel?: string;

  /**
   * Копилка расхода за миссию.
   *
   * Записывает сюда сам маршрутизатор, а не место вызова. Причина в том,
   * что только здесь известно число ПЕРЕБРАННЫХ моделей: неудачные
   * попытки — это состоявшиеся вызовы, которые ничего не дали, и снаружи
   * их не видно. Учёт по месту вызова показал бы расход меньше, чем он
   * был, — а именно на такие тихие занижения этот проект и напарывался.
   */
  ledger?: UsageLedger;
  /** Correlation propagated to the durable model call ledger. */
  trace?: TraceContext;
  /** Cooperative mission cancellation. Prevents retries/fallback after Stop. */
  signal?: AbortSignal;
}

export async function runModel<T = unknown>(
  env: Env,
  intent: string,
  input: Record<string, unknown>,
  req: RunOptions<T> = {},
): Promise<ModelRunResult<T>> {
  // Явный выбор модели — до всей автоматической маршрутизации, а не как
  // ещё один кандидат в списке: если пользователь закрепил модель, тир и
  // reasoning ниже просто не должны участвовать в решении.
  if (req.preferredModel) {
    const pinned = findModel(req.preferredModel);
    if (!pinned) {
      throw new Error(
        `Модель "${req.preferredModel}" не найдена в реестре. Проверь слаг — маршрутизатор не подставляет другую модель молча, когда выбор сделан явно.`,
      );
    }
    if (isNeuronPaidModel(pinned.slug)) {
      throw new ModelPolicyError(NEURON_PAID_BLOCK);
    }
    if (pinned.requiresGateway && !env.AI_GATEWAY_ID) {
      throw new Error(
        `Модель "${req.preferredModel}" требует AI Gateway, а AI_GATEWAY_ID не задан. Автоматический откат на другую модель здесь намеренно не происходит.`,
      );
    }

    let output: T;
    try {
      output = (await withRetry(
        (retryAttempt) => policyModelCall(env,pinned,input,req.ledger?.scope??currentBillingScope()??"global",req.trace,{routeAttempt:1,retryAttempt}),
        {
          label: `model:${pinned.slug}`,
          attempts: 2,
          // Timeout is not a clean provider failure: env.AI.run cannot be
          // cancelled by Promise.race, so the first dispatch may still finish.
          // Repeating it can create a duplicate charge/result.
          retryable: (err) => !(err instanceof ModelPolicyError) && !(err instanceof TimeoutError) && !(err instanceof ProviderOutcomeUncertainError) && !isQuotaError(err),
          signal: req.signal,
        },
      )) as T;
    } catch (err) {
      if (err instanceof TimeoutError) throw new ModelOutcomeUncertainError(pinned.slug);
      throw err;
    }

    if (req.validate) {
      const verdict = req.validate(output);
      if (verdict !== true) {
        // Ответ не прошёл проверку — но подменять закреплённую модель другой
        // тоже нельзя, иначе preferredModel перестаёт быть гарантией. Ошибка
        // называет, что именно не так, вместо тихой эскалации на автовыбор.
        throw new Error(`Модель "${req.preferredModel}" дала непригодный ответ: ${verdict}`);
      }
    }

    // Закреплённая модель учитывается наравне с автовыбранной: иначе
    // отчёт о расходе зависел бы от того, как модель была выбрана.
    const pinnedUsage = extractUsage(output);
    req.ledger?.record({ intent, model: pinned.slug, usage: pinnedUsage, attempts: 1 });
    await recordMissionDecision(env,req.trace?.missionId,'model',pinned.slug,`Модель закреплена явно: ${pinned.slug}.`,{intent,attempts:1});

    return {
      output,
      model: pinned.slug,
      attempts: 1,
      reasoning: [`Модель закреплена явно: ${pinned.slug}.`],
      usage: pinnedUsage,
    };
  }

  // Сначала бесплатный отбор в памяти, и только ПОТОМ проверка простоя —
  // и лишь для тех, кто прошёл отбор. Обратный порядок читал бы KV для
  // каждой модели реестра на каждом вызове: сейчас это шесть чтений, но
  // растёт линейно с каталогом и добавляется к КАЖДОМУ запросу.
  const registry = await eligibleRegistry(env);
  const preliminary = route(intent, { ...req, gatewayAvailable: !!env.AI_GATEWAY_ID }, registry);

  const unavailable: string[] = [...(req.unavailable ?? [])];
  for (const m of preliminary.candidates) {
    if (unavailable.includes(m.slug)) continue;
    const left = await cooldownRemaining(env, m.slug);
    if (left > 0) unavailable.push(m.slug);
  }

  // Пересобираем маршрут, только если простой кого-то реально отсеял:
  // в обычном случае второго прохода не будет вовсе.
  let decision =
    unavailable.length > (req.unavailable?.length ?? 0)
      ? route(intent, { ...req, unavailable, gatewayAvailable: !!env.AI_GATEWAY_ID }, registry)
      : preliminary;

  // Крайний случай: отстранены ВСЕ подходящие модели. Провалить запрос,
  // не попробовав ни одной, хуже, чем потратить попытку: отстранение —
  // это предположение по таймеру, а модель могла восстановиться раньше.
  if (decision.candidates.length === 0 && preliminary.candidates.length > 0) {
    log("warn", "router.all_cooled_down", { intent, parked: unavailable });
    decision = {
      candidates: preliminary.candidates,
      reasoning: [
        ...preliminary.reasoning,
        "Все подходящие модели числятся отстранёнными по лимиту — пробуем всё равно: отстранение это предположение по таймеру, а не факт.",
      ],
    };
  }

  if (decision.candidates.length === 0) {
    log("error", "router.no_candidates", { intent, reasoning: decision.reasoning });
    throw new Error(
      `Для задачи "${intent}" нет подходящей модели в реестре. ${decision.reasoning.join(" ")}`,
    );
  }

  const errors: string[] = [];
  // Отклонённый ответ и отсутствие ответа — разные вещи, и путать их
  // в сообщении об ошибке значит отправить отладку не туда.
  let anyAnswered = false;

  for (let i = 0; i < decision.candidates.length; i++) {
    const model = decision.candidates[i];

    // Сторонние модели без gateway не работают вообще — пропускаем их
    // явно, а не ловим потом непонятную ошибку от рантайма.
    if (model.requiresGateway && !env.AI_GATEWAY_ID) {
      const why = `${model.slug} пропущена: сторонней модели нужен AI Gateway, а AI_GATEWAY_ID не задан.`;
      decision.reasoning.push(why);
      errors.push(why);
      continue;
    }

    try {
      const output = (await withRetry(
        (retryAttempt) => policyModelCall(env,model,input,req.ledger?.scope??currentBillingScope()??"global",req.trace,{routeAttempt:i+1,retryAttempt}),
        {
          label: `model:${model.slug}`,
          attempts: 2,
          // Исчерпанную квоту повторять на ТОЙ ЖЕ модели бессмысленно:
          // ответ не изменится, а задержка перед переходом на другую
          // модель будет потрачена впустую. Без этого переопределения
          // withRetry считал 429 обычной временной ошибкой и отменял
          // защиту от квоты, построенную здесь же уровнем выше.
          retryable: (err) => !(err instanceof ModelPolicyError) && !(err instanceof TimeoutError) && !(err instanceof ProviderOutcomeUncertainError) && !isQuotaError(err),
          signal: req.signal,
        },
      )) as T;

      // Ответ получен — но пригоден ли он? Для мелких задач мы намеренно
      // начали с дешёвой модели, и отказ здесь поднимет запрос на сильную.
      anyAnswered = true;

      // Базовая проверка, которую агент не может забыть: пустой ответ
      // бесполезен всегда, какой бы ни была задача. Без неё агент молча
      // продолжил бы работу с пустотой — и это выглядело бы как "модель
      // ответила плохо", хотя она не ответила вовсе.
      // Из ответа достаётся текст, и форм ответа у Workers AI НЕСКОЛЬКО.
      // Классические модели отдают { response }, OpenAI-совместимые (kimi,
      // glm, gpt-oss и другие новые) — { choices: [{ message: { content }}]}.
      //
      // Здесь была ошибка, стоившая пяти запусков из шести: проверялось
      // `typeof asText === "string" && пусто`. При форме { choices } поле
      // response равно undefined, typeof undefined !== "string", проверка
      // ПРОХОДИЛА — роутер считал вызов удачным, запасную модель не пробовал
      // и отдавал агенту объект без текста. Агент делал `response ?? ""` и
      // сообщал «Модель вернула пустой план», хотя модель отвечала.
      // Тихая деградация вместо явного отказа — ровно то, что этот проект
      // старается не допускать.
      const asText = extractText(output);
      if (asText.trim().length === 0) {
        const why = `${model.slug} — не удалось извлечь текст из ответа`;
        decision.reasoning.push(why);
        errors.push(why);
        log("warn", "router.empty_response", {
          intent,
          model: model.slug,
          shape: Object.keys((output ?? {}) as Record<string, unknown>).join(","),
        });
        continue;
      }

      // Ошибка в самой проверке не должна выглядеть как отказ модели:
      // иначе баг в валидаторе будет месяцами списываться на провайдера.
      let verdict: true | string;
      try {
        verdict = req.validate ? req.validate(output) : true;
      } catch (validateErr) {
        log("error", "router.validator_threw", {
          intent,
          model: model.slug,
          error: validateErr instanceof Error ? validateErr.message : String(validateErr),
        });
        throw new ModelValidationError("Проверка ответа завершилась ошибкой. Результат не принят.");
      }
      if (verdict !== true) {
        const why = `${model.slug} — ответ отклонён: ${verdict}`;
        decision.reasoning.push(why);
        errors.push(why);
        log("warn", "router.rejected_output", {
          intent,
          model: model.slug,
          reason: verdict,
          next: decision.candidates[i + 1]?.slug,
        });
        continue;
      }

      // Модель ответила — значит она доступна, и отметка о простое (если
      // была) устарела. Снимаем сразу, а не ждём конца таймера.
      if (unavailable.includes(model.slug)) {
        await clearExhausted(env, model.slug);
      }

      log("info", "router.chose", {
        intent,
        model: model.slug,
        tier: model.tier,
        attempt: i + 1,
        earlierFailures: errors.length ? errors : undefined,
      });

      const usage = extractUsage(output);
      req.ledger?.record({ intent, model: model.slug, usage, attempts: i + 1 });
      await recordMissionDecision(env,req.trace?.missionId,'model',model.slug,decision.reasoning.join(' '),{intent,attempts:i+1,candidates:decision.candidates.map(candidate=>candidate.slug)});

      return { output, model: model.slug, attempts: i + 1, reasoning: decision.reasoning, usage };
    } catch (err) {
      if (err instanceof ModelValidationError || err instanceof ModelPolicyError || err instanceof ModelOutcomeUncertainError || err instanceof ProviderOutcomeUncertainError) throw err;
      if (err instanceof TimeoutError) {
        // The provider call may still be executing because env.AI.run has no
        // abort handle here. Do not fan out to another model and create a
        // second potentially billable answer while the first outcome is unknown.
        throw new ModelOutcomeUncertainError(model.slug);
      }
      const text = err instanceof Error ? err.message : String(err);
      errors.push(`${model.slug}: ${text}`);
      if (/3036|daily free allocation|10,000 neurons/i.test(text)) {
        throw new ModelPolicyError("Дневная квота Workers AI исчерпана. Платный обход не запускается.");
      }

      // Исчерпанный лимит отличается от прочих сбоев: повторять эту модель
      // бессмысленно не только сейчас, но и в ближайшие минуты. Запоминаем,
      // чтобы следующий запрос не начинал с той же закрытой двери.
      if (isQuotaError(err)) {
        decision.reasoning.push(`${model.slug} — исчерпан лимит, отстранена на время.`);
        await markExhausted(env, model.slug, err);
      } else {
        decision.reasoning.push(`${model.slug} — не ответила: ${text}`);
      }

      log("warn", "router.fallback", {
        intent,
        failed: model.slug,
        quota: isQuotaError(err),
        next: decision.candidates[i + 1]?.slug,
      });
    }
  }

  log("error", "router.all_failed", { intent, errors, anyAnswered });
  throw new Error(
    anyAnswered
      ? `Ни один ответ не прошёл проверку пригодности для "${intent}". Попытки: ${errors.join(" | ")}`
      : `Ни одна модель не ответила для "${intent}". Попытки: ${errors.join(" | ")}`,
  );
}

/**
 * Достаёт текст из ответа Workers AI, какой бы формы он ни был.
 *
 * Формы, встречающиеся в каталоге:
 *   { response: "..." }                                  — классические модели
 *   { choices: [{ message: { content: "..." } }] }        — OpenAI-совместимые
 *   { choices: [{ text: "..." }] }                        — completion-стиль
 *   { result: { response: "..." } }                       — обёртка REST API
 *   "..."                                                 — голая строка
 *
 * Возвращает пустую строку, если текста нет ни в одной из них. Пустая строка
 * — сигнал перейти к запасной модели, а НЕ повод отдать агенту пустоту.
 */
/**
 * Срезает рассуждение думающей модели.
 *
 * ОТКУДА ЭТО ВЗЯЛОСЬ. Намерение answer маршрутизируется по возможности
 * reasoning — то есть к моделям, которые сначала думают вслух. Многие из
 * них отдают размышление прямо в тексте, обёрнутым в <think>…</think>, и
 * пользователь видел «Привет.</think>На связи.» вместо ответа.
 *
 * ПОЧЕМУ ОБРАБАТЫВАЕТСЯ И ОБОРВАННЫЙ СЛУЧАЙ. Ответ может прийти
 * подрезанным по лимиту токенов: открывающий тег есть, закрывающего нет.
 * Тогда правило «вырезать пару тегов» не сработает, и наружу уйдёт всё
 * размышление целиком. Поэтому висящий <think> без пары режется до конца
 * строки, а одинокий </think> в начале — вместе со всем, что было перед ним.
 */
export function stripReasoning(text: string): string {
  if (!text) return text;
  let out = text;

  // Пара тегов — обычный случай.
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Закрывающий без открывающего: модель начала думать до первого токена,
  // который мы увидели. Всё до него — размышление.
  const lastClose = out.lastIndexOf("</think>");
  if (lastClose !== -1) out = out.slice(lastClose + "</think>".length);

  // Открывающий без закрывающего: ответ оборвался посреди размышления.
  const open = out.indexOf("<think>");
  if (open !== -1) out = out.slice(0, open);

  return out.trim();
}

export function extractText(output: unknown): string {
  if (typeof output === "string") return stripReasoning(output);
  if (!output || typeof output !== "object") return "";

  const o = output as Record<string, unknown>;

  if (typeof o.response === "string") return stripReasoning(o.response);

  const choices = o.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | null;
    const message = first?.message as Record<string, unknown> | undefined;
    if (message && typeof message.content === "string") return stripReasoning(message.content);
    if (first && typeof first.text === "string") return stripReasoning(first.text);
  }

  const nested = o.result as Record<string, unknown> | undefined;
  if (nested) {
    if (typeof nested.response === "string") return stripReasoning(nested.response);
    const nestedChoices = nested.choices;
    if (Array.isArray(nestedChoices) && nestedChoices.length > 0) {
      const first = nestedChoices[0] as Record<string, unknown> | null;
      const message = first?.message as Record<string, unknown> | undefined;
      if (message && typeof message.content === "string") return stripReasoning(message.content);
    }
  }

  return "";
}
