import { sqliteD1 } from "./stubs/sqlite-d1";
// AZRAIL — тесты чистой логики.
//
// Здесь нет моков Cloudflare и нет проверок работы с сетью: тестируется то,
// что можно проверить детерминированно — парсеры, фильтры, эвристики.
// Именно они и ломаются молча при рефакторинге, а поймать это в проде трудно.
//
// Запуск: npm test

import { describe, it, expect } from "vitest";
import { extractFiles } from "../src/agents/ui-agent";
import { scanSecrets } from "../src/lib/secret-scan";
import { extractMemoryFacts, stripMemoryBlock } from "../src/lib/memory-agent";
import { parseDecision, renderHistory } from "../src/core/execution-engine";
import { editFile, searchFiles } from "../src/lib/workspace";
import { restoreVersion } from "../src/lib/versions";
import { parsePlan, renderPlan, planProgress, type PlanStep } from "../src/core/planner";
import { parseVerdict, renderEvidence } from "../src/core/checker";
import { chargeWrites, estimateMissionWrites } from "../src/lib/write-budget";
import { parseTestOutput, truncateOutput, isAllowedHost, detectBackend, describeBackend } from "../src/core/sandbox";
import { findTestEvidence } from "../src/core/checker";
import { detectLoop, fingerprint, compareTests } from "../src/core/mission-guard";
import { parseDependencies } from "../src/lib/cve-scan";
import { driftLevel } from "../src/lib/freshness";
import { inferInputType, sanitizeFilename } from "../src/lib/upload";
import { isRetriable, withTimeout, withRetry, TimeoutError } from "../src/lib/resilience";
import { capabilityForIntent, findByCapability, AGENT_REGISTRY } from "../src/lib/agent-registry";
import type { Intent } from "../src/types";

describe("UI Agent: разбор файлов из ответа модели", () => {
  it("вытаскивает несколько файлов", () => {
    const out = extractFiles(
      "текст\n---FILE: src/A.tsx---\nconst a = 1;\n---ENDFILE---\nещё текст\n---FILE: src/b.css---\n.x{}\n---ENDFILE---",
    );
    expect(out.map((f) => f.path)).toEqual(["src/A.tsx", "src/b.css"]);
  });

  it("срезает ведущий слэш", () => {
    expect(extractFiles("---FILE: /src/A.tsx---\nx\n---ENDFILE---")[0].path).toBe("src/A.tsx");
  });

  it("ОТКЛОНЯЕТ path traversal", () => {
    // Без этого сгенерированный моделью путь мог бы уехать в коммит куда угодно
    expect(extractFiles("---FILE: ../../etc/passwd---\nevil\n---ENDFILE---")).toHaveLength(0);
  });

  it("пропускает пустое содержимое", () => {
    expect(extractFiles("---FILE: src/Empty.tsx---\n\n---ENDFILE---")).toHaveLength(0);
  });

  it("не ломается на маркерах внутри строкового литерала", () => {
    const out = extractFiles("---FILE: src/B.tsx---\nconst s = `---FILE: fake---`;\n---ENDFILE---");
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain("fake");
  });

  it("возвращает пусто, когда маркеров нет вообще", () => {
    expect(extractFiles("просто текст без файлов")).toHaveLength(0);
  });
});

describe("Скан секретов", () => {
  it("находит настоящий ключ в коде", () => {
    const f = scanSecrets([{ path: "src/c.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";' }]);
    expect(f).toHaveLength(1);
    expect(f[0].type).toContain("AWS");
    expect(f[0].line).toBe(1);
  });

  it("маскирует значение — полный секрет не утекает в отчёт", () => {
    const f = scanSecrets([{ path: "a.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";' }]);
    expect(f[0].masked).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(f[0].masked).toContain("*");
  });

  it("пропускает файлы-образцы", () => {
    expect(scanSecrets([{ path: ".env.example", content: "AWS=AKIAIOSFODNN7EXAMPLE" }])).toHaveLength(0);
    expect(scanSecrets([{ path: "README.md", content: "AKIAIOSFODNN7EXAMPLE" }])).toHaveLength(0);
  });

  it("пропускает плейсхолдеры", () => {
    expect(
      scanSecrets([{ path: "a.ts", content: 'password = "changeme12345"\ntoken = "${process.env.X}"' }]),
    ).toHaveLength(0);
  });

  it("НЕ срабатывает на хешах и base64 — самое важное свойство", () => {
    // Ложные срабатывания здесь хуже пропусков: отчёт из шума не читают
    const f = scanSecrets([
      {
        path: "a.ts",
        content: 'const sha = "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3";\nconst b64 = "iVBORw0KGgoAAAANSUhEUg";',
      },
    ]);
    expect(f).toHaveLength(0);
  });

  it("схлопывает дубль от общего и специфичного паттерна", () => {
    const f = scanSecrets([{ path: ".env", content: 'api_key="sk-ant-api03-abcdefghijklmnop12345"' }]);
    expect(f).toHaveLength(1);
    expect(f[0].type).toContain("Anthropic"); // остаётся более специфичный
  });
});

describe("Память проекта", () => {
  it("разбирает блок MEMORY", () => {
    const facts = extractMemoryFacts(
      "ответ\n---MEMORY---\ncategory: tech_choice | key: state | value: Redux Toolkit\n---END---",
      "code-agent",
    );
    expect(facts).toEqual([
      { category: "tech_choice", key: "state", value: "Redux Toolkit", sourceAgent: "code-agent" },
    ]);
  });

  it("игнорирует несуществующую категорию, не роняя остальное", () => {
    const facts = extractMemoryFacts(
      "---MEMORY---\ncategory: выдумка | key: a | value: b\ncategory: code_style | key: c | value: d\n---END---",
      "x",
    );
    expect(facts).toHaveLength(1);
    expect(facts[0].key).toBe("c");
  });

  it("вырезает служебный блок из текста для пользователя", () => {
    const clean = stripMemoryBlock("Видимый текст\n---MEMORY---\ncategory: preference | key: a | value: b\n---END---");
    expect(clean).toBe("Видимый текст");
    expect(clean).not.toContain("MEMORY");
  });
});

describe("Разбор зависимостей", () => {
  it("чистит диапазон до конкретной версии", () => {
    const deps = parseDependencies([
      { path: "package.json", content: JSON.stringify({ dependencies: { lodash: "^4.17.21", react: "~18.2.0" } }) },
    ]);
    expect(deps).toEqual([
      { name: "lodash", version: "4.17.21", ecosystem: "npm" },
      { name: "react", version: "18.2.0", ecosystem: "npm" },
    ]);
  });

  it("не падает на битом package.json", () => {
    expect(() => parseDependencies([{ path: "package.json", content: "{не json" }])).not.toThrow();
  });

  it("отбрасывает то, у чего нет конкретной версии", () => {
    const deps = parseDependencies([
      { path: "package.json", content: JSON.stringify({ dependencies: { a: "*", b: "workspace:^" } }) },
    ]);
    expect(deps).toHaveLength(0);
  });

  it("читает requirements.txt", () => {
    const deps = parseDependencies([{ path: "requirements.txt", content: "flask==2.3.0\n# коммент\nrequests>=2.0" }]);
    expect(deps).toEqual([{ name: "flask", version: "2.3.0", ecosystem: "PyPI" }]);
  });
});

describe("Отставание версий", () => {
  it.each([
    ["1.0.0", "2.0.0", "major"],
    ["1.2.0", "1.5.0", "minor"],
    ["1.2.3", "1.2.9", "patch"],
    ["4.18.1", "4.18.1", "up-to-date"],
    ["2.0.0", "1.0.0", "up-to-date"], // откат назад не считаем отставанием
  ])("%s → %s = %s", (cur, latest, expected) => {
    expect(driftLevel(cur, latest)).toBe(expected);
  });
});

describe("Загрузка файлов", () => {
  it("определяет тип по расширению", () => {
    expect(inferInputType("a.zip")).toBe("zip");
    expect(inferInputType("a.PDF")).toBe("pdf");
    expect(inferInputType("track.flac")).toBe("audio");
    expect(inferInputType("sheet.csv")).toBe("text");
    expect(inferInputType("set.als")).toBe("unknown");
    expect(inferInputType("Makefile")).toBe("unknown");
    expect(inferInputType("a.exe")).toBeNull();
    expect(inferInputType("a.BAT")).toBeNull();
    expect(inferInputType("a.cmd")).toBeNull();
    expect(inferInputType("a.msi")).toBeNull();
    expect(inferInputType("a.dll")).toBeNull();
  });

  it("обезвреживает имя файла", () => {
    expect(sanitizeFilename("../../evil name.zip")).not.toContain("/");
    expect(sanitizeFilename("../../evil.zip")).not.toContain("..");
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("Устойчивость", () => {
  it("не ретраит постоянные ошибки", () => {
    expect(isRetriable(new Error("GitHub вернул 404"))).toBe(false);
    expect(isRetriable(new Error("invalid token"))).toBe(false);
  });

  it("ретраит временные", () => {
    expect(isRetriable(new Error("503 Service Unavailable"))).toBe(true);
    expect(isRetriable(new Error("network timeout"))).toBe(true);
    expect(isRetriable(new TimeoutError("x", 100))).toBe(true);
  });

  it("таймаут срабатывает на зависшем промисе", async () => {
    const hang = new Promise((r) => setTimeout(r, 5000));
    await expect(withTimeout(hang, 50, "тест")).rejects.toThrow(TimeoutError);
  });

  it("таймаут не мешает быстрому промису", async () => {
    await expect(withTimeout(Promise.resolve("ок"), 1000, "тест")).resolves.toBe("ок");
  });

  it("повторяет и добивается успеха", async () => {
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls < 3) throw new Error("503 временно");
      return "получилось";
    };
    await expect(withRetry(flaky, { label: "тест", baseDelayMs: 1 })).resolves.toBe("получилось");
    expect(calls).toBe(3);
  });

  it("НЕ повторяет постоянную ошибку — деньги и время не тратятся впустую", async () => {
    let calls = 0;
    const permanent = async () => {
      calls++;
      throw new Error("404 не найден");
    };
    await expect(withRetry(permanent, { label: "тест", baseDelayMs: 1 })).rejects.toThrow();
    expect(calls).toBe(1);
  });
});

describe("Реестр агентов", () => {
  const intents: Exclude<Intent, "unclear">[] = [
    "analyze_spec",
    "generate_code",
    "review_repo",
    "generate_ui",
    "git_operation",
    "deploy",
    "security_scan",
    "qa_check",
    "evolution_audit",
  ];

  it.each(intents)("для intent '%s' находится агент", (intent) => {
    const cap = capabilityForIntent(intent);
    expect(cap).not.toBeNull();
    expect(findByCapability(cap!).length).toBeGreaterThan(0);
  });

  it("цепочка generate_code: есть и планировщик, и исполнитель", () => {
    expect(findByCapability("architecture").length).toBeGreaterThan(0);
    expect(findByCapability("code_generation").length).toBeGreaterThan(0);
  });

  it("fallback для unclear существует", () => {
    expect(capabilityForIntent("unclear")).toBeNull();
    expect(findByCapability("code_review").length).toBeGreaterThan(0);
  });

  it("у каждого агента заполнены обязательные поля", () => {
    for (const a of AGENT_REGISTRY) {
      expect(a.id).toBeTruthy();
      expect(a.capabilities.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(20);
    }
  });

  it("id агентов уникальны", () => {
    const ids = AGENT_REGISTRY.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("parseDecision — разбор шага цикла", () => {
  // Это чистая функция, поэтому здесь настоящие проверки поведения,
  // а не сверка исходника глазами регулярки.

  it("читает обычный JSON", () => {
    const d = parseDecision('{"tool":"read_file","input":{"path":"a.ts"},"reason":"посмотреть"}');
    expect(d?.tool).toBe("read_file");
    expect(d?.input).toEqual({ path: "a.ts" });
  });

  it("снимает markdown-обёртку, которую модели ставят вопреки инструкции", () => {
    const d = parseDecision('```json\n{"done":true,"summary":"готово"}\n```');
    expect(d?.done).toBe(true);
    expect(d?.summary).toBe("готово");
  });

  it("достаёт JSON из прозы", () => {
    const d = parseDecision('Сейчас прочитаю файл. {"tool":"list_files","input":{}} Дальше посмотрим.');
    expect(d?.tool).toBe("list_files");
  });

  it("берёт ПЕРВЫЙ объект, а не склейку от первой { до последней }", () => {
    // Жадный вариант склеил бы два объекта в "{...} {...}" и упал бы на
    // разборе — то есть шаг терялся бы там, где решение на самом деле есть.
    const d = parseDecision('{"tool":"read_file","input":{"path":"x"}} {"tool":"write_file"}');
    expect(d?.tool).toBe("read_file");
  });

  it("не ломается о фигурную скобку внутри строки", () => {
    // Простой счётчик глубины досчитал бы "{" в значении и оборвал объект
    // не там. Кавычки отслеживаются отдельно.
    const d = parseDecision('{"tool":"write_file","input":{"content":"function f() { return 1; }"}}');
    expect(d?.tool).toBe("write_file");
    expect((d?.input as { content: string }).content).toContain("return 1");
  });

  it("не ломается об экранированную кавычку в значении", () => {
    const d = parseDecision('{"tool":"write_file","input":{"content":"он сказал \\"да\\""}}');
    expect(d?.tool).toBe("write_file");
  });

  it("пустой объект — не решение", () => {
    // Ни инструмента, ни признака конца: исполнять нечего.
    expect(parseDecision("{}")).toBeNull();
  });

  it("проза без JSON — null, а не догадка по смыслу", () => {
    // Угадывать намерение по тексту значило бы исполнять то, чего модель
    // не просила.
    expect(parseDecision("Думаю, надо прочитать файл a.ts и потом его изменить")).toBeNull();
    expect(parseDecision("")).toBeNull();
  });

  it("битый JSON — null, а не частичный разбор", () => {
    expect(parseDecision('{"tool":"read_file",,,}')).toBeNull();
  });
});

describe("renderHistory — история цикла для модели", () => {
  // Настоящие проверки поведения: функция чистая, её можно вызвать.
  // До вынесения этот код жил внутри метода и проверялся только сверкой
  // исходника — то есть не проверялся.
  const step = (n: number, ok = true, len = 3000) => ({
    tool: "read_file",
    input: { path: `f${n}.ts` },
    ok,
    result: ok ? "x".repeat(len) : "Ошибка: файл не найден",
  });

  it("пустая история читается как пустая, а не как ошибка", () => {
    expect(renderHistory([])).toBe("(шагов ещё не было)");
  });

  it("свежие шаги остаются полностью", () => {
    const h = [step(1), step(2), step(3), step(4), step(5)];
    const out = renderHistory(h, 4);
    // Последние четыре — целиком
    expect(out).toContain("x".repeat(3000));
  });

  it("старые успешные шаги сворачиваются", () => {
    const h = [step(1), step(2), step(3), step(4), step(5), step(6)];
    const out = renderHistory(h, 4);
    const firstLine = out.split("\n")[0];
    expect(firstLine).toContain("свёрнуто");
    expect(firstLine).not.toContain("x".repeat(100));
    // Но сам факт вызова виден — что звали и что получилось
    expect(firstLine).toContain("read_file");
    expect(firstLine).toContain("ок");
  });

  it("старые ОШИБКИ остаются читаемыми в любом возрасте", () => {
    // Повторить уже сделанную ошибку — самый частый способ потратить шаг
    // впустую. Свернуть её до «(N символов)» значит спровоцировать повтор.
    const h = [step(1, false), step(2), step(3), step(4), step(5), step(6)];
    const out = renderHistory(h, 4);
    expect(out.split("\n")[0]).toContain("файл не найден");
  });

  it("рост длины сдержан: двадцать шагов не дают восьмидесяти тысяч символов", () => {
    const h = Array.from({ length: 20 }, (_, i) => step(i + 1));
    const out = renderHistory(h, 4);
    // Полностью: 4 шага × 3000. Остальные 16 — короткие строки.
    expect(out.length).toBeLessThan(20000);
    // Проверяем именно экономию против наивной склейки
    const naive = h.map((x) => x.result).join("").length;
    expect(naive).toBeGreaterThan(55000);
    expect(out.length).toBeLessThan(naive / 2);
  });

  it("порядок и нумерация сохраняются", () => {
    const h = [step(1), step(2), step(3)];
    const lines = renderHistory(h).split("\n");
    expect(lines[0].startsWith("1.")).toBe(true);
    expect(lines[2].startsWith("3.")).toBe(true);
  });
});

describe("editFile — правка файла в рабочей области", () => {
  // Настоящие вызовы с подставным R2, а не сверка исходника регуляркой.
  // До этого у editFile не было НИ ОДНОГО теста, при том что это один из
  // шести реально исполнимых инструментов цикла — то есть один из главных
  // способов, которым AZRAIL меняет код.
  const makeEnv = (files: Record<string, string>) => {
    const store = new Map(Object.entries(files));
    return {
      env: {
        AZRAIL_R2: {
          get: async (key: string) =>
            store.has(key) ? { text: async () => store.get(key)! } : null,
          put: async (key: string, content: string) => {
            store.set(key, content);
          },
        },
      } as never,
      store,
    };
  };

  // Ключ строится так же, как в самом модуле: projects/{id}/workspace/{path}.
  // Первая версия теста угадывала его и падала на «Файл не найден» —
  // проверяя не то, что задумано.
  const KEY = "projects/proj/workspace/app.ts";

  it("заменяет единственное вхождение", async () => {
    const { env, store } = makeEnv({ [KEY]: "const a = 1;\nconst b = 2;\n" });
    await editFile(env, "proj", "app.ts", "const b = 2;", "const b = 99;");
    expect(store.get(KEY)).toBe("const a = 1;\nconst b = 99;\n");
  });

  it("отказывает, если фрагмент не найден — а не пишет файл впустую", async () => {
    const { env, store } = makeEnv({ [KEY]: "const a = 1;\n" });
    await expect(editFile(env, "proj", "app.ts", "нет такого", "x")).rejects.toThrow(/не найден/);
    expect(store.get(KEY), "файл не должен измениться").toBe("const a = 1;\n");
  });

  it("отказывает при НЕСКОЛЬКИХ совпадениях", async () => {
    // Главная находка: раньше молча правилось первое. Модель получала "ок",
    // считала задачу закрытой, а в файле оставались ещё два таких же места.
    const { env, store } = makeEnv({ [KEY]: "let x = 0;\nlet x = 0;\nlet x = 0;\n" });
    await expect(editFile(env, "proj", "app.ts", "let x = 0;", "let x = 1;")).rejects.toThrow(/3 раз/);
    expect(store.get(KEY), "при неоднозначности файл не трогаем").toBe("let x = 0;\nlet x = 0;\nlet x = 0;\n");
  });

  it("сообщение об ошибке подсказывает выход", async () => {
    // Модель должна понять, ЧТО делать дальше, а не просто получить отказ.
    const { env } = makeEnv({ [KEY]: "a\na\n" });
    await expect(editFile(env, "proj", "app.ts", "a", "b")).rejects.toThrow(/окружающий текст/);
  });

  it("отсутствующий файл — понятная ошибка", async () => {
    const { env } = makeEnv({});
    await expect(editFile(env, "proj", "app.ts", "a", "b")).rejects.toThrow(/Файл не найден/);
  });

  it("пустой search отвергается", async () => {
    // Иначе indexOf("") вернёт 0 и вставит текст в начало файла — тихая порча.
    const { env } = makeEnv({ [KEY]: "abc" });
    await expect(editFile(env, "proj", "app.ts", "", "x")).rejects.toThrow(/search обязателен/);
  });

  it("выход за пределы рабочей области отвергается", async () => {
    const { env } = makeEnv({ [KEY]: "abc" });
    await expect(editFile(env, "proj", "../../secret", "a", "b")).rejects.toThrow();
  });
});

describe("searchFiles — поиск ограничен по работе, а не по находкам", () => {
  // Настоящая проблема масштабирования: раньше цикл читал файлы ПО ОДНОМУ
  // и прерывался только набрав limit совпадений. Поиск, который ничего не
  // находит — обычнейший случай — прочитывал все 500 файлов последовательно.
  // У Workers есть потолок подзапросов (на бесплатном плане 50), так что
  // такой поиск либо упирался в него, либо тянулся десятки секунд.
  const makeEnv = (count: number, content = "ничего") => {
    let reads = 0;
    const files = Array.from({ length: count }, (_, i) => ({ key: `projects/p/workspace/f${i}.ts` }));
    return {
      counter: () => reads,
      env: {
        AZRAIL_R2: {
          list: async ({limit=500}) => ({objects:files.slice(0,limit),truncated:files.length>limit,cursor:String(limit)}),
          get: async () => {
            reads++;
            return { text: async () => content };
          },
        },
      } as never,
    };
  };

  it("не читает больше своего потолка, когда совпадений нет", async () => {
    const { env, counter } = makeEnv(500);
    const res = await searchFiles(env, "p", "нетакого");
    expect(res.matches).toEqual([]);
    // Раньше здесь было бы 500 последовательных чтений.
    expect(counter()).toBeLessThanOrEqual(120);
  });

  it("сообщает, что просмотрел не весь проект", async () => {
    // Молча урезанный результат модель прочитает как «такого в проекте
    // нет» и построит на этом следующий шаг.
    const { env } = makeEnv(500);
    const res = await searchFiles(env, "p", "нетакого");
    expect(res.scannedAll).toBe(false);
    expect(res.scanned).toBeGreaterThan(0);
  });

  it("при маленьком проекте отчитывается о полном просмотре", async () => {
    const { env } = makeEnv(10);
    const res = await searchFiles(env, "p", "нетакого");
    expect(res.scannedAll).toBe(true);
  });

  it("находит совпадения и уважает limit", async () => {
    const { env } = makeEnv(50, "тут есть иголка");
    const res = await searchFiles(env, "p", "иголка", 5);
    expect(res.matches.length).toBe(5);
  });

  it("пустой запрос возвращает ту же форму, а не другой тип", async () => {
    // Разные формы возврата из одной функции — то, на чём tsc поймал
    // первую версию этой правки.
    const { env, counter } = makeEnv(10);
    const res = await searchFiles(env, "p", "");
    expect(res.matches).toEqual([]);
    expect(res.scannedAll).toBe(true);
    expect(counter(), "пустой запрос не должен читать файлы").toBe(0);
  });
});

describe("restoreVersion — восстановление ограничено по работе", () => {
  // Раньше цикл читал все объекты версии ПО ОДНОМУ и складывал в память
  // без потолка. Версия из пятисот файлов — это пятьсот последовательных
  // запросов к R2 (лимит подзапросов Workers) плюс весь текст разом при
  // лимите памяти в 128 МБ. Восстановление большой версии не тормозило,
  // а падало.
  const makeEnv = (fileCount: number, sizeEach = 100) => {
    let reads = 0;
    const objects = Array.from({ length: fileCount }, (_, i) => ({ key: `versions/p/v1/f${i}.ts`, size: sizeEach }));
    return {
      reads: () => reads,
      env: {
        AZRAIL_D1: {
          prepare: () => ({
            bind: () => ({
              first: async () => ({
                id: "v1",
                version_number: 1,
                r2_object_key: "versions/p/v1/",
                summary: "тест",
                created_by_agent: "ui-agent",
                created_at: "2026-01-01",
              }),
            }),
          }),
        },
        AZRAIL_R2: {
          list: async ({ cursor }: { cursor?: string }) => {
            const start = cursor ? Number(cursor) : 0;
            const page = objects.slice(start, start + 100);
            const next = start + 100;
            return { objects: page, truncated: next < objects.length, cursor: String(next) };
          },
          get: async () => {
            reads++;
            return { size: sizeEach, text: async () => "x".repeat(sizeEach) };
          },
        },
      } as never,
    };
  };

  it("маленькая версия восстанавливается целиком", async () => {
    const { env } = makeEnv(10);
    const res = await restoreVersion(env, "p", "v1");
    expect(res?.files.length).toBe(10);
    expect(res?.truncated).toBeFalsy();
  });

  it("огромная версия не читает всё подряд", async () => {
    const { env, reads } = makeEnv(2000);
    const res = await restoreVersion(env, "p", "v1");
    // Раньше здесь было бы 2000 последовательных чтений.
    expect(reads()).toBeLessThanOrEqual(300);
    expect(res?.truncated).toBe(true);
  });

  it("неполнота помечена флагом, а не скрыта", async () => {
    // Проект, восстановленный наполовину, выглядит целым и не работает.
    const { env } = makeEnv(2000);
    const res = await restoreVersion(env, "p", "v1");
    expect(res?.truncated).toBe(true);
    expect(res!.files.length).toBeGreaterThan(0);
  });

  it("потолок по объёму срабатывает раньше потолка по числу файлов", async () => {
    // Двадцать файлов по 2 МБ — это уже 40 МБ, лимит памяти ближе, чем
    // лимит в 300 файлов.
    const { env } = makeEnv(60, 2 * 1024 * 1024);
    const res = await restoreVersion(env, "p", "v1");
    expect(res?.truncated).toBe(true);
    expect(res!.files.length).toBeLessThan(60);
  });
});

describe("parsePlan — разбор плана от модели", () => {
  it("читает JSON-массив", () => {
    expect(parsePlan('["прочитать файл", "починить баг"]')).toEqual(["прочитать файл", "починить баг"]);
  });

  it("снимает ```-обёртку", () => {
    expect(parsePlan('```json\n["один", "два"]\n```')).toEqual(["один", "два"]);
  });

  it("понимает нумерованный список, когда модель проигнорировала просьбу про JSON", () => {
    // Модели регулярно отвечают списком несмотря на инструкцию. Ронять
    // из-за этого миссию незачем — план вспомогательная вещь.
    expect(parsePlan("1. прочитать\n2. поправить\n3. проверить")).toEqual(["прочитать", "поправить", "проверить"]);
  });

  it("понимает маркированный список", () => {
    expect(parsePlan("- первый\n- второй")).toEqual(["первый", "второй"]);
  });

  it("пустой ответ даёт пустой план, а не ошибку", () => {
    expect(parsePlan("")).toEqual([]);
    expect(parsePlan("   ")).toEqual([]);
  });

  it("мусор не превращается в план из одного шага-мусора", () => {
    expect(parsePlan("не могу составить план")).toEqual([]);
  });

  it("ограничивает длину плана", () => {
    const many = JSON.stringify(Array.from({ length: 40 }, (_, i) => `шаг ${i}`));
    expect(parsePlan(many).length).toBeLessThanOrEqual(12);
  });

  it("принимает массив объектов с title", () => {
    expect(parsePlan('[{"title":"первый"},{"title":"второй"}]')).toEqual(["первый", "второй"]);
  });
});

describe("renderPlan — план для модели", () => {
  const mk = (statuses: PlanStep["status"][]): PlanStep[] =>
    statuses.map((status, i) => ({ id: String(i), position: i, title: `шаг ${i}`, status }));

  it("текущий шаг помечен явно", () => {
    // Без пометки модель видит список и не понимает, где находится —
    // а это и есть вопрос, ради которого план нужен.
    const out = renderPlan(mk(["done", "doing", "pending"]));
    expect(out).toContain("[x]");
    expect(out).toContain("[→]");
    expect(out).toContain("[ ]");
  });

  it("пустой план не даёт пустой заголовок", () => {
    expect(renderPlan([])).toBe("");
  });

  it("прогресс считает закрытые шаги", () => {
    expect(planProgress(mk(["done", "done", "doing", "pending"]))).toEqual({ done: 2, total: 4 });
  });
});

describe("parseVerdict — разбор вердикта проверки", () => {
  it("читает JSON с отказом", () => {
    const v = parseVerdict('{"passed": false, "reason": "тесты не написаны"}');
    expect(v.passed).toBe(false);
    expect(v.reason).toContain("тесты");
  });

  it("читает JSON с прохождением", () => {
    expect(parseVerdict('{"passed": true, "reason": "всё сделано"}').passed).toBe(true);
  });

  it("непонятный ответ считается ПРОЙДЕННЫМ, а не заблокированным", () => {
    // Осознанный выбор: проверка — надстройка над работающим циклом.
    // Глючащий разбор не должен превращаться в стену, не выпускающую
    // уже сделанную работу наружу.
    expect(parseVerdict("что-то невнятное").passed).toBe(true);
    expect(parseVerdict("").passed).toBe(true);
  });

  it("явный отказ словами распознаётся", () => {
    expect(parseVerdict("Нет, файл так и не создан").passed).toBe(false);
  });
});

describe("renderEvidence — что видит проверяющий", () => {
  it("показывает факты вызовов", () => {
    const out = renderEvidence([{ tool: "write_file", ok: true, result: "записано 40 байт" }]);
    expect(out).toContain("write_file");
    expect(out).toContain("успех");
  });

  it("обрезает длинные результаты", () => {
    // Иначе проверяющий утонет там же, где тонул бы исполнитель.
    const out = renderEvidence([{ tool: "read_file", ok: true, result: "x".repeat(5000) }]);
    expect(out.length).toBeLessThan(1000);
  });

  it("пустая история читается как пустая", () => {
    expect(renderEvidence([])).toContain("ничего не сделано");
  });
});

describe("Бюджет записей — защита от неконтролируемого счёта", () => {
  const makeEnv = (start = 0, limit?: string) => {
    const { db, sqlite } = sqliteD1();
    sqlite.prepare("INSERT INTO request_quotas VALUES (?, ?, ?)").run("writes:shared", Math.floor(Date.now() / 3_600_000), start);
    return { env: { AZRAIL_D1: db, AZRAIL_WRITE_BUDGET: limit } as never };
  };

  it("пропускает, пока есть запас", async () => {
    const { env } = makeEnv(0);
    const r = await chargeWrites(env, 60);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(60);
  });

  it("останавливает при превышении потолка", async () => {
    const { env } = makeEnv(4990);
    const r = await chargeWrites(env, 60);
    expect(r.allowed).toBe(false);
  });

  it("проверяет ПОЛНУЮ стоимость до списания", async () => {
    // Иначе миссия ценой 60 пролезала бы при одном свободном месте —
    // ровно та дыра, что была в лимите моделей.
    const { env } = makeEnv(0, "50");
    expect((await chargeWrites(env, 60)).allowed).toBe(false);
  });

  it("недоступное хранилище запрещает расход", async () => {
    const env = {
      AZRAIL_KV: {
        get: async () => {
          throw new Error("KV недоступен");
        },
      },
    } as never;
    const r = await chargeWrites(env, 60);
    // Fail closed: отсутствие учёта не открывает бюджет.
    expect(r.allowed).toBe(false);
  });

  it("оценка стоимости миссии растёт вместе с числом шагов", () => {
    expect(estimateMissionWrites(20)).toBeGreaterThan(estimateMissionWrites(5));
    // Нормальная миссия должна укладываться заметно ниже потолка.
    expect(estimateMissionWrites(20)).toBeLessThan(200);
  });
});

describe("parseTestOutput — откуда берётся объективный сигнал", () => {
  // Самое важное место системы: отсюда приходит ответ «работает или нет»,
  // который нельзя подделать. Каждый формат проверяется на настоящем
  // выводе прогонщика, а не на выдуманном.

  it("vitest: всё прошло", () => {
    const r = parseTestOutput("      Tests  355 passed (355)");
    expect(r.ok).toBe(true);
    expect(r.passed).toBe(355);
    expect(r.failed).toBe(0);
    expect(r.runner).toBe("vitest");
  });

  it("vitest: есть падения", () => {
    const r = parseTestOutput("      Tests  2 failed | 353 passed (355)");
    expect(r.ok).toBe(false);
    expect(r.failed).toBe(2);
    expect(r.passed).toBe(353);
  });

  it("jest", () => {
    const r = parseTestOutput("Tests:       2 failed, 10 passed, 12 total");
    expect(r.ok).toBe(false);
    expect(r.failed).toBe(2);
    expect(r.runner).toBe("jest");
  });

  it("pytest", () => {
    expect(parseTestOutput("2 failed, 10 passed in 1.23s").ok).toBe(false);
    expect(parseTestOutput("10 passed in 0.4s").ok).toBe(true);
  });

  it("go test", () => {
    expect(parseTestOutput("ok  \tmypkg\t0.5s\nok  \tother\t0.2s").ok).toBe(true);
    expect(parseTestOutput("ok  \tmypkg\t0.5s\nFAIL\tother\t0.2s").ok).toBe(false);
  });

  it("бодрый текст НЕ отменяет упавшие тесты", () => {
    // Модель, читающая вывод глазами, регулярно объявляет успехом прогон
    // с падениями — потому что внизу написано что-то ободряющее.
    // Решают числа.
    const r = parseTestOutput("Tests  3 failed | 20 passed (23)\n\nAll done! Готово!");
    expect(r.ok).toBe(false);
  });

  it("непонятный вывод: решает КОД ВОЗВРАТА и никогда не предполагается успех", () => {
    // Асимметрия с разбором вердикта проверяющего сознательная: там
    // непонятное считается прохождением (проверка — надстройка), здесь
    // непонятное обязано означать «не подтверждено» — это основание для
    // решения, а не подсказка.
    expect(parseTestOutput("какая-то каша", 0).ok).toBe(true);
    expect(parseTestOutput("какая-то каша", 1).ok).toBe(false);
    expect(parseTestOutput("какая-то каша").ok, "без кода возврата — не успех").toBe(false);
  });

  it("ноль пройденных не считается успехом", () => {
    // «0 passed, 0 failed» означает, что тесты не запустились, а не что
    // всё хорошо.
    expect(parseTestOutput("Tests  0 passed (0)").ok).toBe(false);
  });

  it("вытаскивает имена упавших тестов", () => {
    const r = parseTestOutput("Tests  1 failed | 2 passed (3)\n  × разбор плана падает\n  × бюджет не считается");
    expect(r.failures.length).toBeGreaterThan(0);
    expect(r.failures[0]).toContain("разбор плана");
  });
});

describe("truncateOutput — обрезка вывода", () => {
  it("короткий вывод не трогает", () => {
    expect(truncateOutput("одна\nдве\nтри")).toBe("одна\nдве\nтри");
  });

  it("сохраняет и начало, и КОНЕЦ", () => {
    // Ошибки почти всегда в конце, контекст запуска — в начале.
    // Обрезка только с головы теряет причину падения.
    const long = Array.from({ length: 500 }, (_, i) => `строка ${i}`).join("\n");
    const out = truncateOutput(long, 10, 10);
    expect(out).toContain("строка 0");
    expect(out).toContain("строка 499");
    expect(out).toContain("пропущено");
  });

  it("результат заметно короче исходника", () => {
    const long = Array.from({ length: 5000 }, (_, i) => `строка ${i}`).join("\n");
    expect(truncateOutput(long).length).toBeLessThan(long.length / 4);
  });
});

describe("isAllowedHost — политика сети песочницы", () => {
  it("пропускает реестры пакетов", () => {
    expect(isAllowedHost("https://registry.npmjs.org/react")).toBe(true);
    expect(isAllowedHost("https://pypi.org/simple/")).toBe(true);
  });

  it("пропускает поддомены разрешённого", () => {
    expect(isAllowedHost("https://api.github.com/repos")).toBe(true);
  });

  it("НЕ пропускает подделку с разрешённым в начале хоста", () => {
    // Проверка через includes("github.com") пропустила бы это —
    // классический способ обойти список.
    expect(isAllowedHost("https://github.com.evil.ru/steal")).toBe(false);
  });

  it("запрещает всё остальное", () => {
    expect(isAllowedHost("https://evil.example/exfiltrate")).toBe(false);
  });

  it("неразбираемый адрес — отказ по умолчанию", () => {
    expect(isAllowedHost("не url вовсе")).toBe(false);
  });
});

describe("findTestEvidence — тесты главнее мнений", () => {
  it("берёт ПОСЛЕДНИЙ прогон", () => {
    // Тесты могли падать в середине работы и пройти после исправления.
    // Значение имеет состояние на момент завершения.
    const r = findTestEvidence([
      { tool: "run_tests", ok: false, result: "Tests  5 failed | 1 passed (6)" },
      { tool: "edit_file", ok: true, result: "поправлено" },
      { tool: "run_tests", ok: true, result: "Tests  6 passed (6)" },
    ]);
    expect(r?.ok).toBe(true);
    expect(r?.passed).toBe(6);
  });

  it("без прогона возвращает null — тогда спрашивают модель", () => {
    expect(findTestEvidence([{ tool: "read_file", ok: true, result: "текст" }])).toBeNull();
  });

  it("видит и sandbox_test, и run_tests", () => {
    expect(findTestEvidence([{ tool: "sandbox_test", ok: true, result: "Tests  3 passed (3)" }])?.ok).toBe(true);
  });
});

describe("detectLoop — топтание на месте", () => {
  // Раньше цикл останавливали только три ОШИБКИ подряд. Повтор успешного
  // действия не ловился: агент мог двадцать раз прочитать один файл,
  // сжечь весь бюджет и отчитаться «потолок шагов».
  const read = (path: string) => ({ tool: "read_file", input: { path } });

  it("два одинаковых вызова — ещё не зацикливание", () => {
    // Между двумя чтениями одного файла могла быть правка.
    expect(detectLoop([read("a.ts")], read("a.ts")).looping).toBe(false);
  });

  it("три одинаковых — зацикливание", () => {
    const v = detectLoop([read("a.ts"), read("a.ts")], read("a.ts"));
    expect(v.looping).toBe(true);
    expect(v.repeats).toBe(3);
  });

  it("тот же инструмент с ДРУГИМ входом — нормальная работа", () => {
    // Перебор файлов через read_file — это работа, а не тупик.
    const v = detectLoop([read("a.ts"), read("b.ts")], read("c.ts"));
    expect(v.looping).toBe(false);
  });

  it("порядок ключей входа не влияет", () => {
    // {a:1,b:2} и {b:2,a:1} — один и тот же вызов. Без сортировки ключей
    // повтор не распознавался бы, а модель порядок не гарантирует.
    const one = { tool: "edit_file", input: { path: "x", search: "y" } };
    const two = { tool: "edit_file", input: { search: "y", path: "x" } };
    expect(fingerprint(one)).toBe(fingerprint(two));
    expect(detectLoop([one, two], one).looping).toBe(true);
  });

  it("объяснение говорит, что делать", () => {
    const v = detectLoop([read("a.ts"), read("a.ts")], read("a.ts"));
    expect(v.reason).toContain("другой подход");
  });
});

describe("compareTests — стало лучше или хуже", () => {
  // Критерий строже очевидного: мало починить целевое, надо не сломать
  // остальное. Агент, исправивший одно и сломавший три, формально решил
  // задачу — и именно это надо ловить.

  it("ловит регрессию: проходившее перестало проходить", () => {
    const r = compareTests({ passed: 10, failed: 0 }, { passed: 7, failed: 3 });
    expect(r.regressed).toBe(true);
    expect(r.summary).toContain("Сломано");
  });

  it("регрессия ловится, даже если целевое починено", () => {
    // Было 2 упавших, стало 0 — но пройденных стало меньше. Это провал,
    // хотя формально «починено».
    const r = compareTests({ passed: 20, failed: 2 }, { passed: 15, failed: 0 });
    expect(r.regressed).toBe(true);
    expect(r.fixed, "починка не должна перекрывать поломку").toBe(false);
  });

  it("честная починка распознаётся", () => {
    const r = compareTests({ passed: 10, failed: 3 }, { passed: 13, failed: 0 });
    expect(r.regressed).toBe(false);
    expect(r.fixed).toBe(true);
  });

  it("без замера ДО работы честно говорит об этом", () => {
    // Нельзя отличить починку от того, что всё и так работало.
    const r = compareTests(null, { passed: 10, failed: 0 });
    expect(r.summary).toContain("нельзя отличить");
  });

  it("без изменений — не победа и не поражение", () => {
    const r = compareTests({ passed: 10, failed: 2 }, { passed: 10, failed: 2 });
    expect(r.regressed).toBe(false);
    expect(r.fixed).toBe(false);
  });
});

describe("detectLoop — цикл правки не считается тупиком", () => {
  const read = (path: string) => ({ tool: "read_file", input: { path }, ok: true });
  const edit = (path: string, ok = true) => ({ tool: "edit_file", input: { path, search: "a", replacement: "b" }, ok });

  it("read → edit → read → edit → read одного файла — норма", () => {
    const h = [read("s.css"), edit("s.css"), read("s.css"), edit("s.css")];
    expect(detectLoop(h, read("s.css")).looping).toBe(false);
  });

  it("неудачная правка счётчик не сбрасывает", () => {
    const h = [read("s.css"), edit("s.css", false), read("s.css")];
    expect(detectLoop(h, read("s.css")).looping).toBe(true);
  });

  it("правка другого файла счётчик не сбрасывает", () => {
    const h = [read("s.css"), edit("p.js"), read("s.css")];
    expect(detectLoop(h, read("s.css")).looping).toBe(true);
  });
});
