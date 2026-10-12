// Маршрутизатор моделей — тесты отбора и объяснимости.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { route, estimateComplexity } from "../src/lib/model-router";
import { isQuotaError, parseRetryAfter } from "../src/lib/model-health";
import { MODEL_REGISTRY, policyFor, findModel } from "../src/lib/model-registry";
import type { ModelEntry } from "../src/lib/model-registry";

const src = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, "..", f), "utf8");

describe("Реестр моделей", () => {
  it("у каждой записи указан источник данных", () => {
    // Без этого через полгода не отличить проверенное от додуманного —
    // а именно так в проект попал снятый с поддержки слаг.
    for (const m of MODEL_REGISTRY) {
      expect(m.source, `${m.slug} без источника`).toBeTruthy();
      expect(m.source.length).toBeGreaterThan(20);
    }
  });

  it("слаги уникальны", () => {
    const slugs = MODEL_REGISTRY.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("сторонние модели помечены как требующие шлюза", () => {
    // Не-@cf модель без gateway просто не работает — если пометка врёт,
    // маршрутизатор попытается её вызвать и получит непонятную ошибку.
    for (const m of MODEL_REGISTRY) {
      const isCloudflare = m.slug.startsWith("@cf/");
      expect(m.requiresGateway, `${m.slug}: пометка о шлюзе не соответствует слагу`).toBe(!isCloudflare);
    }
  });

  it("окно контекста либо проверено, либо отсутствует — но не выдумано", () => {
    for (const m of MODEL_REGISTRY) {
      if (m.contextWindow !== undefined) {
        expect(m.contextWindow).toBeGreaterThan(0);
        expect(m.source, `${m.slug}: указано окно, но источник его не упоминает`).toBeTruthy();
      }
    }
  });
});

describe("Отбор моделей", () => {
  it("отсеивает модели без нужной возможности", () => {
    const d = route("generate_code");
    for (const c of d.candidates) {
      expect(c.capabilities).toContain("coding");
    }
    // Модель для эмбеддингов сюда попасть не может
    expect(d.candidates.map((c) => c.slug)).not.toContain("@cf/baai/bge-m3");
  });

  it("для эмбеддингов не предлагает текстовые модели", () => {
    const d = route("embeddings");
    expect(d.candidates.length).toBeGreaterThan(0);
    for (const c of d.candidates) expect(c.capabilities).toContain("embeddings");
  });

  it("качество важнее цены: для кода первой идёт frontier", () => {
    const d = route("generate_code");
    expect(d.candidates[0].tier).toBe("frontier");
  });

  it("классификация намеренно идёт на дешёвую модель", () => {
    // Вызывается на каждом свободнотекстовом запросе; одно слово на выходе
    // от frontier-модели точнее не станет, а стоить будет дороже.
    const d = route("classify");
    expect(d.candidates[0].tier).toBe("fast");
  });

  it("каждое решение объяснено", () => {
    const d = route("generate_code");
    expect(d.reasoning.length).toBeGreaterThan(1);
    expect(d.reasoning.join(" ")).toContain("Порядок попыток");
  });

  it("отбракованная модель попадает в объяснение с причиной", () => {
    const d = route("embeddings");
    const text = d.reasoning.join(" ");
    expect(text).toContain("отброшена");
  });

  it("непроверенное окно контекста НЕ отсеивает модель", () => {
    // Отсутствие значения означает "неизвестно", а не "маленькое".
    // Иначе непроверенные модели молча исчезали бы из выдачи.
    // Модель строится здесь, а не ищется в боевом реестре: проверяется
    // поведение роутера, и оно должно оставаться проверяемым даже когда
    // окна контекста проверены у всех записей реестра.
    const unverified: ModelEntry[] = [
      {
        slug: "@test/model-without-window",
        provider: "Test",
        tier: "frontier",
        capabilities: ["text_generation", "tool_calling", "coding"],
        requiresGateway: false,
        source: "Синтетическая запись только для этого теста.",
      },
    ];
    const d = route("generate_code", { estimatedTokens: 500_000 }, unverified);
    expect(d.candidates.length, "модель с непроверенным окном отсеялась").toBeGreaterThan(0);
    expect(d.reasoning.join(" ")).toContain("не проверено");
  });

  it("есть запасные варианты, а не одна модель", () => {
    expect(route("generate_code").candidates.length).toBeGreaterThan(1);
  });

  it("неизвестный intent получает разумную политику, а не падает", () => {
    expect(() => route("что-то-новое")).not.toThrow();
    expect(policyFor("что-то-новое").requires).toContain("text_generation");
  });
});

describe("Слаги моделей живут только в реестре", () => {
  it("ни один агент не вызывает модель напрямую", () => {
    // Захардкоженный слаг пришлось бы искать отдельно, когда модель снимут
    // с поддержки. Один такой уже устарел в этом проекте незамеченным.
    for (const f of fs.readdirSync(path.resolve(import.meta.dirname, "../src/agents"))) {
      const s = src(`src/agents/${f}`);
      expect(s, `${f} вызывает env.AI.run напрямую`).not.toMatch(/env\.AI\.run\(/);
    }
  });

  it("в конфиге не осталось слагов моделей", () => {
    const toml = src("wrangler.staging.json");
    const assignments = toml.split("\n").filter((l) => /^\s*\w+\s*=\s*"@cf\//.test(l));
    expect(assignments, `слаги в wrangler.toml: ${assignments.join(", ")}`).toHaveLength(0);
  });

  it("каждый слаг из реестра резолвится", () => {
    for (const m of MODEL_REGISTRY) expect(findModel(m.slug)).toBeDefined();
  });
});

describe("Оценка сложности", () => {
  it("короткий запрос без файлов — мелкий", () => {
    expect(estimateComplexity({ text: "поправь опечатку" }).level).toBe("trivial");
  });

  it("много файлов — тяжёлый", () => {
    expect(estimateComplexity({ text: "x", fileCount: 40 }).level).toBe("heavy");
  });

  it("план архитектуры перевешивает размер", () => {
    // Короткий текст, но задача уже признана крупной на предыдущем шаге.
    const c = estimateComplexity({ text: "да", hasArchitecturePlan: true });
    expect(c.level).toBe("heavy");
    expect(c.signals.join(" ")).toContain("план архитектуры");
  });

  it("объясняет, на чём основана оценка", () => {
    expect(estimateComplexity({ text: "abc" }).signals.length).toBeGreaterThan(1);
  });

  it("сложность НЕ запрещает сильную модель — только разрешает дешёвый старт", () => {
    // Ошибка в сторону "взяли дорогую зря" стоит одного вызова.
    // Ошибка в обратную сторону портит результат.
    const heavy = route("generate_ui", { complexity: "heavy" });
    const trivial = route("generate_ui", { complexity: "trivial" });
    expect(heavy.candidates[0].tier).toBe("frontier");
    // Для мелкой цепочка начинается дёшево, но сильная модель ОСТАЁТСЯ в ней
    expect(trivial.candidates.map((c) => c.tier)).toContain("frontier");
  });

  it("удешевление работает только там, где провал детектируем", () => {
    // review_repo не имеет структурной проверки ответа, значит дешёвый
    // старт там означал бы тихую потерю качества — и он запрещён.
    const r = route("review_repo", { complexity: "trivial" });
    expect(r.candidates[0].tier).toBe("frontier");
  });
});

describe("Исчерпание лимита", () => {
  it("отличает квоту от прочих сбоев", () => {
    // Сетевую икоту лечит повтор той же модели, квоту — только переход.
    expect(isQuotaError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isQuotaError(new Error("insufficient credits"))).toBe(true);
    expect(isQuotaError(new Error("rate limit exceeded"))).toBe(true);
    expect(isQuotaError(new Error("500 Internal Server Error"))).toBe(false);
    expect(isQuotaError(new Error("connection reset"))).toBe(false);
  });

  it("читает Retry-After, когда провайдер его прислал", () => {
    expect(parseRetryAfter(new Error('{"retry_after": 90}'))).toBe(90);
    expect(parseRetryAfter(new Error("Retry-After: 30"))).toBe(30);
    expect(parseRetryAfter(new Error("нет такого"))).toBeNull();
  });

  it("абсурдный Retry-After обрезается", () => {
    // Сутки без сильной модели из-за странного заголовка хуже,
    // чем одна лишняя неудачная попытка.
    expect(parseRetryAfter(new Error("retry-after: 999999"))).toBeLessThanOrEqual(3600);
  });

  it("исчерпанная модель исключается из отбора с объяснением", () => {
    const all = MODEL_REGISTRY.filter((m) => m.capabilities.includes("coding")).map((m) => m.slug);
    const d = route("generate_code", { unavailable: [all[0]] });
    expect(d.candidates.map((c) => c.slug)).not.toContain(all[0]);
    expect(d.reasoning.join(" ")).toContain("исчерпан лимит");
  });

  it("если исчерпаны все — маршрут пуст, а не случайная модель", () => {
    const d = route("embeddings", { unavailable: MODEL_REGISTRY.map((m) => m.slug) });
    expect(d.candidates).toHaveLength(0);
    expect(d.reasoning.join(" ")).toContain("Ни одна модель");
  });
});

describe("Регрессия: третий аудит", () => {
  it("ошибка доступа НЕ считается квотой", () => {
    // Была найдена на проверке: голая подстрока "insufficient" ловила
    // "insufficient permissions" — ошибку ДОСТУПА. Рабочая модель
    // отстранялась бы на пять минут, то есть защита от недоступности
    // сама создавала бы недоступность.
    expect(isQuotaError(new Error("insufficient permissions"))).toBe(false);
    expect(isQuotaError(new Error("403 forbidden: insufficient permissions"))).toBe(false);
    expect(isQuotaError(new Error("Model capacity planning error"))).toBe(false);
    expect(isQuotaError(new Error("invalid credentials"))).toBe(false);
  });

  it("настоящая квота по-прежнему распознаётся", () => {
    // Сужение шаблонов не должно было потерять реальные случаи.
    for (const msg of [
      "429 Too Many Requests",
      "rate limit exceeded",
      "rate_limit_error",
      "quota exceeded",
      "insufficient credits",
      "insufficient balance",
      "out of quota",
      "credits exhausted",
      "server at capacity",
    ]) {
      expect(isQuotaError(new Error(msg)), `не распознано: ${msg}`).toBe(true);
    }
  });

  it("квота не повторяется на той же модели", () => {
    // withRetry считал 429 обычной временной ошибкой и повторял ту же
    // модель с задержкой — то есть слой ретраев отменял защиту от квоты,
    // построенную уровнем выше.
    const router = src("src/lib/model-router.ts");
    expect(router).toContain("retryable: (err) => !(err instanceof ModelPolicyError) && !isQuotaError(err)");
  });

  it("простой проверяется только у прошедших отбор, а не у всего реестра", () => {
    // Обратный порядок читал бы KV для каждой модели каталога на КАЖДОМ
    // вызове — сейчас шесть чтений, но растёт линейно с реестром.
    // Окно увеличено с 1600 до 3000: добавление preferredModel (короткое
    // замыкание ДО этого цикла, для явного выбора модели пользователем)
    // отодвинуло цикл дальше от начала функции — сам цикл не менялся.
    const router = src("src/lib/model-router.ts");
    const runStart = router.indexOf("export async function runModel");
    const block = router.slice(runStart, runStart + 3000);
    expect(block).toContain("for (const m of preliminary.candidates)");
    expect(block, "обход всего реестра вернулся").not.toContain("for (const m of MODEL_REGISTRY)");
  });

  it("отстранение всех моделей не проваливает запрос вслепую", () => {
    // Отстранение — предположение по таймеру, а не факт: модель могла
    // восстановиться раньше срока.
    expect(src("src/lib/model-router.ts")).toContain("router.all_cooled_down");
  });

  it("отклонённый ответ отличается от отсутствия ответа", () => {
    // Иначе сообщение об ошибке отправляет отладку не туда.
    const router = src("src/lib/model-router.ts");
    expect(router).toContain("anyAnswered");
    expect(router).toContain("Ни один ответ не прошёл проверку");
  });

  it("сбой валидатора не выглядит как отказ модели", () => {
    // Иначе баг в проверке месяцами списывался бы на провайдера.
    expect(src("src/lib/model-router.ts")).toContain("router.validator_threw");
  });
});

describe("Показ маршрута совпадает с поведением", () => {
  it("без шлюза сторонние модели не показываются как выбранные", () => {
    // Иначе самопроверка — первое, что жмут после деплоя — сообщала бы
    // модель, которая на деле была бы пропущена в момент вызова.
    const noGw = route("generate_code", { gatewayAvailable: false });
    for (const c of noGw.candidates) {
      expect(c.requiresGateway, `${c.slug} показана без доступного шлюза`).toBe(false);
    }
  });

  it("объясняет, почему сторонняя модель недоступна", () => {
    const noGw = route("generate_code", { gatewayAvailable: false });
    expect(noGw.reasoning.join(" ")).toContain("AI_GATEWAY_ID");
  });

  it("со шлюзом сторонние модели возвращаются", () => {
    const withGw = route("generate_code", { gatewayAvailable: true });
    expect(withGw.candidates.length).toBeGreaterThan(
      route("generate_code", { gatewayAvailable: false }).candidates.length,
    );
  });

  it("пустой ответ модели отклоняется независимо от агента", () => {
    // Базовая проверка, которую агент не может забыть: без неё он молча
    // продолжил бы работу с пустотой.
    expect(src("src/lib/model-router.ts")).toContain("router.empty_response");
  });

  it("у classify нет флага-пустышки", () => {
    // Политика там и так CHEAP_FIRST — флаг обещал бы разное поведение
    // на мелких и обычных задачах, хотя порядок один и тот же.
    const registry = src("src/lib/model-registry.ts");
    const line = registry.split("\n").find((l) => l.trim().startsWith("classify:")) ?? "";
    expect(line).not.toContain("allowDowngradeOnTrivial");
  });
});

describe("Новое: закрепление модели пользователем (preferredModel)", () => {
  // Не регрессия — возможности не было. tier "frontier" сейчас содержит
  // claude-sonnet-5 и gpt-5.5 рядом с несколькими сильными моделями
  // китайских разработчиков (Kimi/Moonshot, GLM/Z.ai, DeepSeek, Qwen) —
  // маршрутизатор равноценно готов выбрать любую из них, и раньше не было
  // способа закрепить конкретную. Тесты — про контракт, не про то, какая
  // модель "лучше": это выбор пользователя, не встроенное суждение.
  const router = src("src/lib/model-router.ts");

  it("preferredModel обрабатывается ДО автоматической маршрутизации, не как кандидат в списке", () => {
    const runStart = router.indexOf("export async function runModel");
    const beforeRoute = router.slice(runStart, router.indexOf("const preliminary = route("));
    expect(beforeRoute).toContain("if (req.preferredModel)");
    expect(beforeRoute).toContain("findModel(req.preferredModel)");
  });

  it("модель не найдена в реестре — явная ошибка, не тихий откат на автовыбор", () => {
    const block = router.slice(router.indexOf("if (req.preferredModel)"), router.indexOf("const preliminary = route("));
    expect(block).toContain("if (!pinned)");
    expect(block).toContain("throw new Error");
  });

  it("непригодный ответ от закреплённой модели тоже не откатывается молча", () => {
    const block = router.slice(router.indexOf("if (req.preferredModel)"), router.indexOf("const preliminary = route("));
    expect(block, "validate для закреплённой модели должен остаться").toContain("req.validate(output)");
    expect(block).toMatch(/throw new Error\(`Модель.*непригодный ответ/);
  });

  it("поле проброшено до Architect/Code/UI/Evolution, а не только объявлено в типах", () => {
    const types = src("src/types.ts");
    expect(types).toContain("preferredModel?: string");
    for (const f of [
      "src/agents/architect-agent.ts",
      "src/agents/code-agent.ts",
      "src/agents/ui-agent.ts",
      "src/agents/evolution-agent.ts",
    ]) {
      expect(src(f), `${f}: preferredModel не проброшен в вызов runModel`).toContain("request.preferredModel");
    }
  });
});
