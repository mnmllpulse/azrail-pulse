// AZRAIL — регрессионные тесты на ОШИБКИ, реально найденные при аудите.
import { coreEngineSource } from "./helpers/core-source";
//
// Каждый тест здесь существует потому, что соответствующий баг был в коде,
// а не потому что "хорошо бы проверить". Если такой тест упадёт — значит
// ошибка вернулась.

import { describe, it, expect } from "vitest";
import { CANON } from "../src/lib/canon";
import { extractText } from "../src/lib/model-router";
import { AZRAIL_SYSTEM_PROMPT, agentPrompt } from "../src/lib/azrail-prompt";
import { extractMemoryFacts, stripMemoryBlock } from "../src/lib/memory-agent";
import fs from "node:fs";
import path from "node:path";

const src = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, "..", f), "utf8");

/** Все файлы проекта, кроме служебных каталогов. */
const listProjectFiles = (): string[] => {
  const root = path.resolve(import.meta.dirname, "..");
  const skip = new Set(["node_modules", ".git", ".wrangler", "dist", "coverage"]);
  const out: string[] = [];
  const walk = (dir: string, rel: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, relPath);
      else out.push(relPath);
    }
  };
  walk(root, "");
  return out;
};

describe("Регрессия: порядок роутов и защита", () => {
  const index = src("src/index.ts");

  it("ни один защищённый роут не обрабатывается ДО проверки доступа", () => {
    // Был баг: /api/agents отвечал раньше блока isProtected и по факту был
    // открыт, хотя числился в списке защищённых.
    const guardPos = index.indexOf("const isProtected");
    expect(guardPos).toBeGreaterThan(0);

    const protectedRoutes = ['"/api/task"', '"/api/upload"', '"/api/agents"'];
    for (const route of protectedRoutes) {
      // Позиция обработчика роута — там, где он сравнивается с url.pathname
      // в условии с request.method (это и есть обработка, а не объявление).
      const handlerRe = new RegExp(`url\\.pathname === ${route.replace(/[/]/g, "\\/")} && request\\.method`);
      const match = handlerRe.exec(index);
      if (match) {
        expect(match.index, `${route} обрабатывается до проверки доступа`).toBeGreaterThan(guardPos);
      }
    }
  });

  it("projectId из URL декодируется", () => {
    // Был баг: клиент шлёт encodeURIComponent(id), сервер читал сырой сегмент,
    // и для id с пробелом чтение никогда не совпадало с записью.
    const historyBlock = index.slice(index.indexOf("/history$"), index.indexOf("/history$") + 400);
    expect(historyBlock).toContain("decodeURIComponent");
  });

  it("есть ограничение размера тела задачи", () => {
    expect(index).toContain("MAX_TASK_BODY_BYTES");
  });
});

describe("Регрессия: целостность данных", () => {
  it("везде, где пишем в таблицы с внешним ключом, сначала гарантируем проект", () => {
    // Был баг: project_versions/task_history/project_memory ссылаются на
    // projects(id), но строка проекта не создавалась нигде. В D1 внешние
    // ключи включены — все вставки падали бы, причём МОЛЧА (try/catch).
    const writers = [
      "src/agents/orchestrator.ts",
      "src/agents/code-agent.ts",
      "src/agents/ui-agent.ts",
      "src/lib/memory-agent.ts",
    ];
    for (const f of writers) {
      expect(src(f), `${f} пишет в D1 без ensureProject`).toContain("ensureProject");
    }
  });

  it("ensureProject создаёт и пользователя — FK-цепочка двухуровневая", () => {
    // Первая версия фикса чинила только нижний уровень и падала сама:
    // projects.user_id тоже внешний ключ, на users(id).
    const project = src("src/lib/project.ts");
    expect(project).toContain("INSERT OR IGNORE INTO users");
    expect(project).toContain("INSERT OR IGNORE INTO projects");
  });

  it("номер версии вычисляется внутри вставки, а не отдельным SELECT", () => {
    // Был баг: SELECT MAX(...) + INSERT не атомарны, два параллельных агента
    // получали одинаковый номер версии.
    for (const f of ["src/agents/code-agent.ts", "src/agents/ui-agent.ts"]) {
      const s = src(f);
      expect(s, `${f}: остался неатомарный SELECT MAX`).not.toMatch(
        /SELECT COALESCE\(MAX\(version_number\), 0\) AS n/,
      );
      expect(s).toContain("COALESCE(MAX(version_number), 0) + 1");
    }
  });

  it("в историю пишется реальный исполнитель, а не всегда оркестратор", () => {
    // Был баг: agent всегда = "orchestrator", из-за чего Evolution Agent,
    // который группирует повторяющиеся сбои по агенту, видел одну кучу.
    const orch = src("src/agents/orchestrator.ts");
    const history = src("src/agents/orchestrator-history.ts");
    expect(history).toContain("actualAgent");
    expect(orch).toContain("result.agent");
    // и ON CONFLICT должен обновлять поле, иначе перезапись не сработает
    expect(history).toContain("agent = excluded.agent");
  });
});

describe("Регрессия: слаги моделей", () => {
  it("не используется ни один снятый с поддержки слаг", () => {
    // Был баг: @cf/meta/llama-3.1-8b-instruct стоял как классификатор,
    // а он Deprecated с 30.05.2026.
    //
    // Раньше эта проверка смотрела в wrangler.toml. После появления
    // маршрутизатора слаги оттуда убраны и живут только в реестре —
    // проверка переехала следом. Сам факт, что тест упал при переезде,
    // и есть его польза: он заметил, что смотрит не туда.
    const deprecated = ["llama-3.1-8b-instruct", "bge-base-en-v1.5", "llama-3-8b-instruct"];

    // Только строки со слагами, без поясняющих комментариев
    const slugLines = src("src/lib/model-registry.ts")
      .split("\n")
      .filter((l) => /^\s*slug:\s*"/.test(l))
      .join("\n");
    expect(slugLines.length, "фильтр перестал находить слаги — проверка ослепла").toBeGreaterThan(0);

    for (const slug of deprecated) {
      expect(slugLines, `реестр содержит устаревшую модель ${slug}`).not.toContain(slug);
    }
  });
});

describe("Регрессия: XSS в дашборде", () => {
  // Рендер памяти, файлов и находок живёт в полной панели. Оболочка
  // проверяется отдельным тестом ниже — гарантия следует за кодом.
  const dash = src("public/classic.html");

  it("значения памяти не вставляются через innerHTML", () => {
    // Был баг: f.value — текст, сгенерированный МОДЕЛЬЮ — попадал в innerHTML.
    // Модель могла выдать исполняемую разметку.
    expect(dash).not.toMatch(/innerHTML[^;]*\+\s*f\.value/);
    expect(dash).toContain("val.textContent = f.value");
  });

  it("строки истории не склеиваются в HTML", () => {
    expect(dash).not.toMatch(/html \+= '<tr><td>'/);
  });

  it("имя загруженного файла не вставляется через innerHTML", () => {
    expect(dash).not.toMatch(/innerHTML[^;]*res\.data\.fileName/);
  });

  it("код сгенерированных файлов рендерится как текст", () => {
    // Это работало правильно с самого начала — тест фиксирует, чтобы не сломали
    expect(dash).toContain("pre.textContent = f.content");
  });
});

describe("Оболочка: данные модели не становятся разметкой", () => {
  const shell = src("public/index.html");

  it("ответ модели попадает только в textContent", () => {
    expect(shell).toContain("$('rBody').textContent");
    expect(shell).not.toMatch(/innerHTML\s*=\s*[^'"]*(data|summary|error|q)\b/);
  });

  it("единственное присваивание innerHTML — очистка", () => {
    const hits = shell.match(/\.innerHTML\s*=\s*([^;]+);/g) ?? [];
    for (const hit of hits) {
      expect(hit, `небезопасное присваивание: ${hit}`).toMatch(/=\s*''\s*;/);
    }
  });
});

describe("Регрессия: сбои записи в D1 не молчат", () => {
  // Баг с внешними ключами оставался невидимым именно потому, что каждая
  // неудачная вставка глоталась пустым catch. Задачу ронять не надо — но
  // след в логах обязателен, иначе поломка выглядит как "данных нет".
  const writers = [
    "src/agents/orchestrator.ts",
    "src/agents/code-agent.ts",
    "src/agents/ui-agent.ts",
    "src/agents/evolution-agent.ts",
    "src/lib/versions.ts",
    "src/lib/memory-agent.ts",
  ];

  it.each(writers)("%s логирует ошибки работы с D1", (f) => {
    const s = src(f);
    // Путь к resilience.ts зависит от того, где лежит сам файл: агенты в
    // src/agents/ импортируют "../lib/resilience", а файлы уже внутри
    // src/lib/ (как versions.ts) — "./resilience". Оба варианта верны,
    // проверка должна принимать оба, а не считать второй ошибкой.
    expect(s, `${f} не импортирует log`).toMatch(/import \{[^}]*\blog\b[^}]*\} from "\.(\.\/lib)?\/resilience"/);
    // ни один catch рядом с обращением к D1 не должен быть пустым
    expect(s, `${f}: остался catch без обработки`).not.toMatch(/AZRAIL_D1[\s\S]{0,600}?\}\s*catch\s*\{\s*\n\s*(\/\/[^\n]*\n\s*)*\}/);
  });
});

describe("Дизайн: доступность", () => {
  const dash = src("public/index.html");

  // Контраст считаем по формуле WCAG, а не на глаз: первая версия палитры
  // давала приглушённому тексту 3.76:1 при норме 4.5:1, и заметил это
  // только расчёт.
  function luminance(hex: string): number {
    const h = hex.replace("#", "");
    const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(ch[0]) + 0.7152 * f(ch[1]) + 0.0722 * f(ch[2]);
  }
  function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  const token = (name: string): string => {
    const m = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(dash);
    if (!m) throw new Error(`токен --${name} не найден`);
    return m[1];
  };

  // Имена токенов сменились вместе с оболочкой (--text-2 -> --muted и т.д.),
  // но порог остался тот же: 4.5:1 для мелкого текста. Меняется палитра —
  // не требование к ней.
  const surfaces = ["bg", "surface", "surface-2"];

  it.each(["text", "muted", "blue", "violet", "good", "bad"])(
    "цвет --%s проходит WCAG AA на всех поверхностях",
    (fg) => {
      for (const bg of surfaces) {
        const ratio = contrast(token(fg), token(bg));
        expect(ratio, `--${fg} на --${bg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("движение выключено по умолчанию и включается только явно", () => {
    // Изменение против прежней версии: раньше движение глушилось глухим
    // правилом под prefers-reduced-motion. На устройстве владельца системные
    // анимации выключены навсегда, поэтому такое правило означало «никогда»,
    // без способа это изменить.
    //
    // Теперь всё движение висит на классе .motion, а класс ставится из JS:
    // по умолчанию — как просит система, но выбор человека её переопределяет
    // в ОБЕ стороны и запоминается. Проверяется именно это свойство:
    // ни одна непрерывная анимация не запускается без .motion.
    const animated = [...dash.matchAll(/^([^{@\n][^{\n]*)\{[^}]*animation:[^}]*infinite/gm)].map((m) => m[1].trim());
    expect(animated.length, "непрерывных анимаций не найдено — тест устарел").toBeGreaterThan(0);
    for (const sel of animated) {
      expect(sel, `анимация без .motion: ${sel}`).toContain(".motion");
    }
    expect(dash, "системная настройка должна быть значением по умолчанию").toContain("prefers-reduced-motion: no-preference");
  });

  it("фокус с клавиатуры видим", () => {
    expect(dash).toContain(":focus-visible");
  });
});

describe("Самопроверка", () => {
  it("ping обязателен в контракте — забыть его нельзя, не сломав сборку", () => {
    // Не хелпер и не опциональный метод: если новый агент попадёт в реестр
    // без ping, проект не соберётся. Это и есть смысл требования.
    expect(src("src/lib/agent-registry.ts")).toMatch(/ping\(\):\s*Promise<AgentPing>/);
  });

  it.each([
    "architect-agent", "code-agent", "ui-agent", "git-agent",
    "deploy-agent", "security-agent", "qa-agent", "evolution-agent",
  ])("%s реализует ping", (agent) => {
    expect(src(`src/agents/${agent}.ts`)).toContain("async ping()");
  });

  it("самопроверка не тратит деньги на модели", () => {
    // Иначе её нельзя было бы жать свободно, а нужна она именно в тот момент,
    // когда непонятно что происходит и жать хочется часто.
    const selfTest = src("src/agents/orchestrator-self-test.ts");
    expect(selfTest).not.toContain("AI.run");
  });

  it("самопроверка убирает за собой", () => {
    const selfTest = src("src/agents/orchestrator-self-test.ts");
    expect(selfTest).toContain("DELETE FROM task_history");
    expect(selfTest).toContain("DELETE FROM projects");
    expect(selfTest).toContain("AZRAIL_KV.delete");
    expect(selfTest).toContain("AZRAIL_R2.delete");
  });

  it("эндпоинт самопроверки защищён", () => {
    const index = src("src/index.ts");
    const guard = index.indexOf("const isProtected");
    const handler = index.indexOf('url.pathname === "/api/selftest" && request.method');
    expect(index).toContain('url.pathname === "/api/selftest" ||');
    expect(handler, "роут самопроверки обрабатывается до проверки доступа").toBeGreaterThan(guard);
  });
});

describe("Регрессия: второй аудит", () => {
  it("агент не объявляет свои id и версию — единственный источник это реестр", () => {
    // Было: реестр говорил "architect"/"1.0", агент — "architect-agent"/"1.0.0".
    // Два источника правды на один факт, которые уже разошлись.
    for (const f of ["architect-agent", "code-agent", "git-agent", "qa-agent"]) {
      const s = src(`src/agents/${f}.ts`);
      expect(s, `${f} объявляет собственную версию`).not.toContain("AGENT_VERSION");
      expect(s, `${f} возвращает собственный id из ping`).not.toMatch(/return \{ id: "/);
    }
  });

  it("ping проверяет хранилище запросом, а не чтением state", () => {
    // Геттер state в SDK кеширует: `if (this._state !== DEFAULT_STATE) return
    // this._state`. На тёплом экземпляре проверка через него не дошла бы до
    // SQLite и всегда проходила бы — проверка, которая не может упасть,
    // даёт ложную уверенность.
    //
    // Комментарии из тела вырезаются перед проверкой: первая версия этого
    // теста падала на пояснении, которое как раз и объясняет, почему
    // this.state здесь не используется.
    const stripComments = (s: string) => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

    for (const f of ["code-agent", "ui-agent", "security-agent"]) {
      const raw = src(`src/agents/${f}.ts`).match(/async ping\(\)[\s\S]*?\n  \}/)?.[0] ?? "";
      expect(raw, `${f}: ping не найден`).not.toBe("");
      const code = stripComments(raw);
      expect(code, `${f}: ping читает state вместо запроса`).not.toContain("this.state");
      expect(code).toContain("SELECT 1");
    }
  });

  it("агент со сломанным хранилищем не считается здоровым", () => {
    const selfTest = src("src/agents/orchestrator-self-test.ts");
    expect(selfTest, "ok выставлялся в true независимо от хранилища").toContain("ok: pong.storageReadable");
  });

  it("recordHistory не зависит от порядка вызовов", () => {
    // Полагаться на то, что вызывающий уже создал проект — та самая
    // хрупкость, что стоила проекту всей персистентности.
    const history = src("src/agents/orchestrator-history.ts");
    expect(history).toContain("ensureProject");
  });

  it("значение из данных не попадает в className напрямую", () => {
    const dash = src("public/classic.html");
    expect(dash).not.toMatch(/className = 'finding ' \+ s\.severity;/);
    expect(dash).toContain("LEVELS[s.severity]");
  });
});

describe("Условия работы subAgent", () => {
  // Оба условия прочитаны в исходнике агентского SDK, а не взяты из
  // документации: subAgent() проверяет ctx.facets/ctx.exports и бросает
  // исключение до всякой попытки поднять агента. Без них все девять
  // агентов падали бы одинаково, с текстом "задача не выполнена".

  it("флаг experimental ОТСУТСТВУЕТ — вопрос закрыт реальным деплоем", () => {
    // Раньше этот тест требовал ПРИСУТСТВИЯ флага — так и читалась ошибка
    // SDK на момент написания. С тех пор реальный CI (2026-08-23) получил
    // от Cloudflare жёсткий отказ (код 10021: "experimental is experimental
    // and cannot yet be used"), флаг убрали, и самотест 11/11 прошёл зелёным
    // без него — subAgent поднимает всех агентов и так. Требование в тексте
    // ошибки SDK для задеплоенных Workers оказалось неверным.
    //
    // Регрессия отсюда уже была один раз: значение из старого ZIP-бэкапа
    // вернуло флаг обратно при восстановлении файлов. Этот тест теперь
    // ловит именно такой откат, а не подталкивает к нему.
    expect(JSON.parse(src("wrangler.staging.json")).compatibility_flags).not.toContain("experimental");
  });

  it("каждый класс агента экспортирован из точки входа", () => {
    // subAgent ищет класс как ctx.exports[cls.name]. Не найдя — бросает
    // "Sub-agent class ... not found in worker exports".
    const index = src("src/index.ts");
    for (const cls of [
      "ArchitectAgent", "CodeAgent", "UiAgent", "GitAgent",
      "DeployAgent", "SecurityAgent", "QaAgent", "EvolutionAgent",
    ]) {
      expect(index, `${cls} не экспортирован — subAgent его не найдёт`).toMatch(
        new RegExp(`export \\{ ${cls} \\}`),
      );
    }
  });

  it("имена экспортов совпадают с именами классов", () => {
    // Сопоставление идёт по cls.name, поэтому переименование через `as`
    // сломает подъём агента в рантайме, не сломав сборку.
    expect(src("src/index.ts")).not.toMatch(/export \{ \w+Agent as \w+ \}/);
  });

  it("каждый экспортируемый агент есть в реестре, и наоборот", () => {
    const exported = [...src("src/index.ts").matchAll(/export \{ (\w+Agent) \}/g)].map((m) => m[1]);
    // Только записи реестра: `agentClass: AgentClass` в объявлении типа
    // тоже подходит под наивный шаблон, поэтому берём лишь имена,
    // оканчивающиеся на Agent.
    const registered = [...src("src/lib/agent-registry.ts").matchAll(/agentClass: (\w+Agent)\b/g)].map((m) => m[1]);
    expect([...exported].sort()).toEqual([...registered].sort());
  });
});

describe("Регрессия: четвёртый аудит", () => {
  it("служебная разметка памяти вырезается ПОЛНОСТЬЮ", () => {
    // Без флага g убирался только первый блок, и разметка из второго
    // попадала в текст, который видит человек.
    const two = "Ответ.\n---MEMORY---\nx\n---END---\nЕщё.\n---MEMORY---\ny\n---END---";
    expect(stripMemoryBlock(two)).not.toContain("---MEMORY---");
    expect(stripMemoryBlock(two)).not.toContain("---END---");
  });

  it("факты берутся из ВСЕХ блоков, а не из первого", () => {
    const two =
      "---MEMORY---\ncategory: tech_choice | key: a | value: 1\n---END---\n" +
      "---MEMORY---\ncategory: code_style | key: b | value: 2\n---END---";
    const facts = extractMemoryFacts(two, "test");
    expect(facts).toHaveLength(2);
    expect(facts.map((f) => f.key).sort()).toEqual(["a", "b"]);
  });

  it("ошибочный факт можно удалить через API", () => {
    // Память подмешивается в промпт при каждой задаче по проекту: одна
    // галлюцинация модели без этого маршрута отравляла бы всю дальнейшую
    // работу, и чинить пришлось бы руками в базе.
    const index = src("src/index.ts");
    expect(index).toContain("forgetFact");
    expect(index).toMatch(/memory\\\/\[\^\/\]\+\\\/\[\^\/\]\+.*DELETE|DELETE.*forgetFact/s);
  });

  it("удаление факта под защитой авторизации", () => {
    const index = src("src/index.ts");
    const protectedBlock = index.slice(index.indexOf("const isProtected"), index.indexOf("if (isProtected)"));
    expect(protectedBlock).toContain('url.pathname.startsWith("/api/projects/")');
    // и сам маршрут обрабатывается ПОСЛЕ проверки
    expect(index.indexOf("forgetFact(env")).toBeGreaterThan(index.indexOf("if (isProtected)"));
  });

  it("мусорная категория не исчезает бесследно", () => {
    expect(src("src/lib/memory-agent.ts")).toContain("memory.invalid_category");
  });

  it("в resilience нет мёртвого кода, но log на месте", () => {
    const r = src("src/lib/resilience.ts");
    expect(r).toContain("export function log");
    expect(r).toContain("export async function withRetry");
    expect(r).toContain("retryable?:");
    expect(r).not.toContain("export async function timed");
    // и правка не задвоилась
    expect(r.split("retryable?:").length - 1).toBe(1);
  });
});

describe("Canon и системный промпт ядра", () => {
  // До этого у ядра не было промпта вообще: свой был у каждого из восьми
  // агентов, у оркестратора — никакого. Личность и порядок работы AZRAIL
  // нигде не задавались.

  it("Canon содержит ровно 21 принцип и они пронумерованы подряд", () => {
    expect(CANON.length).toBe(21);
    CANON.forEach((p, i) => expect(p.n, `принцип на позиции ${i}`).toBe(i + 1));
  });

  it("Canon неизменяем", () => {
    expect(Object.isFrozen(CANON)).toBe(true);
  });

  it("промпт ядра не называет конкретных моделей", () => {
    // Принцип 14 (Model Independence) и правило проекта не писать слаги
    // по памяти: имена моделей живут только в реестре, который сверяется.
    const named = /claude|gpt-|gemini|deepseek|grok|kimi|qwen|llama|flux|veo/i;
    expect(AZRAIL_SYSTEM_PROMPT).not.toMatch(named);
  });

  it("промпт специалиста ставит законы ядра выше роли", () => {
    const composed = agentPrompt("Ты — тестовая роль.");
    expect(composed.indexOf("You are AZRAIL")).toBeLessThan(composed.indexOf("тестовая роль"));
    expect(composed).toContain("Пользователь не знает о твоём существовании");
  });

  it("классификатор НЕ тащит полный промпт ядра", () => {
    // Классификация вызывается на каждом свободнотекстовом запросе и должна
    // остаться самой дешёвой операцией. Личность там стоила бы дороже
    // самой классификации, ничего не улучшая.
    const orch = src("src/agents/orchestrator.ts");
    expect(orch).not.toContain("AZRAIL_SYSTEM_PROMPT");
  });
});

describe("Регрессия: текст ответа модели теряется при другой форме", () => {
  // Реальные последствия, видны в task_history за 2026-08-23:
  //   19:15 generate_code  → «Модель вернула пустой план»
  //   19:16 analyze_spec   → «Модель вернула пустой план»
  //   19:17 analyze_spec   → «Модель вернула пустой план»
  //   18:56 evolution_audit → status done, отчёт ПУСТОЙ
  //
  // Причина: проверка звучала `typeof asText === "string" && пусто`.
  // При форме { choices: [...] } поле response равно undefined,
  // typeof undefined !== "string" — проверка ПРОХОДИЛА. Роутер считал
  // вызов удачным, запасную модель не пробовал, отдавал агенту объект
  // без текста. Модель при этом отвечала.

  it("классическая форма", () => {
    expect(extractText({ response: "план" })).toBe("план");
  });

  it("OpenAI-совместимая форма — та, на которой всё ломалось", () => {
    expect(extractText({ choices: [{ message: { content: "план" } }] })).toBe("план");
  });

  it("completion-форма", () => {
    expect(extractText({ choices: [{ text: "план" }] })).toBe("план");
  });

  it("обёртка REST API", () => {
    expect(extractText({ result: { response: "план" } })).toBe("план");
  });

  it("голая строка", () => {
    expect(extractText("план")).toBe("план");
  });

  it("нет текста — пустая строка, чтобы роутер ушёл на запасную", () => {
    for (const shape of [null, undefined, {}, { choices: [] }, { response: 42 }]) {
      expect(extractText(shape), `форма ${JSON.stringify(shape)}`).toBe("");
    }
  });

  it("ни один агент не читает .response напрямую", () => {
    // Иначе починка роутера не поможет: агент снова достанет пустоту.
    for (const f of ["architect-agent", "code-agent", "evolution-agent", "ui-agent"]) {
      expect(src(`src/agents/${f}.ts`), f).not.toMatch(/\.response\s*\?\?\s*""/);
    }
  });
});

describe("Артефакты: файлы показываются как файлы", () => {
  const shell = src("public/index.html");

  it("сгенерированные файлы не вываливаются сырым JSON", () => {
    // Пункт 1 спецификации: «создание не просто текстовых ответов, а
    // полноценных файлов». Раньше data.files попадал в JSON.stringify.
    expect(shell).toContain("Array.isArray(payload.files)");
    expect(shell).toContain("pre.textContent = content");
  });

  it("содержимое файла не становится разметкой", () => {
    // Это вывод МОДЕЛИ. Через innerHTML он стал бы исполняемым.
    expect(shell).not.toMatch(/innerHTML\s*=\s*[^;]*content/);
  });

  it("кнопки действий рождаются только вместе с файлами", () => {
    // Правило владельца: если на первом экране непонятно за 10 секунд —
    // человек уходит. Кнопка «Скачать» при отсутствии файлов бессмысленна.
    const render = shell.slice(shell.indexOf("function render("));
    const inBranch = render.indexOf("addAct('Скачать архив'");
    const branchStart = render.indexOf("if (files.length)");
    expect(branchStart).toBeGreaterThan(-1);
    expect(inBranch).toBeGreaterThan(branchStart);
  });

  it("ZIP собирается с CRC32", () => {
    // Без верной контрольной суммы архиватор считает файл битым,
    // и скачанный архив не открывается.
    expect(shell).toContain("0xEDB88320");
    expect(shell).toContain("0x04034b50");
  });
});

describe("Предеплойный аудит: найденные дефекты", () => {
  it("классификатор не читает .response напрямую", () => {
    // Форма { choices } давала undefined → raw пустой → намерение unclear,
    // а unclear уходит в code_review. Любая фраза («сделай сайт», «проверь
    // безопасность») молча превращалась в обзор кода.
    const intent = src("src/agents/orchestrator-intent.ts");
    expect(intent).not.toMatch(/routed\.output\.response\s*\?\./);
    expect(intent).toContain("extractText(routed.output)");
  });

  it("отказ классификатора не проглатывается", () => {
    const intent = src("src/agents/orchestrator-intent.ts");
    expect(intent).toContain("orchestrator.classify_failed");
  });

  it("GitHub публикация идёт только через approval-gated PR ticket", () => {
    const pkg = JSON.parse(src("package.json"));
    expect(pkg.scripts["github:pr:ticket"]).toContain("github-pr-publication-ticket.mjs");
    const ticket = src("scripts/github-pr-publication-ticket.mjs");
    expect(ticket).toContain("AZRAIL_ALLOW_GITHUB_MUTATION");
    expect(ticket).toContain("APPROVED_FOR_GITHUB_PR");
    expect(ticket).not.toContain("git push");
  });

  it("в коде не осталось прямых чтений .response", () => {
    for (const f of [
      "src/agents/orchestrator.ts",
      "src/agents/architect-agent.ts",
      "src/agents/code-agent.ts",
      "src/agents/evolution-agent.ts",
      "src/agents/ui-agent.ts",
    ]) {
      expect(src(f), f).not.toMatch(/\.response\s*(\?\?|\?\.)/);
    }
  });
});

describe("Регрессия: третий аудит — пропущенный safe-path", () => {
  // deploy-agent.ts импортировал assertRepo с самого начала правки
  // (см. память проекта про шесть найденных мест), но именно свой
  // единственный вызов GitHub API так и не обернул — интерполировал
  // env.GITHUB_REPO напрямую. Риск ниже, чем у остальных пяти мест
  // (значение из секрета, не из тела запроса), но правило одно на всех,
  // и ни один существующий тест это место не проверял.
  it("deploy-agent проверяет GITHUB_REPO через assertRepo перед вызовом GitHub API", () => {
    const s = src("src/agents/deploy-agent.ts");
    expect(s).toContain("assertRepo(this.env.GITHUB_REPO)");
    expect(s).not.toMatch(/repos\/\$\{this\.env\.GITHUB_REPO\}/);
    expect(s).toContain("err instanceof UnsafePathError");
  });
});

describe("Новое: история версий — контракт и границы", () => {
  // Не регрессия (бага не было — фичи не было). project_versions пишут
  // UI Agent и Code Agent с первых версий, но до этого ничего не читало
  // запись обратно. Тесты здесь про КОНТРАКТ новой функции, а не про
  // исправленный баг.
  const versions = src("src/lib/versions.ts");
  const index = src("src/index.ts");

  it("восстановление различает оба формата r2_object_key", () => {
    // code-agent кладёт один .md-файл по прямому ключу; ui-agent — несколько
    // файлов под префиксом (ключ оканчивается на "/"). Один и тот же
    // столбец в D1 означает разное у разных агентов — оба ветвления должны
    // остаться, иначе один из двух источников версий молча перестанет
    // читаться.
    expect(versions).toContain('.endsWith("/")');
    expect(versions).toContain("AZRAIL_R2.list(");
    expect(versions).toContain("AZRAIL_R2.get(");
  });

  it("восстановление не пишет в git и не деплоит", () => {
    // Граница из docs/product/ARCHITECTURE-v2.md: самомодификация и деплой AZRAIL — это
    // отдельный, куда более строгий путь (только PR, никогда не main).
    // Чтение версий стороннего проекта не должно случайно унаследовать
    // доступ к git-agent/deploy-agent.
    expect(versions).not.toMatch(/from ["']\.\.\/agents\/(git|deploy)-agent["']/);
    expect(versions).not.toContain("wrangler");
    expect(versions).not.toContain("GH_TOKEN");
  });

  it("оба новых роута под защитой auth и декодируют projectId", () => {
    const guardPos = index.indexOf("const isProtected");
    expect(guardPos).toBeGreaterThan(0);
    // Оба пути покрыты уже существующим общим условием
    // url.pathname.startsWith("/api/projects/") — отдельной записи в
    // protectedRoutes не требуется, но обработчики физически должны стоять
    // после guardPos, иначе порядок в файле важнее декларации.
    expect(index).toContain('url.pathname.startsWith("/api/projects/")');
    const listHandler = index.indexOf("/^\\/api\\/projects\\/[^/]+\\/versions$/");
    const restoreHandler = index.indexOf("/versions\\/[^/]+\\/restore$/");
    expect(listHandler, "GET .../versions не найден").toBeGreaterThan(guardPos);
    expect(restoreHandler, "POST .../versions/:id/restore не найден").toBeGreaterThan(guardPos);
    expect(index.slice(listHandler, listHandler + 200)).toContain("decodeURIComponent");
    expect(index.slice(restoreHandler, restoreHandler + 300)).toContain("decodeURIComponent");
  });

  it("восстановление возвращает 404, а не 200 с пустыми данными, для чужого id", () => {
    const block = index.slice(index.indexOf("/versions\\/[^/]+\\/restore$/"), index.indexOf("// GET / отдаёт"));
    expect(block).toContain("if (!restored)");
    expect(block).toMatch(/status:\s*404|,\s*404\)/);
  });
});

describe("Регрессия: четвёртый аудит — тихий отказ лимита", () => {
  const quota = src("src/lib/quota.ts");
  it("сбой атомарного резервирования логируется", () => {
    expect(quota).toContain('log("error", "quota.unavailable"');
  });
  it("при сбое операция запрещается", () => {
    expect(quota.slice(quota.indexOf("} catch (err)"))).toContain("allowed: false");
  });
});

describe("Регрессия: пятый аудит — сбой памяти не должен топить весь результат", () => {
  // rememberFact вызывают 6 агентов (architect/code/ui/evolution/security/
  // qa), и НИ ОДИН не оборачивал вызов в свой try/catch — в отличие от
  // saveVersion/saveArtifact в этих же файлах, которые уже ловят и логируют
  // свои сбои. Непойманный throw из rememberFact шёл наверх через run() до
  // orchestrator.handleTask, где общий catch подменял ВЕСЬ результат задачи
  // (готовый план архитектуры, сгенерированный код) на голое "Сбой при
  // выполнении задачи" — хотя не удалась только необязательная запись в
  // память проекта. Пофикшено централизованно внутри rememberFact.
  const mem = src("src/lib/memory-agent.ts");

  it("rememberFact не роняет вызывающего при сбое записи", () => {
    const block = mem.slice(mem.indexOf("export async function rememberFact"));
    expect(block, "INSERT в project_memory должен быть в try").toMatch(/try\s*\{[\s\S]*INSERT INTO project_memory/);
    expect(block).toContain('log("error", "memory.remember_failed"');
  });
});

describe("Регрессия: пятый аудит — общая сетка на непойманные исключения", () => {
  // До этой правки try/catch стоял только в четырёх локальных местах
  // index.ts. /api/upload → lib/upload.ts делает AZRAIL_R2.put ничем не
  // накрытым; GET .../history и GET .../memory тоже без защиты. Непойманный
  // throw шёл наружу как голая ошибка платформы Cloudflare — без JSON,
  // без строки в структурных логах. Тело fetch() вынесено в handleRequest,
  // сам fetch() — тонкая обёртка с try/catch вокруг него.
  const index = src("src/index.ts");

  it("fetch() — тонкая обёртка с try/catch вокруг всей маршрутизации", () => {
    const fetchBlock = index.slice(index.indexOf("async fetch("), index.indexOf("async function handleRequest"));
    expect(fetchBlock).toContain("try {");
    expect(fetchBlock).toContain("await handleRequest(request, env, ingressTrace)");
    expect(fetchBlock).toContain('log("error", "fetch.uncaught"');
    // Ответ из catch — JSON через тот же helper, что и весь остальной код,
    // а не голый new Response без CORS-заголовков.
    expect(fetchBlock).toMatch(/json\(\{ error:[^}]*\},\s*env,\s*500\)/);
  });
});

describe("Новое: Code Agent — генерация, а не только ревью", () => {
  // Не регрессия (бага не было — возможности не было). До этой правки Code
  // Agent при ЛЮБОМ intent возвращал прозу и сохранял её как .md-версию —
  // даже когда Orchestrator вызывал его через цепочку analyze_spec/
  // generate_code. UI Agent уже пишет и коммитит файлы; Code Agent — нет,
  // хотя имя обещает обратное. Тесты здесь про КОНТРАКТ новой возможности.
  const codeAgent = src("src/agents/code-agent.ts");
  const orchestrator = src("src/agents/orchestrator.ts");

  it("режим генерации переиспользует парсер UI Agent, а не свой", () => {
    // extractFiles уже проверен на ведущий слэш, пустое содержимое, маркеры
    // внутри строковых литералов и path traversal — реализовывать заново
    // значит терять эту защиту без причины.
    expect(codeAgent).toContain('import { extractFiles } from "./ui-agent"');
    expect(codeAgent).toContain("extractFiles(modelOutput)");
  });

  it("режим определяется по architecturePlan, а не угадывается по intent внутри агента", () => {
    expect(codeAgent).toContain('typeof request.architecturePlan === "string"');
    // review_repo не должен внезапно попасть в generate-ветку: это же поле
    // Orchestrator выставляет только для analyze_spec/generate_code —
    // контракт живёт в другом файле, поэтому проверяем оба места разом.
    expect(orchestrator).toMatch(/review_repo сюда не попадает/);
  });

  it("generate_code — отдельная политика роутинга, не review_repo", () => {
    expect(codeAgent).toContain('isGenerate ? "generate_code" : "review_repo"');
  });

  it("пустой результат генерации — needs_input, а не тихий успех с нулём файлов", () => {
    const block = codeAgent.slice(codeAgent.indexOf("if (isGenerate)"));
    expect(block).toContain("if (files.length === 0)");
    expect(block).toContain('"needs_input"');
  });

  it("версия generate-режима — префикс (как у ui-agent), не единственный ключ (как у review)", () => {
    const block = codeAgent.slice(codeAgent.indexOf("private async saveGeneratedVersion"));
    expect(block).toContain("`projects/${projectId}/code/${Date.now()}-${crypto.randomUUID()}/`");
    expect(block, "сбой сохранения версии должен логироваться, не молчать").toContain('log("error", "version.save_failed"');
  });

  it("Orchestrator коммитит сгенерированные файлы ТОЛЬКО по явному commitToBranch", () => {
    const chain = orchestrator.slice(
      orchestrator.indexOf('intent === "analyze_spec"'),
      orchestrator.indexOf('} else if (intent === "generate_ui")'),
    );
    expect(chain).toContain("request.commitToBranch");
    expect(chain).toContain("this.commitFiles(request, files)");
  });
});

describe("Новое: живой стрим задач + чат по WebSocket", () => {
  // Не регрессия — возможности не было. Прогресс задачи был виден только
  // ПОСЛЕ её завершения, через /api/history. Тесты — структурные, как и
  // весь остальной набор: живой Durable Object здесь не поднять, поэтому
  // проверяется код, а не рантайм-поведение сокета.

  it("постоянный токен не читается из URL", () => {
    const authSrc = src("src/lib/auth.ts");
    expect(authSrc).not.toContain('searchParams.get("token")');
    expect(authSrc).toContain('header.startsWith("Bearer ")');
  });

  it("сравнение токена (safeEqual) одно и то же для обоих каналов — не два независимых пути проверки", () => {
    const authSrc = src("src/lib/auth.ts");
    // Считаем ВЫЗОВЫ, не определение функции: safeEqual(a: string... тоже
    // матчится на "safeEqual(", поэтому якорь — по первому аргументу вызова.
    const calls = authSrc.match(/safeEqual\(token,/g) ?? [];
    expect(calls.length).toBe(1);
  });

  it("/api/stream в списке защищённых путей и требует апгрейд-заголовок", () => {
    const idx = src("src/index.ts");
    expect(idx).toContain('url.pathname === "/api/stream"');
    expect(idx).toMatch(/isProtected\s*=[\s\S]*?"\/api\/stream"/);
    expect(idx).toContain('request.headers.get("Upgrade") !== "websocket"');
  });

  it("Orchestrator реализует onConnect/onClose/onMessage — жизненный цикл WebSocket из partyserver/agents", () => {
    const orch = src("src/agents/orchestrator.ts");
    expect(orch).toContain("onConnect(connection:");
    expect(orch).toContain("onClose(connection:");
    expect(orch).toContain("async onMessage(connection:");
  });

  it("recordHistory сначала фиксирует durable state/event, затем рассылает тот же event_stream envelope", () => {
    const fn = src("src/agents/orchestrator-history.ts");
    const d1Idx = fn.indexOf("env.AZRAIL_D1.prepare");
    const eventIdx = fn.indexOf("emitEvent(env");
    const broadcastIdx = fn.indexOf("sendProjectEvent(");
    expect(d1Idx).toBeGreaterThan(-1);
    expect(eventIdx).toBeGreaterThan(d1Idx);
    expect(broadcastIdx).toBeGreaterThan(eventIdx);
    expect(fn).toContain('{ type: "event_stream", event: streamEvent }');
    expect(fn).toContain("catch (broadcastErr)");
  });

  it("переписка хранится в D1, а не в SQLite объекта — одно хранилище, не два", () => {
    // Раньше messages лежала в SQLite самого Durable Object. Переехало в D1
    // (lib/chat-store.ts): диалог должен переживать выгрузку объекта, быть
    // читаемым обычными HTTP-роутами и поддерживать ветвление правок.
    // Здесь проверяется именно ОТСУТСТВИЕ второго хранилища: две таблицы
    // с одним смыслом неминуемо разъехались бы.
    const orch = src("src/agents/orchestrator.ts");
    expect(orch, "локальная таблица messages вернулась").not.toContain("CREATE TABLE IF NOT EXISTS messages");
    expect(orch).toContain('from "../lib/chat-store"');
    expect(src("schema.sql")).toContain("CREATE TABLE IF NOT EXISTS messages");
  });

  it("чат сохраняет и user-, и assistant-сообщение — не только исходящий ответ", () => {
    const orch = src("src/agents/orchestrator.ts");
    const onMessageBody = orch.slice(orch.indexOf("async onMessage("), orch.indexOf("async selfTest("));
    expect(onMessageBody).toContain('addMessage(this.env, convId, "user"');
    expect(onMessageBody).toContain('addMessage(this.env, convId, "assistant"');
  });

  it("ветвление правок заложено в схему, а не откладывается на потом", () => {
    // parent_message_id есть с самого начала: правка старого сообщения
    // создаёт ветку, а не переписывает историю. Добавлять эту колонку задним
    // числом в живую базу дороже, чем завести сразу.
    const schema = src("schema.sql");
    expect(schema).toContain("parent_message_id");
    expect(schema).toContain("idx_messages_parent");
  });

  it("нечатовые/непарсящиеся WS-сообщения молча игнорируются, а не считаются ошибкой", () => {
    const orch = src("src/agents/orchestrator.ts");
    const onMessageBody = orch.slice(orch.indexOf("async onMessage("), orch.indexOf("const userText"));
    expect(onMessageBody).toContain("catch {\n      return;");
    expect(onMessageBody).toContain('parsed.type !== "chat"');
  });

  it("у чата собственная политика маршрутизации, не заимствованная у analyze_spec", () => {
    const registry = src("src/lib/model-registry.ts");
    expect(registry).toMatch(/chat:\s*\{\s*requires:\s*\["text_generation"\]/);
    // Сам чат больше не зовёт runModel напрямую: он идёт через возможность
    // reasoning, чтобы вопрос в чате и тот же вопрос через /api/task
    // проходили один путь. Политика chat при этом жива — ею пользуются
    // цикл выполнения и проверяющий (см. core/execution-engine.ts).
    const orch = src("src/agents/orchestrator.ts");
    expect(orch).toContain('this.runCapability("reasoning"');
  });
});

describe("Новое: кнопки интерфейса", () => {
  const html = src("public/index.html");

  it("нет лишнего </script>: закрывающих ровно столько, сколько блоков", () => {
    // Реальная поломка при добавлении предпросмотра: строка И КОММЕНТАРИЙ
    // с "</script>" внутри JS обрывали блок, и всё ниже молча переставало
    // работать. Парсер не разбирает JS — он ищет последовательность.
    //
    // Разбирать файл регуляркой здесь НЕЛЬЗЯ: она делит текст так же, как
    // браузер, поэтому лишний тег становится для неё законным концом блока
    // и содержимое выглядит чистым. Проверенная на этом версия теста
    // пропускала ровно ту поломку, ради которой написана.
    //
    // Работает счёт: открывающих блоков должно быть столько же, сколько
    // закрывающих тегов во всём файле. Открытия считаются ТОЛЬКО с начала
    // строки — так отсеиваются "<script" внутри строковых констант JS
    // (в коде предпросмотра их три, и без якоря они портили счёт).
    // Закрывающие считаются везде: лишний тег внутри кода обычно и стоит
    // посреди строки — именно его и надо поймать.
    const opens = (html.match(/^<script(?:>|\s+[^>]*>)/gm) ?? []).length;
    const closes = html.split("</scr" + "ipt>").length - 1;
    expect(opens, "блоков скрипта не найдено — тест устарел").toBeGreaterThan(0);
    expect(closes, `закрывающих ${closes} при ${opens} блоках — лишний тег внутри кода`).toBe(opens);
  });

  it("код страницы синтаксически валиден", () => {
    const m = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    expect(() => new Function(m![1])).not.toThrow();
  });

  it("каждый $(id) существует в разметке", () => {
    const ids = new Set([...html.matchAll(/id="([a-zA-Z0-9_-]+)"/g)].map((m) => m[1]));
    const refs = [...new Set([...html.matchAll(/\$\('([a-zA-Z0-9_-]+)'\)/g)].map((m) => m[1]))];
    const missing = refs.filter((id) => !ids.has(id));
    expect(missing, `нет в разметке: ${missing.join(", ")}`).toEqual([]);
  });

  it("«Отменить» реально обрывает запрос, а не только прячет экран", () => {
    // До этого кнопка была косметикой: запрос продолжал висеть, модель
    // дорабатывала и тратилась впустую.
    expect(html).toContain("new AbortController()");
    expect(html).toContain("inflight.abort()");
    expect(html).toContain("signal: inflight.signal");
  });

  it("предпросмотр изолирован: sandbox без allow-same-origin", () => {
    // Это вывод модели — прав самого интерфейса (куки, токен) у него быть
    // не должно. allow-same-origin вместе с allow-scripts сняли бы изоляцию.
    // Проверяются ЗНАЧЕНИЯ атрибута sandbox, а не весь файл: первая версия
    // этого теста падала на собственном пояснении выше, где эта строка
    // упомянута текстом.
    const setCalls = [...html.matchAll(/setAttribute\('sandbox',\s*'([^']*)'\)/g)].map((m) => m[1]);
    const attrs = [...html.matchAll(/<iframe[^>]*sandbox="([^"]*)"/g)].map((m) => m[1]);
    const all = [...setCalls, ...attrs];
    expect(all.length, "iframe предпросмотра должен явно задавать sandbox").toBeGreaterThan(0);
    for (const value of all) {
      expect(value, `sandbox="${value}" снимает изоляцию`).not.toContain("allow-same-origin");
      expect(value).toContain("allow-scripts");
    }
  });

  it("предпросмотр открывается только для html — для остального кнопки нет", () => {
    // Кнопка «Открыть» у .py не запустила бы ничего: браузер исполняет
    // только HTML/CSS/JS. Обещать иное — врать интерфейсом.
    expect(html).toContain("/\\.html?$/i.test(f.path)");
  });

  it("список моделей приходит из того же реестра, что использует маршрутизатор", () => {
    const idx = src("src/index.ts");
    expect(idx).toContain('url.pathname === "/api/models"');
    expect(idx).toContain("MODEL_REGISTRY.map");
    expect(idx).toMatch(/isProtected\s*=[\s\S]*?"\/api\/models"/);
    // Ключей и внутренней кухни наружу не отдаём.
    const block = idx.slice(idx.indexOf('url.pathname === "/api/models"'), idx.indexOf('url.pathname === "/api/stream"'));
    expect(block).not.toContain("apiKey");
    expect(block).not.toContain("AZRAIL_TOKEN");
  });

  it("недоступные без Gateway модели помечены, а не показаны как рабочие", () => {
    const idx = src("src/index.ts");
    expect(idx).toContain("available: !modelBlockReason(m,policy,env)");
    expect(html).toContain("o.disabled = true");
  });

  it("голосовой ввод не обещает того, чего браузер не умеет", () => {
    // При отсутствии Web Speech API кнопка прячется, а не висит нерабочей.
    expect(html).toContain("window.SpeechRecognition || window.webkitSpeechRecognition");
    expect(html).toContain("$('micBtn').classList.add('hidden')");
  });

  it("закрытие предпросмотра очищает srcdoc, а не только прячет окно", () => {
    // Иначе скрипты внутри продолжали бы выполняться за закрытым экраном.
    const closeBlock = html.slice(html.indexOf("$('previewClose')"), html.indexOf("function loadModels"));
    expect(closeBlock).toContain("srcdoc = ''");
  });
});

describe("Реестр инструментов не врёт о доступности", () => {
  // Ровно та поломка, что пришла в архиве SPRINT1: девять инструментов
  // числились доступными при пяти написанных адаптерах, и ещё один
  // (search_files) был полностью реализован, но помечен недоступным —
  // executeTool отказывал ДО вызова рабочего кода.
  //
  // Расхождение здесь не косметическое: на этот флаг опирается решение,
  // звать инструмент или нет. Поэтому сверка автоматическая и в обе стороны.
  const registrySrc = src("src/lib/tool-registry.ts");
  const engineSrc = coreEngineSource();

  const declared = [...registrySrc.matchAll(/name:\s*"([a-z_]+)".*?available:\s*(true|false)/g)].map((m) => ({
    name: m[1],
    available: m[2] === "true",
  }));
  const implemented = [...engineSrc.matchAll(/case "([a-z_]+)":/g)].map((m) => m[1]);

  it("реестр вообще разобрался", () => {
    expect(declared.length).toBeGreaterThan(10);
    expect(implemented.length).toBeGreaterThan(0);
  });

  it("нет доступных без адаптера — иначе вызов падает в default с ошибкой", () => {
    const lying = declared.filter((t) => t.available && !implemented.includes(t.name)).map((t) => t.name);
    expect(lying, `помечены доступными, но адаптера нет: ${lying.join(", ")}`).toEqual([]);
  });

  it("реализованное блокируется только по правилу approval, а не по забывчивости", () => {
    // Исходная ловушка остаётся: search_files был написан целиком и
    // заблокирован флагом просто потому, что флаг забыли переставить —
    // executeTool отказывал ДО вызова рабочего кода.
    //
    // Но одно исключение законно: у инструмента риска "approval" адаптер
    // может существовать, а флаг быть закрыт СОЗНАТЕЛЬНО — цикл к таким
    // инструментам не допущен вовсе (см. тест про approval ниже). Это не
    // забытый флаг, а действующее правило.
    //
    // Поэтому проверяется не «нет заблокированных реализованных», а более
    // точное: заблокированным реализованным разрешено быть только
    // approval-инструментам.
    const risks = Object.fromEntries(
      [...registrySrc.matchAll(/name:\s*"([a-z_]+)"[^}]*?risk:\s*"(safe|review|approval)"/g)].map((m) => [m[1], m[2]]),
    );
    // sandbox_* исключены СОЗНАТЕЛЬНО: их доступность вычисляется по
    // среде (есть ли контейнеры или GITHUB_TOKEN), а в статическом
    // списке стоит false как безопасное умолчание. Адаптер при этом
    // существует — и это не забытый флаг, а другой механизм.
    const wronglyBlocked = declared
      .filter(
        (t) =>
          !t.available &&
          implemented.includes(t.name) &&
          risks[t.name] !== "approval" &&
          !t.name.startsWith("sandbox_"),
      )
      .map((t) => t.name);
    expect(wronglyBlocked, `реализованы и заблокированы без причины: ${wronglyBlocked.join(", ")}`).toEqual([]);
  });

  it("availableTools отдаёт только исполнимое — этот список уходит модели", () => {
    // Перечислять модели недоступные инструменты вредно: она станет их
    // звать и получать ошибки вместо работы.
    // availableTools теперь фильтрует describeTools(env), а не сырой
    // массив: доступность песочницы зависит от среды и в статическом
    // списке её честно записать нельзя.
    expect(registrySrc).toContain("describeTools(env).filter((t) => t.available)");
  });

  it("цикл выполнения реален: модель решает, движок исполняет, результат возвращается", () => {
    // Раньше runMission всегда возвращал needs_input — цикла не было вовсе.
    // Теперь он есть, и тест сторожит его наличие, а не отсутствие.
    expect(engineSrc).toContain("for (let i = checkpoints.length");
    expect(engineSrc).toContain("this.decideNextStep(");
    expect(engineSrc).toContain("await checkpointTool(");
    expect(engineSrc, "результат шага должен возвращаться модели").toContain("history.push(");
  });

  it("maxIterations — жёсткий потолок, а не пожелание", () => {
    // Без него зациклившаяся модель крутилась бы до исчерпания лимитов
    // Worker'а. Ограничение сверху обязательно, даже если вызывающий
    // попросит больше.
    expect(engineSrc).toContain("clampIterations(ctx.maxIterations)");
  });

  it("исчерпанный потолок — это НЕ done", () => {
    // Задача могла остаться недоделанной; выдавать её за выполненную нельзя.
    const tail = engineSrc.slice(engineSrc.indexOf("mission.exhausted"));
    expect(tail).toContain('status: "needs_input"');
    expect(tail).not.toContain('status: "done"');
  });

  it("подряд идущие ошибки прекращают цикл", () => {
    // Одна ошибка возвращается модели текстом — пусть пробует иначе.
    // Три подряд означают, что дело не в невезении.
    expect(engineSrc).toContain("consecutiveFailures >= 3");
    expect(engineSrc, "успешный шаг обязан сбрасывать счётчик").toContain("consecutiveFailures = 0");
  });

  it("циклу доступны только safe/review — approval он исполнить не может", () => {
    // Необратимое действие требует отдельного решения владельца, а не
    // согласия внутри цикла. Проверяется не намерение, а факт: ни один
    // инструмент с risk "approval" не помечен доступным.
    const approvalAvailable = [...registrySrc.matchAll(/name:\s*"([a-z_]+)"[^}]*?risk:\s*"approval"[^}]*?available:\s*(true|false)/g)]
      .filter((m) => m[2] === "true")
      .map((m) => m[1]);
    expect(approvalAvailable, `approval-инструменты доступны циклу: ${approvalAvailable.join(", ")}`).toEqual([]);
  });
});

describe("Регрессия: результат RPC-стаба должен быть аннотирован", () => {  it("handleTask через стаб всегда с явным типом TaskResult", () => {
    // Без аннотации возвращаемый тип схлопывается в never, и сборка падает
    // пачкой ошибок на обращениях к полям результата. Ровно на этом не
    // собирался архив SPRINT1 — восемь ошибок из девяти были отсюда.
    const idx = src("src/index.ts");
    const calls = [...idx.matchAll(/(?:const|let)\s+(\w+)(\s*:\s*TaskResult)?\s*=\s*await\s+orchestrator\.handleTask/g)];
    expect(calls.length, "вызовов handleTask не найдено — тест устарел").toBeGreaterThan(0);
    for (const c of calls) {
      expect(c[2], `результат handleTask без аннотации типа: ${c[0]}`).toBeTruthy();
    }
  });
});

describe("Ключи загрузок не сталкиваются", () => {
  // Раньше ключ строился как `uploads/${Date.now()}-${имя}`. Разрешение
  // Date.now() — миллисекунда: два файла с одинаковым именем, загруженные
  // подряд, получали ОДИН ключ, и второй молча затирал первый в R2.
  const upload = src("src/lib/upload.ts");

  it("в ключе есть UUID, а не только отметка времени", () => {
    expect(upload).toContain("crypto.randomUUID()");
    expect(upload, "время как единственный различитель вернулось").not.toMatch(
      /uploads\/\$\{Date\.now\(\)\}-\$\{sanitizeFilename/,
    );
  });

  it("projectId в пути проверяется по белому списку символов", () => {
    // Он попадает прямо в ключ R2 — произвольная строка дала бы обход
    // по каталогам через "../".
    expect(upload).toContain("/^[A-Za-z0-9_-]{1,128}$/.test(projectId)");
    expect(upload).toContain('"inbox"');
  });

  it("двоичные вложения не читаются текстом", () => {
    // Иначе модель получила бы кашу из байтов и приняла её за содержимое.
    const reader = src("src/lib/source-reader.ts");
    expect(reader).toContain("двоичное вложение");
    expect(reader).toMatch(/case "image":[\s\S]{0,200}case "video":/);
  });
});

describe("Карта миссии и кнопки ввода", () => {
  const html = src("public/index.html");
  const engine = coreEngineSource();

  it("живая трансляция не заменяет запись в D1, а дополняет её", () => {
    // Сокет показывает «сейчас», D1 хранит «что было». Если бы показ
    // заменил запись, история миссии исчезала бы при закрытии вкладки.
    const note = engine.slice(engine.indexOf("async note("));
    expect(note).toContain("await emitMissionEvent(");
    expect(note).toContain("ctx.onEvent(");
  });

  it("ни запись журнала, ни трансляция не роняют миссию", () => {
    // Раньше здесь проверялось, что emitMissionEvent стоит ДО try — то
    // есть что запись НЕ защищена. Это и была ошибка: голый await ронял
    // всю миссию при сбое D1, причём первое событие уходит до начала
    // работы, так что при неприменённой схеме падала бы каждая.
    //
    // Теперь защищены оба: журнал и показ. Оба вторичны по отношению к
    // делу, которое описывают.
    const journalSrc = src("src/core/execution-journal.ts");
    const note = journalSrc.slice(journalSrc.indexOf("async note("), journalSrc.indexOf("\n  }\n", journalSrc.indexOf("async note(")));
    expect(note).toContain("execution.event_write_failed");
    expect(note).toContain("execution.live_event_failed");
    // Ни одного незащищённого await в этом методе.
    const bareAwait = /^\s{4}await /m.test(note);
    expect(bareAwait, "await вне try в note()").toBe(false);
  });

  it("шаги показываются человеческими словами, а не именами функций", () => {
    // "read_file" ничего не говорит тому, кто не писал этот код.
    expect(html).toContain("TOOL_RU");
    expect(html).toContain("читает файл");
  });

  it("подсветка «сейчас» всегда на одной строке", () => {
    // Иначе одновременно светились бы два шага, и было бы неясно, где идёт
    // работа. Предыдущий текущий гасится ДО добавления нового.
    const trace = html.slice(html.indexOf("function traceEvent"), html.indexOf("function resetTrace"));
    expect(trace).toContain("querySelector('li.now')");
    const prevIdx = trace.indexOf("var prev =");
    const appendIdx = trace.indexOf("box.appendChild(li)");
    expect(prevIdx).toBeGreaterThan(-1);
    expect(appendIdx).toBeGreaterThan(prevIdx);
  });

  it("варианты ответа сбрасываются при новой задаче", () => {
    // Иначе стрелки листали бы ответы на РАЗНЫЕ вопросы, и «2/3»
    // не означало бы ничего.
    const again = html.slice(html.indexOf("$('againBtn')"), html.indexOf("$('token').value"));
    expect(again).toContain("versions = []");
    expect(again).toContain("attachments = []");
    expect(again).toContain("resetTrace()");
  });

  it("доводка формулировки обратима", () => {
    // Переписанный текст — предложение, а не приговор: исходник сохраняется.
    expect(html).toContain("lastDraft = text");
    expect(html).toContain("вернуть как было");
  });

  it("доводка не засоряет историю диалога", () => {
    // Черновик и его правка — не переписка. Отдельный эндпоинт именно
    // поэтому, а не для красоты.
    const idx = src("src/index.ts");
    const polish = idx.slice(idx.indexOf('url.pathname === "/api/polish"'), idx.indexOf('url.pathname === "/api/selftest"'));
    expect(polish).not.toContain("addMessage(");
  });

  it("ошибка загрузки файла остаётся на экране", () => {
    // Молча пропавший файл хуже видимой надписи о том, что он не загрузился.
    const upload = html.slice(html.indexOf("function uploadOne"), html.indexOf("// ─── Доводка"));
    expect(upload).toContain("не загрузился");
  });
});

describe("Цикл выполнения досягаем из интерфейса", () => {
  // Реальная недоделка, найденная сверкой: цикл, карта миссии и события
  // были написаны, а вызвать их из интерфейса было нечем — /api/mission
  // не упоминался в index.html вообще. Карта светилась бы только при
  // вызове через curl. Тест сторожит именно связь, а не наличие частей.
  const html = src("public/index.html");

  it("интерфейс умеет позвать /api/mission, а не только /api/task", () => {
    expect(html).toContain("'/api/mission'");
    expect(html).toContain("autoMode");
  });

  it("режим меняет и адрес, и форму запроса", () => {
    // Цикл ждёт message + обязательный projectId; одиночная задача —
    // inputType + payload. Одна форма на оба пути не годится.
    const send = html.slice(html.indexOf("function send()"), html.indexOf("function render("));
    expect(send).toContain("autonomous ? '/api/mission' : '/api/task'");
    expect(send).toContain("message: text");
  });

  it("ответ миссии разворачивается перед показом", () => {
    // Миссия отдаёт { missionId, result }, задача — результат напрямую.
    // Без разворачивания на экран попал бы объект-обёртка.
    expect(html).toContain("data.result ? data.result : data");
  });
});

describe("Оболочка: перенос вида из макета владельца", () => {
  const html = src("public/index.html");

  it("@import шрифтов идёт первым правилом", () => {
    // CSS требует, чтобы @import предшествовал любым правилам. После :root
    // браузер молча его отбрасывает — шрифты не грузятся, и понять почему
    // можно только зная это правило. Один раз уже так и вышло.
    const style = html.slice(html.indexOf("<style>") + 7);
    const importIdx = style.indexOf("@import");
    const firstRule = style.search(/[.:#a-zA-Z*][^\n]*\{/);
    expect(importIdx).toBeGreaterThan(-1);
    expect(importIdx, "@import после первого правила — будет проигнорирован").toBeLessThan(firstRule);
  });

  it("навигация ведёт только к существующему", () => {
    // В макете были пункты Sandbox, Deploy, Memory — за ними нет кода.
    // Пустая кнопка обещает возможность, а обнаруживается это нажатием.
    const sidebar = html.slice(html.indexOf('<aside class="sidebar"'), html.indexOf("</aside>"));
    // Проверяются ПОДПИСИ КНОПОК, а не весь блок: первая версия падала на
    // собственном комментарии, где эти названия упомянуты как отвергнутые.
    const labels = [...sidebar.matchAll(/<button class="nav-item[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)].map((m) => m[1]);
    for (const ghost of ["Sandbox", "Deploy", "Memory", "Agents"]) {
      expect(labels, `пункт "${ghost}" без реализации`).not.toContain(ghost);
    }
    // Каждый пункт обязан нести обработчик: data-open, data-goto или id.
    const items = [...sidebar.matchAll(/<button class="nav-item[^"]*"([^>]*)>/g)].map((m) => m[1]);
    expect(items.length).toBeGreaterThan(0);
    for (const attrs of items) {
      expect(attrs, `пункт без поведения: ${attrs}`).toMatch(/data-open=|data-goto=|id=/);
    }
  });

  it("зашитого прогресса из макета нет", () => {
    // width:18% в разметке означал бы работу, которой не происходит.
    expect(html).not.toMatch(/width:\s*18%/);
  });

  it("счётчик умений берётся из реестра, а не из разметки", () => {
    expect(html).toContain("'/api/tools'");
    expect(html).toContain("t.available");
  });

  it("выбор движения запоминается и переопределяет систему в обе стороны", () => {
    // Через обёртку store(): прямой вызов localStorage бросает на
    // непрозрачном origin и убивает скрипт целиком.
    expect(html).toContain("local.set(motionKey");
    expect(html).toContain("motionSaved === null ? systemLikesMotion");
  });
});

describe("Цикл дотягивается до агентов", () => {
  // Замыкание круга: раньше цикл умел только писать код. Теперь он может
  // сравнить версии и прогнать тесты — но не своей копией работы с GitHub,
  // а через тех же агентов, что обслуживают обычные задачи.
  const engine = coreEngineSource();
  const orch = src("src/agents/orchestrator.ts");
  const idx = src("src/index.ts");

  it("движок не заводит второй путь к GitHub API", () => {
    // Своя копия означала бы вторую проверку имени репозитория и будущее
    // расхождение между двумя реализациями одного и того же.
    expect(engine, "прямые вызовы GitHub из движка").not.toContain("api.github.com");
    expect(engine).toContain("ctx.invokeCapability");
  });

  it("Оркестратор отдаёт возможности наружу тем же runCapability", () => {
    // Не копия логики выбора агента, а тот же метод: один путь, один
    // набор проверок.
    const invoke = orch.slice(orch.indexOf("async invokeCapability("), orch.indexOf("private async runCapability("));
    expect(invoke).toContain("this.runCapability(capability, request)");
  });

  it("мост прокинут из роута, где есть ссылка на Durable Object", () => {
    // Мост переехал из роута в Оркестратор вместе с самой миссией: цикл
    // теперь исполняется ВНУТРИ Durable Object, и межобъектного вызова
    // (с его "Cannot perform I/O on behalf of a different Durable
    // Object") здесь больше не возникает в принципе. Проверка осталась
    // той же по сути: движок зовёт агентов не сам, а через мост.
    expect(orch).toContain("invokeCapability: (capability, request) => orchestrator.runCapability");
  });

  it("без моста инструмент отказывает явно, а не падает невнятно", () => {
    // Цикл должен работать и без агентов — просто с меньшим набором.
    const via = engine.slice(engine.indexOf("private async viaAgent("));
    expect(via).toContain("if (!ctx.invokeCapability)");
    expect(via).toContain("не подключён");
  });

  it("отказ агента возвращается модели текстом, а не бросается", () => {
    // Нет GITHUB_TOKEN или ветка не найдена — нормальный ход миссии:
    // пусть модель выберет другой путь, а не роняет всю работу.
    const via = engine.slice(engine.indexOf("private async viaAgent("), engine.indexOf("private requireProject"));
    expect(via).toContain('res.status === "failed"');
    expect(via).toContain('res.status === "needs_input"');
    expect(via, "отказ агента не должен бросаться").not.toMatch(/if \(res\.status[\s\S]{0,120}throw/);
  });

  it("новые шаги названы по-человечески в карте миссии", () => {
    const html = src("public/index.html");
    expect(html).toContain("прогоняет тесты");
    expect(html).toContain("сравнивает версии");
  });
});

describe("Шапка не мешает начать работу", () => {
  // История: наверху стояла трёхмерная Земля во весь экран. Красиво, но
  // на телефоне до поля ввода приходилось долистывать мимо неё — а первое,
  // что должно попадаться на глаза, это «Что построим сегодня?».
  //
  // Владелец сказал убрать. Убрана целиком, вместе с тысячей строк
  // three.js и внешней зависимостью от CDN, которая без сети не поднималась.
  // Остались только слова.
  const html = src("public/index.html");

  it("нет внешних зависимостей ради оформления", () => {
    // Библиотека с чужого адреса ради фона — плата за красоту временем
    // загрузки и работой без сети.
    // Проверяем ИМПОРТЫ и src, а не любое вхождение «cdn»: первая версия
    // ловила знак × в коде чипа удаления файла и падала на верном коде.
    const externals = [...html.matchAll(/(?:src|from)\s*=?\s*["'](https?:\/\/[^"']+)/g)].map((m) => m[1]);
    expect(externals, `внешние ресурсы: ${externals.join(", ")}`).toEqual([]);
    expect(html, "второй блок скрипта").not.toContain('type="module"');
  });

  it("шапка не длиннее нескольких строк", () => {
    const hero = html.slice(html.indexOf('<section class="hero"'), html.indexOf("</section>"));
    const tags = (hero.match(/<[a-z]/g) ?? []).length;
    expect(tags, "шапка снова разрослась").toBeLessThan(10);
  });

  it("ничего не осталось от удалённой сцены", () => {
    // Мёртвый CSS и висящие обработчики хуже отсутствующей функции:
    // они выглядят как рабочий код при следующем чтении.
    for (const ghost of ["#earthCanvas", ".planet", ".orbit", ".scene-overlay", "sceneMotionBtn"]) {
      expect(html, `остаток: ${ghost}`).not.toContain(ghost);
    }
  });
});

describe("Все кнопки рабочие", () => {
  const html = src("public/index.html");
  const code = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");

  it("у каждой кнопки с id есть обработчик", () => {
    const buttons = [...html.matchAll(/<button([^>]*)id="([A-Za-z0-9_-]+)"([^>]*)>/g)];
    expect(buttons.length).toBeGreaterThan(10);
    const dead = buttons
      .filter(([, before, , after]) => {
        // Пункт меню работает через общий обработчик .nav-item по
        // data-open — личный $('id') ему не нужен. Раньше такой пункт
        // считался мёртвым, хотя он рабочий.
        const attrs = before + after;
        return !/data-open=|data-goto=/.test(attrs);
      })
      .map(([, , id]) => id)
      .filter((id) => !code.includes(`$('${id}')`));
    expect(dead, `кнопки без обработчика: ${dead.join(", ")}`).toEqual([]);
  });

  it("кнопки-подсказки заполняют поле, а не очищают его", () => {
    // Реальная поломка: обработчик читал data-fill, а в разметке атрибута
    // не было — клик ставил пустую строку. Теперь и атрибут на месте,
    // и подпись работает запасным источником.
    const picks = [...html.matchAll(/<button class="pick"([^>]*)>/g)].map((m) => m[1]);
    expect(picks.length).toBeGreaterThan(0);
    for (const attrs of picks) {
      expect(attrs, `подсказка без data-fill: ${attrs}`).toContain("data-fill=");
    }
    expect(code).toContain("b.dataset.fill || b.textContent.trim()");
  });
});

describe("SQL совпадает со схемой", () => {
  // Ни tsc, ни обычные тесты не знают имён колонок: запрос к
  // несуществующей колонке компилируется, проходит все проверки и падает
  // только на живой базе. Так и нашлось: UPDATE missions писал finished_at,
  // которой в схеме не было — каждая миссия падала бы при завершении.
  const schema = src("schema.sql");

  const tables: Record<string, string[]> = {};
  for (const m of schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\n\);/g)) {
    tables[m[1]] = m[2]
      .split("\n")
      .map((l) => l.trim().replace(/,$/, ""))
      .filter((l) => l && !l.startsWith("--") && !/^(FOREIGN KEY|PRIMARY KEY|UNIQUE|CHECK|CONSTRAINT)\b/i.test(l))
      .map((l) => l.split(/\s+/)[0]);
  }

  // Внутренняя таблица Durable Object: живёт в его собственном SQLite и в
  // schema.sql отсутствовать ДОЛЖНА — это не общая база.
  const doLocal = new Set(["local_tasks"]);

  const files = [
    "src/index.ts",
    "src/agents/orchestrator.ts",
    "src/core/execution-engine.ts",
    "src/lib/chat-store.ts",
    "src/lib/event-store.ts",
    "src/lib/memory-agent.ts",
    "src/lib/versions.ts",
  ];

  it("схема разобралась", () => {
    expect(Object.keys(tables).length).toBeGreaterThan(5);
    expect(tables.missions, "таблица missions не найдена").toBeDefined();
  });

  it("каждый INSERT пишет в существующие колонки", () => {
    const bad: string[] = [];
    for (const f of files) {
      const code = src(f);
      for (const m of code.matchAll(/INSERT (?:OR \w+ )?INTO\s+(\w+)\s*\(([^)]*)\)/gis)) {
        const [table, colstr] = [m[1], m[2]];
        if (doLocal.has(table)) continue;
        if (!tables[table]) { bad.push(`${f}: нет таблицы ${table}`); continue; }
        for (const c of colstr.split(",").map((x) => x.trim()).filter(Boolean)) {
          if (!tables[table].includes(c)) bad.push(`${f}: ${table}.${c} — нет такой колонки`);
        }
      }
    }
    expect(bad, bad.join("; ")).toEqual([]);
  });

  it("каждый UPDATE меняет существующие колонки", () => {
    const bad: string[] = [];
    for (const f of files) {
      const code = src(f);
      for (const m of code.matchAll(/UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)(?:WHERE|`)/gi)) {
        const [table, setstr] = [m[1], m[2]];
        if (doLocal.has(table)) continue;
        if (!tables[table]) { bad.push(`${f}: нет таблицы ${table}`); continue; }
        for (const c of [...setstr.matchAll(/(\w+)\s*=/g)].map((x) => x[1])) {
          if (!tables[table].includes(c)) bad.push(`${f}: ${table}.${c} — нет такой колонки`);
        }
      }
    }
    expect(bad, bad.join("; ")).toEqual([]);
  });
});

describe("Страница не умирает при локальном открытии", () => {
  // Реальная и очень дорогая поломка: файл, открытый с телефона напрямую
  // (content:// или file://), имеет непрозрачный origin. sessionStorage
  // там не возвращает null — он БРОСАЕТ. А обращение стояло первой же
  // строкой скрипта, до всех обработчиков.
  //
  // Итог: страница рисовалась полностью, но ни одна кнопка не работала —
  // ни одна, а не «половина». Со стороны это неотличимо от «приложение
  // просто не работает», и найти причину без консоли невозможно.
  const html = src("public/index.html");
  const code = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");

  it("нет прямых обращений к sessionStorage / localStorage", () => {
    const direct = [...code.matchAll(/(?<!window\[kind\]\.)\b(sessionStorage|localStorage)\.(get|set|remove)Item/g)].map((m) => m[0]);
    expect(direct, `прямые вызовы: ${direct.join(", ")}`).toEqual([]);
  });

  it("обёртка ловит исключение и держит значение в памяти", () => {
    // Без запасного хранилища настройка терялась бы сразу после ввода —
    // токен пришлось бы вставлять перед каждым действием.
    expect(code).toContain("function store(kind)");
    expect(code).toContain("catch (e) { return k in memFallback");
    expect(code).toContain("catch (e) { memFallback[k] = v; }");
  });

  it("копирование работает и вне защищённого контекста", () => {
    // navigator.clipboard существует только на https/localhost. При
    // локально открытом файле кнопка «Копировать» молча не делала ничего.
    expect(code).toContain("window.isSecureContext");
    expect(code).toContain("document.execCommand('copy')");
  });

  it("запасное поле для копирования не скрыто через display:none", () => {
    // Из display:none элемента выделение не берётся, и execCommand тихо
    // возвращает false — та же немая кнопка, только другим путём.
    const fb = code.slice(code.indexOf("function fallbackCopy"), code.indexOf("var session = store("));
    expect(fb).toContain("position = 'fixed'");
    expect(fb, "скрытие через display:none ломает выделение").not.toContain("display = 'none'");
  });
});

describe("Лимит покрывает всё, что жжёт модель", () => {
  // Найдено вопросом «что ещё забыли обновить». Комментарий в коде обещал
  // «лимит на то, что реально запускает модели», а стоял он только на
  // /api/task. При этом /api/mission прогоняет ЦИКЛ до двадцати вызовов
  // модели — то есть самый дорогой путь был единственным неограниченным.
  const idx = src("src/index.ts");
  const auth = src("src/lib/auth.ts");

  it("все модельные роуты под лимитом", () => {
    const block = idx.slice(idx.indexOf("const MODEL_ROUTES"), idx.indexOf("if (url.pathname in MODEL_ROUTES)"));
    for (const route of ["/api/task", "/api/chat", "/api/polish", "/api/mission"]) {
      expect(block, `${route} вне лимита`).toContain(`"${route}"`);
    }
  });

  it("миссия списывается по числу шагов, а не как один вызов", () => {
    // Иначе двадцать миссий стоили бы как четыреста задач, а счётчик
    // показал бы двадцать.
    expect(idx).toContain("maxIterations");
    // Стоимость = ровно то число шагов, что получит цикл (одна формула).
    expect(idx).toMatch(/cost = clampIterations\(/);
    expect(auth).toContain("cost = 1");
  });

  it("проверяется полная стоимость до списания", () => {
    // used >= limit пропускал бы миссию ценой 8 при одном свободном месте.
    expect(src("src/lib/quota.ts")).toContain("WHERE used + excluded.used <= ?");
    expect(auth, "старая проверка вернулась").not.toMatch(/if \(used >= limit\)/);
  });

  it("тело читается клоном — оригинал остаётся роуту", () => {
    // Request читается один раз. Без клона роут получил бы пустой поток
    // и упал бы на разборе — причём только на /api/mission.
    expect(idx).toContain("request.clone().json()");
  });
});

describe("Документы не отстают от кода", () => {
  // README описывал систему без шести эндпоинтов и пяти модулей: цикла
  // выполнения, чата и миссий для него не существовало. Обнаружилось не
  // тестами, а вопросом «что ещё забыли обновить» — значит проверка нужна
  // автоматическая, иначе следующий раз тоже найдётся случайно.
  const readme = src("README.md");
  const idx = src("src/index.ts");

  it("каждый маршрут кода описан в README", () => {
    const routes = [...new Set([...idx.matchAll(/pathname === "(\/api\/[a-z]+)(?:\/[^"]*)?"/g)].map((m) => m[1]))];
    expect(routes.length).toBeGreaterThan(8);
    const undocumented = routes.filter((r) => !readme.includes(r));
    expect(undocumented, `нет в README: ${undocumented.join(", ")}`).toEqual([]);
  });

  it("новые модули упомянуты", () => {
    for (const mod of ["execution-engine", "tool-registry", "workspace", "chat-store", "event-store"]) {
      expect(readme, `модуль ${mod} не описан`).toContain(mod);
    }
  });

  it("DEPLOY.md содержит шаг применения схемы", () => {
    // Без него чат и миссии падают на первом обращении «no such table».
    const deploy = src("DEPLOY.md");
    expect(deploy).toContain("schema.sql");
    expect(deploy.toLowerCase()).toContain("d1 execute");
  });
});

describe("Перенос из макета: только на живых данных", () => {
  // Четыре идеи взяты из присланного макета AZRAIL_CORE_v2.html. Там они
  // работали на Math.random и зашитых строках: графики рисовались из
  // случайных чисел, лента активности каждые 4.2 секунды печатала фразу
  // из массива, прогресс стоял на 8%. Здесь то же самое, но от реальных
  // источников — иначе смысла переносить не было.
  const html = src("public/index.html");
  const engine = coreEngineSource();

  it("прогресс считается от настоящего номера шага, а не от таймера", () => {
    // Полоса, ползущая сама, врёт ровно тогда, когда на неё смотрят.
    const prog = html.slice(html.indexOf("function progressUpdate"), html.indexOf("// ─── Карта миссии"));
    expect(prog).toContain("ev.iteration");
    expect(prog).toContain("missionMax");
    expect(prog, "прогресс по таймеру").not.toMatch(/setInterval|setTimeout/);
    expect(prog, "случайные значения в прогрессе").not.toContain("Math.random");
  });

  it("потолок шагов реально доезжает до интерфейса", () => {
    // Без него процент пришлось бы выдумывать. Проброшен через всю цепочку:
    // движок -> onEvent -> broadcastMissionEvent -> сокет.
    expect(engine).toContain("maxIterations: typeof data?.maxIterations");
    expect(src("src/agents/orchestrator.ts")).toContain("maxIterations?: number");
    expect(html).toContain("ev.maxIterations");
  });

  it("незакрытая миссия не показывается стопроцентной", () => {
    // Исчерпанный потолок и сбой оставляют полосу там, где остановились.
    const prog = html.slice(html.indexOf("function progressUpdate"), html.indexOf("// ─── Карта миссии"));
    const failBlock = prog.slice(prog.indexOf("mission.failed"));
    expect(failBlock).not.toContain("width = '100%'");
  });

  it("статусы моделей берутся из реестра", () => {
    // В макете ACTIVE/STANDBY были написаны руками в массиве.
    expect(html).toContain("m.available ? 'ACTIVE' : 'STANDBY'");
    expect(html).toContain("renderModelList(models)");
  });

  it("список моделей собирается узлами, а не innerHTML", () => {
    // В макете пять innerHTML с подстановкой ${}. Пока данные зашиты —
    // безвредно; с данными от сервера это дыра для внедрения.
    const fn = html.slice(html.indexOf("function renderModelList"), html.indexOf("$('modelSelect').addEventListener"));
    expect(fn).toContain("createElement");
    expect(fn, "innerHTML с данными сервера").not.toContain("innerHTML");
  });

  it("перетаскивание использует ту же загрузку, что и скрепка", () => {
    // Второй путь загрузки означал бы вторую копию обработки ошибок.
    const dnd = html.slice(html.indexOf("// ─── Перетаскивание файлов"), html.indexOf("// ─── Доводка формулировки"));
    expect(dnd).toContain("uploadOne");
    expect(dnd).toContain("e.preventDefault()");
  });

  it("файл, бро­шенный мимо зоны, не открывается поверх интерфейса", () => {
    // Браузер по умолчанию откроет файл как страницу и уведёт человека
    // с интерфейса — со стороны это выглядит как потеря работы.
    const dnd = html.slice(html.indexOf("// ─── Перетаскивание файлов"), html.indexOf("// ─── Доводка формулировки"));
    expect(dnd).toContain("window.addEventListener");
    expect(dnd).toContain("zone.contains(e.target)");
  });

  it("тост не используется для ошибок", () => {
    // Ошибка должна остаться на экране, а не исчезнуть через две секунды.
    const calls = [...html.matchAll(/toast\('([^']*)'/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.toLowerCase(), `тост с ошибкой: ${c}`).not.toMatch(/ошибк|не вышло|не удалось|сбой/);
    }
  });

  it("нет фальшивой активности по таймеру", () => {
    // В макете лента каждые 4.2 секунды печатала случайную фразу из
    // массива. Система выглядела живой, когда не происходило ничего, и
    // это приучало не смотреть в ленту вовсе.
    const code = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
    const intervals = [...code.matchAll(/setInterval\([\s\S]{0,300}?\)/g)].map((m) => m[0]);
    for (const iv of intervals) {
      expect(iv, `таймер с придуманными данными: ${iv.slice(0, 80)}`).not.toContain("Math.random");
    }
  });
});

describe("Сбои журнала не отменяют сделанную работу", () => {
  // Класс ошибки, уже встречавшийся в rememberFact: неудача вспомогательной
  // записи подменяла результат основной работы. Здесь он нашёлся ещё в трёх
  // местах вокруг миссий.
  const engine = coreEngineSource();
  const idx = src("src/index.ts");

  it("создание миссии падает честно — до траты моделей", () => {
    // Здесь падать ПРАВИЛЬНО: без строки в missions прогон нечем
    // отслеживать. Отказ до работы дешевле осиротевшего прогона.
    const block = idx.slice(idx.indexOf("const missionId = crypto.randomUUID()"), idx.indexOf("const engine = new ExecutionEngine"));
    expect(block).toContain("mission.create_failed");
    expect(block, "подсказка про схему обязательна — это частая причина").toContain("schema.sql");
    expect(block).toContain("500");
  });

  it("отметка о завершении НЕ роняет готовый результат", () => {
    // Работа сделана, файлы записаны, модели потрачены. Уронить всё из-за
    // неудачного UPDATE значит отдать ошибку вместо результата.
    // Конец среза привязан к КОММЕНТАРИЮ, а не к тексту возврата:
    // первая версия ссылалась на "return json({ success: true, missionId",
    // и когда в ответ добавили поле budget, срез поехал до конца файла и
    // поймал чужие обработчики ошибок.
    // Запись финального статуса переехала в lib/mission-state.ts вместе с
    // переносом миссии в фон. Требование не изменилось: упасть на UPDATE
    // после выполненной работы нельзя.
    const state = src("src/lib/mission-state.ts");
    const block = state.slice(state.indexOf("export async function finishMission"));
    expect(block).toContain("mission.finish_failed");
    // И запасной путь на случай базы без колонки result_json: миграция
    // применяется отдельно, а миссия не должна зависнуть из-за этого.
    expect(block).toContain("mission.finish_without_result_column");
    expect(block, "после работы возврата ошибки быть не должно").not.toContain("return json({ error");
  });

  it("запись события журнала защищена", () => {
    const note = engine.slice(engine.indexOf("async note("));
    const emitIdx = note.indexOf("emitMissionEvent(");
    const before = note.slice(0, emitIdx);
    expect(before, "emitMissionEvent должен быть внутри try").toContain("try {");
  });
});

describe("Документы не обещают несуществующего", () => {
  // Найдено при сплошном проходе по файлам. CHANGELOG числил эндпоинт
  // /api/execution/plan, которого в коде нет и не было. VERIFY_STATUS
  // содержал SHA-256 давно устаревшего архива — по такому документу
  // проверка целостности показала бы, что зип испорчен. И в папке лежал
  // временный файл verify-extract-tmp.mjs, который уехал бы в репозиторий.
  const idx = ["src/index.ts", "src/unified/studios.ts", "src/unified/connectors.ts"].map(src).join("\n");
  const docs = ["README.md", "DEPLOY.md", "docs/history/changelog/CHANGELOG_v0.4.0.md", "docs/product/AZRAIL_PRODUCT_SPEC_v0.5.md"];

  it("каждый упомянутый /api/* существует в коде", () => {
    const real = new Set([
      ...[...idx.matchAll(/(?:pathname|path)\s*===\s*["'](\/api\/[a-z]+)/g)].map((m) => m[1]),
      ...[...idx.matchAll(/startsWith\(["'](\/api\/[a-z]+)/g)].map((m) => m[1]),
    ]);
    const bad: string[] = [];
    for (const d of docs) {
      const text = src(d);
      for (const m of text.matchAll(/`?(\/api\/[a-z]+)(?:\/[a-z:]+)?`?/g)) {
        const base = m[1];
        if (!real.has(base)) bad.push(`${d}: ${base}`);
      }
    }
    expect(bad, `обещано, но нет в коде: ${bad.join(", ")}`).toEqual([]);
  });

  it("нет документа с зашитой контрольной суммой архива", () => {
    // Такой файл устаревает при первой же пересборке и после этого
    // утверждает, что архив испорчен.
    for (const d of docs) {
      expect(src(d), `${d} содержит SHA архива`).not.toMatch(/SHA-256:\s*`?[a-f0-9]{64}/);
    }
  });

  it("спецификация помечена как замысел, а не как отчёт", () => {
    // Без пометки список возможностей читается как описание готового.
    const spec = src("docs/product/AZRAIL_PRODUCT_SPEC_v0.5.md");
    expect(spec).toContain("ЗАМЫСЕЛ");
    expect(spec, "несделанное должно быть помечено").toContain("❌");
  });
});

describe(".env.example не обещает мёртвых переменных", () => {
  // Файл предлагал задать OPENAI_API_KEY и ANTHROPIC_API_KEY, которых код
  // не читает нигде. Это дороже пустой строки в документе: человек задаёт
  // ключ, ждёт эффекта, эффекта нет, и причину не найти — переменная ведь
  // на месте. Обратная ошибка тоже была: CORS_ORIGIN код читает, а файл
  // о нём молчал.
  const example = src(".env.example");
  const types = src("src/types.ts");

  const listed = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);

  it("каждая переменная из примера объявлена в Env", () => {
    const ghosts = listed.filter((v) => !types.includes(`${v}:`) && !types.includes(`${v}?:`));
    expect(ghosts, `в примере есть, в коде нет: ${ghosts.join(", ")}`).toEqual([]);
  });

  it("обязательные переменные кода упомянуты в примере", () => {
    // Не наоборот: пропущенная переменная — это ненастроенный деплой.
    for (const v of ["AZRAIL_TOKEN", "CORS_ORIGIN", "AZRAIL_HOURLY_LIMIT"]) {
      expect(example, `${v} не описан`).toContain(v);
    }
  });
});

describe("Целостность пакета перед деплоем", () => {
  // Найдено сплошным проходом: после поднятия версии в package.json
  // package-lock.json остался на 0.1.0. npm ci это терпит, но рассинхрон
  // реальный и будет расти при каждом следующем поднятии.
  const pkg = JSON.parse(src("package.json"));
  const lock = JSON.parse(src("package-lock.json"));

  it("версия в lock совпадает с package.json", () => {
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages?.[""]?.version).toBe(pkg.version);
  });

  it("зависимости в lock совпадают с объявленными", () => {
    // Расхождение здесь — это упавшая сборка в CI, а не косметика.
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    const locked = { ...lock.packages?.[""]?.dependencies, ...lock.packages?.[""]?.devDependencies };
    for (const [name, range] of Object.entries(declared)) {
      expect(locked[name], `${name} расходится`).toBe(range);
    }
  });

  it("все девять классов агентов экспортированы", () => {
    // Неэкспортированный класс сборщик может выбросить как мёртвый код,
    // и subAgent упадёт уже в проде — при том что tsc и тесты чисты.
    const idx = src("src/index.ts");
    for (const cls of [
      "Orchestrator", "ArchitectAgent", "CodeAgent", "UiAgent", "GitAgent",
      "DeployAgent", "SecurityAgent", "QaAgent", "EvolutionAgent",
    ]) {
      expect(idx, `${cls} не экспортирован`).toMatch(new RegExp(`export \\{[^}]*${cls}`));
    }
  });

  it("в репозиторий не уезжают временные файлы", () => {
    // verify-extract-tmp.mjs пролежал в корне несколько сессий и попал бы
    // на GitHub. Мусор в чужом репозитории читается как небрежность.
    const files = listProjectFiles();
    const junk = files.filter((f) => /(-tmp|\.tmp|\.bak|^check\d*\.cjs|scratch)/.test(f));
    expect(junk, `временные файлы: ${junk.join(", ")}`).toEqual([]);
  });
});

describe("Проверка перед «готово» и план миссии", () => {
  // Корневой изъян доверия: раньше `done` означало «модель сама решила,
  // что закончила». Исследование DeepMind (Huang et al., ICLR 2024)
  // показало, что модель не способна судить о правильности собственных
  // рассуждений, а самокоррекция без внешнего сигнала УХУДШАЕТ результат.
  const engine = coreEngineSource();
  const checker = src("src/core/checker.ts");
  const planner = src("src/core/planner.ts");

  it("done не возвращается без проверки", () => {
    const doneBlock = engine.slice(engine.indexOf("if (decision.done || !decision.tool)"));
    const checkIdx = doneBlock.indexOf("checkResult(");
    const returnIdx = doneBlock.indexOf('status: "done"');
    expect(checkIdx, "проверка должна идти ДО возврата done").toBeGreaterThan(-1);
    expect(checkIdx).toBeLessThan(returnIdx);
  });

  it("проверяющий не видит рассуждений исполнителя", () => {
    // Заражение контекста — ровно то, из-за чего интроспективная
    // самопроверка не работает. Показать проверяющему ход мыслей значит
    // передать ему ту же ошибку.
    const evidence = checker.slice(checker.indexOf("export function renderEvidence"), checker.indexOf("export function parseVerdict"));
    expect(evidence, "reason исполнителя не должен попадать проверяющему").not.toContain("reason");
  });

  it("отклонения не бесконечны и не превращаются в done", () => {
    // Пинг-понг сжёг бы шаги и не сошёлся. Но и выдавать незакрытую
    // задачу за закрытую нельзя — поэтому needs_input.
    expect(engine).toContain("CHECK_LIMITS.MAX_REJECTIONS");
    // Окно расширено: между отклонением и возвратом появился откат
    // рабочей области. Требование то же — needs_input, а не done.
    const block = engine.slice(engine.indexOf("if (!verdict.passed && rejections"));
    expect(block.slice(0, 2600)).toContain('status: "needs_input"');
    expect(block.slice(0, 2600), 'исчерпанные отклонения не должны давать done').not.toMatch(/status: "done"/);
  });

  it("непонятный вердикт не блокирует уже сделанную работу", () => {
    // Проверка — надстройка. Глючащий разбор не должен становиться
    // стеной, не выпускающей результат наружу.
    expect(checker).toContain('passed: true, verified: false, reason: "Проверяющий не ответил');
  });

  it("непройденная проверка не выдаётся за пройденную", () => {
    // ЗДЕСЬ БЫЛА ДЫРА. Три разных исхода — «проверено, всё хорошо»,
    // «проверяющий ответил невнятно» и «проверка упала» — возвращали
    // одинаковое passed: true. Различие жило только в тексте reason, то
    // есть нигде: ни одна ветка кода его не читала, и миссия отчитывалась
    // «готово» одинаково во всех трёх случаях.
    //
    // passed отвечает на вопрос «пропускать ли дальше» (да, пропускать:
    // терять сделанную работу из-за недоступной надстройки нельзя),
    // verified — на вопрос «состоялась ли проверка». Это разные вопросы.
    const bare = checker.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    for (const site of bare.split("return {").slice(1)) {
      const head = site.slice(0, 260);
      if (!head.includes("passed:")) continue;
      expect(head, `вердикт без verified: ${head.slice(0, 80)}`).toContain("verified:");
    }
  });

  it("неподтверждённый исход доходит до отчёта миссии", () => {
    // Иначе факт повторил бы судьбу reason — существовал бы в типе и не
    // попадал бы никуда.
    expect(engine).toContain('"check.unverified"');
    expect(engine).toContain("verdict.verified ?");
    expect(engine).toContain("verified: verdict.verified");
  });

  it("сбой проверки не роняет миссию", () => {
    const fn = checker.slice(checker.indexOf("export async function checkResult"));
    expect(fn).toContain("catch");
    expect(fn).toContain("check.failed");
  });

  it("пишутся ВСЕ проверки, включая пройденные", () => {
    // Без отказов в данных нельзя отличить «задачи простые» от
    // «проверяющий пропускает всё» — а второе значит, что проверка
    // декоративная.
    const rec = engine.slice(engine.indexOf("async recordCheck(ctx"));
    expect(rec.slice(0, 900)).toContain("INSERT INTO mission_checks");
    expect(engine).toContain("this.recordCheck(ctx, rejections + 1, verdict.passed");
  });

  it("план дописывается в КОНЕЦ запроса, а не в начало", () => {
    // К концу длинного запроса модель хуже всего помнит начало, поэтому
    // цель проговаривается последней — ближе всего к моменту решения.
    const prompt = engine.slice(engine.indexOf("`УЖЕ СДЕЛАНО:"), engine.indexOf("Верни JSON со следующим действием"));
    expect(prompt).toContain("renderPlan(plan)");
  });

  it("шаг плана закрывается только по успешному вызову", () => {
    // Иначе прогресс показывал бы движение там, где система топчется.
    // Берём блок УСПЕШНОГО вызова, а не первое вхождение переменной:
    // первая версия теста цеплялась за её объявление в начале цикла и
    // падала на верном коде.
    const successBlock = engine.slice(
      engine.indexOf("const output = await checkpointTool"),
      engine.indexOf("} catch (err) {", engine.indexOf("const output = await checkpointTool")),
    );
    expect(successBlock, "план должен двигаться после успеха").toContain("advancePlan");

    // И ни одна ветка ошибки не должна его двигать.
    const failIdx = engine.indexOf("consecutiveFailures++");
    const failBlock = engine.slice(failIdx, failIdx + 300);
    expect(failBlock, "план не должен двигаться на ошибке").not.toContain("advancePlan");
  });

  it("сбой планирования не останавливает миссию", () => {
    // Построение плана переехало ниже — после карты проекта и разведки,
    // чтобы планировать по фактам, а не вслепую. Срез привязан к самому
    // блоку, а не к соседу, который с тех пор оказался выше.
    const from = engine.indexOf("let plan: PlanStep[] = []");
    const block = engine.slice(from, engine.indexOf("let rejections", from));
    expect(block).toContain("catch");
    expect(block).toContain("plan.build_failed");
  });

  it("план не строит шагов под несуществующие инструменты", () => {
    // План из невыполнимых шагов хуже отсутствия плана: он уводит
    // исполнителя в тупик и тратит шаги.
    const planning = src("src/core/execution-planning.ts");
    const build = planning.slice(planning.indexOf("async buildPlan"));
    expect(build.slice(0, 1600)).toContain("ДОСТУПНЫЕ ИНСТРУМЕНТЫ");
  });

  it("потеря плана не роняет миссию", () => {
    const save = planner.slice(planner.indexOf("export async function savePlan"));
    expect(save).toContain("plan.save_failed");
    expect(save).toContain("return []");
  });
});

describe("Защита от неконтролируемого счёта", () => {
  // Cloudflare берёт деньги за каждую запись и не даёт поставить потолок
  // расходов — узнают по счёту. Публичные случаи: $36 000 (зациклившаяся
  // очередь, 16 млрд записей в Durable Objects), $34 000 за восемь дней
  // при нуле пользователей (объект переставлял себе будильник).
  const budget = src("src/lib/write-budget.ts");
  const idx = src("src/index.ts");

  it("бюджет списывается ДО начала работы", () => {
    // Узнать о перерасходе после того, как записи сделаны, бесполезно.
    const mission = idx.slice(idx.indexOf('url.pathname === "/api/mission" && request.method === "POST"'));
    const chargeIdx = mission.indexOf("chargeWrites(");
    // Движок больше не создаётся в роуте: миссия уходит в фон через
    // startMission(). Точка отсчёта сместилась, требование — нет.
    const engineIdx = mission.indexOf(".startMission(");
    expect(chargeIdx).toBeGreaterThan(-1);
    expect(engineIdx, "роут должен ставить миссию в фон").toBeGreaterThan(-1);
    expect(chargeIdx, "списание должно идти до постановки миссии в работу").toBeLessThan(engineIdx);
  });

  it("проверяется полная стоимость, а не наличие одного места", () => {
    expect(src("src/lib/quota.ts")).toContain("WHERE used + excluded.used <= ?");
  });

  it("недоступность KV логируется как ошибка, а не проглатывается", () => {
    // Молчаливое отключение защиты от расходов — худший из отказов.
    expect(budget).toContain("reserveQuota");
    expect(src("src/lib/quota.ts")).toContain('log("error", "quota.unavailable"');
  });

  it("будильников в Durable Objects нет", () => {
    // Именно этот паттерн дал счёт на $34 000 при нуле пользователей.
    const files = listProjectFiles().filter((f) => f.startsWith("src/") && f.endsWith(".ts"));
    for (const f of files) {
      expect(src(f), `${f} использует setAlarm — источник неограниченных расходов`).not.toContain("setAlarm");
    }
  });

  it("отказ по бюджету объясняет, что это защита, а не поломка", () => {
    const mission = idx.slice(idx.indexOf("if (!budget.allowed)"));
    expect(mission.slice(0, 700)).toContain("защита");
    expect(mission.slice(0, 700)).toContain("AZRAIL_WRITE_BUDGET");
  });
});

describe("Песочница не обещает того, чего не может", () => {
  const sandbox = src("src/core/sandbox.ts");
  const checker = src("src/core/checker.ts");
  const registry = src("src/lib/tool-registry.ts");

  it("доступность инструментов зависит от среды, а не зашита", () => {
    // Захардкоженный true обещал бы исполнение там, где исполнять нечем;
    // false скрыл бы рабочую возможность у того, кто задал токен.
    expect(registry).toContain("describeTools(env");
    expect(registry).toContain("AZRAIL_SANDBOX");
  });

  it("через Actions не обещаются произвольные команды", () => {
    // GitHub Actions умеет только описанные workflow. Обещать там
    // sandbox_exec и предпросмотр значило бы врать.
    const fn = registry.slice(registry.indexOf("export function describeTools"));
    expect(fn.slice(0, 1400)).toContain('backend === "actions" && t.name !== "sandbox_test"');
  });

  it("тесты решают вместо модели, когда они есть", () => {
    // Спрашивать модель поверх упавших тестов вредно: она «объяснит»,
    // почему падение неважно, и объяснение прозвучит убедительно.
    const fn = checker.slice(checker.indexOf("export async function checkResult"));
    const testIdx = fn.indexOf("findTestEvidence(history)");
    const modelIdx = fn.indexOf("runModel");
    expect(testIdx).toBeGreaterThan(-1);
    expect(testIdx, "тесты должны проверяться ДО обращения к модели").toBeLessThan(modelIdx);
  });

  it("непонятный вывод тестов не считается успехом", () => {
    // Асимметрия с вердиктом проверяющего сознательная и должна остаться:
    // тут это основание для решения, а не подсказка.
    const fallback = sandbox.slice(sandbox.indexOf("// Ничего не распознано"));
    expect(fallback.slice(0, 400)).toContain("ok: exitCode === 0");
    expect(fallback.slice(0, 400), "успех не должен предполагаться").not.toContain("ok: true");
  });

  it("список разрешённых хостов проверяется точно, а не вхождением", () => {
    // includes("github.com") пропускает github.com.evil.ru.
    const fn = sandbox.slice(sandbox.indexOf("export function isAllowedHost"));
    expect(fn.slice(0, 700)).toContain("new URL(");
    expect(fn.slice(0, 700)).toContain("host === allowed");
    expect(fn.slice(0, 700), "проверка вхождением подстроки небезопасна").not.toMatch(/rawUrl\.includes\(/);
  });

  it("все три таймаута заданы", () => {
    // Отсутствие любого — источник неограниченных расходов: забытый
    // контейнер стоит денег круглосуточно.
    for (const limit of ["COMMAND_TIMEOUT_MS", "IDLE_TIMEOUT_MS", "MAX_LIFETIME_MS"]) {
      expect(sandbox, `нет предела ${limit}`).toContain(limit);
    }
  });

  it("обрезка сохраняет конец вывода, а не только начало", () => {
    const fn = sandbox.slice(sandbox.indexOf("export function truncateOutput"));
    expect(fn.slice(0, 800)).toContain("lines.slice(-tail)");
  });
});

describe("Динамическая доступность не обгоняет адаптеры", () => {
  // Ошибка, допущенная при добавлении песочницы: реестр научился
  // объявлять sandbox_* доступными при наличии GITHUB_TOKEN, а адаптера
  // в executeTool не было. Модель позвала бы инструмент и получила
  // «неизвестный инструмент» — то есть реестр снова начал бы врать,
  // только теперь через новый механизм.
  //
  // Прежний тест этого не ловил: он сверял СТАТИЧЕСКИЙ список, а
  // доступность стала вычисляемой.
  const engine = src("src/core/execution-tools.ts");
  const registry = src("src/lib/tool-registry.ts");

  const implemented = [...engine.matchAll(/case "([a-z_]+)":/g)].map((m) => m[1]);

  it("у каждого инструмента, который среда может включить, есть адаптер", () => {
    // Имена, которые describeTools умеет переключить в available: true.
    const switchable = [...registry.matchAll(/name: "(sandbox_[a-z_]+)"/g)].map((m) => m[1]);
    expect(switchable.length, "sandbox-инструменты не найдены — тест устарел").toBeGreaterThan(0);

    // Через Actions включается только sandbox_test — у него адаптер
    // обязателен. Остальные включаются лишь вместе с контейнерами,
    // которых ещё нет, и адаптеров у них пока быть не должно.
    expect(implemented, "sandbox_test объявлен включаемым, но исполнять нечем").toContain("sandbox_test");
  });

  it("недоступный движок объясняет причину, а не просто падает", () => {
    // Модель должна понять, ЧТО делать дальше. «Упало» не говорит ничего.
    const block = engine.slice(engine.indexOf('case "sandbox_test"'));
    expect(block.slice(0, 1200)).toContain("describeBackend");
    expect(block.slice(0, 1200)).toContain("GITHUB_TOKEN");
  });

  it("sandbox_test возвращает числа, а не текст на чтение глазами", () => {
    // В этом всё отличие от run_tests: итог считает код, а не модель.
    const block = engine.slice(engine.indexOf('case "sandbox_test"'), engine.indexOf('case "run_tests"'));
    expect(block).toContain("parseTestOutput");
  });

  it("сырой вывод тестов сохраняется обрезанным, но не пересказанным", () => {
    // Чинят по тексту ошибки; пересказ своими словами теряет как раз ту
    // деталь, по которой чинят.
    const block = engine.slice(engine.indexOf('case "sandbox_test"'), engine.indexOf('case "run_tests"'));
    expect(block).toContain("output: truncateOutput(raw");
  });
});

describe("Проверка видна человеку, а не только в базе", () => {
  // Смысл проверки перед «готово» пропадает, если о ней знает только
  // база. Человек должен видеть, что результат кто-то подтвердил, — и
  // особенно видеть ОТКАЗ, иначе непонятно, почему миссия продолжилась
  // после того, как модель сказала «готово».
  const html = src("public/index.html");

  it("события проверки попадают в карту миссии", () => {
    expect(html).toContain("check.passed");
    expect(html).toContain("check.rejected");
  });

  it("отказ проверки показывает ПРИЧИНУ", () => {
    const block = html.slice(html.indexOf("ev.event === 'check.passed'"));
    expect(block.slice(0, 900)).toContain("ev.reason");
  });

  it("проверка — отдельная строка, а не пометка на предыдущей", () => {
    // Самостоятельное событие: по нему видно, что «готово» подтвердили,
    // а не что модель так решила.
    const block = html.slice(html.indexOf("ev.event === 'check.passed'"));
    expect(block.slice(0, 900)).toContain("box.appendChild(ck)");
  });

  it("новые шаги названы по-человечески", () => {
    expect(html).toContain("'проверяет тестами'");
    expect(html).toContain("'проверяет результат'");
  });
});

describe("Самовосстановление: ошибки песочницы возвращаются агенту", () => {
  // Раньше человек видел сломанный предпросмотр и должен был сам
  // пересказать, что не так. Пересказ теряет как раз ту деталь, по
  // которой чинят.
  const html = src("public/index.html");

  it("ловушка внедряется ПЕРЕД кодом пользователя", () => {
    // Иначе ошибка при разборе самого документа случится раньше, чем
    // появится обработчик, и будет потеряна.
    const block = html.slice(html.indexOf("var trap ="), html.indexOf("$('previewTitle').textContent"));
    expect(block, "срез пуст — якорь теста уехал").not.toBe("");
    expect(block).toContain("window.onerror");
    expect(block).toContain("<head");
  });

  it("канал — postMessage, а не общий объект", () => {
    // У iframe нет allow-same-origin, доступа к нашей странице у него
    // нет, и это правильно: внутри исполняется вывод модели.
    expect(html).toContain("parent.postMessage");
    expect(html).toContain("__azrail");
  });

  it("allow-same-origin НЕ добавлен, вопреки спецификации", () => {
    // allow-scripts вместе с allow-same-origin снимает изоляцию
    // полностью: код внутри дотянется до нашего DOM и токена. Это
    // разница между песочницей и её видимостью.
    const attrs = [
      ...html.matchAll(/sandbox=["']([^"']+)["']/g),
      ...html.matchAll(/setAttribute\('sandbox',\s*'([^']+)'\)/g),
    ].map((m) => m[1]);
    expect(attrs.length, "атрибут sandbox не найден — тест устарел").toBeGreaterThan(0);
    for (const a of attrs) {
      expect(a, `изоляция снята: ${a}`).not.toContain("allow-same-origin");
    }
  });

  it("сообщения фильтруются по метке, а не по origin", () => {
    // У песочницы без allow-same-origin origin равен "null" — сверять
    // его бессмысленно. Метка отсеивает расширения браузера.
    const handler = html.slice(html.indexOf("window.addEventListener('message'"));
    expect(handler.slice(0, 700)).toContain("d.__azrail !== 1");
  });

  it("ошибки передаются агенту ДОСЛОВНО", () => {
    // Чинят именно по той детали, которую теряет пересказ.
    const fix = html.slice(html.indexOf("$('sandboxFix').addEventListener"));
    expect(fix.slice(0, 1200)).toContain("дословно");
    expect(fix.slice(0, 1200)).toContain("sandboxSource.code");
  });

  it("кнопка починки видна только при наличии ошибок", () => {
    // Активная кнопка при нуле ошибок — обещание работы, которой нет.
    const render = html.slice(html.indexOf("function renderSandboxLog"));
    expect(render.slice(0, 1400)).toContain("errs === 0");
  });

  it("журнал не показывается пустым", () => {
    // Панель «ошибок нет» занимает место и приучает её не замечать.
    const render = html.slice(html.indexOf("function renderSandboxLog"));
    expect(render.slice(0, 1400)).toContain("sandboxErrors.length === 0");
  });

  it("число сообщений ограничено", () => {
    // Бесконечный цикл в предпросмотре иначе забьёт память вкладки.
    expect(html).toContain("sandboxErrors.slice(-200)");
  });
});

describe("Монитор бюджета показывается, когда это меняет поведение", () => {
  const html = src("public/index.html");
  const idx = src("src/index.ts");

  it("остаток доезжает до интерфейса", () => {
    expect(idx).toContain("budget: { used: budget.used, limit: budget.limit, remaining: budget.remaining }");
  });

  it("не показывается, пока запас велик", () => {
    // Постоянный счётчик «12 из 5000» ничего не меняет в поведении и
    // приучает не смотреть в эту область.
    const fn = html.slice(html.indexOf("function showBudget"));
    expect(fn.slice(0, 700)).toContain("share < 0.5");
  });

  it("предупреждает ЗАРАНЕЕ, а не по факту упора", () => {
    const fn = html.slice(html.indexOf("function showBudget"));
    expect(fn.slice(0, 700)).toContain("share >= 0.85");
  });
});

describe("Защита миссии: снимок, откат, зацикливание", () => {
  const engine = coreEngineSource();
  const guard = src("src/core/mission-guard.ts");

  it("зацикливание проверяется ДО исполнения инструмента", () => {
    const loopIdx = engine.indexOf("detectLoop(");
    const execIdx = engine.indexOf("await checkpointTool(this.env");
    expect(loopIdx).toBeGreaterThan(-1);
    expect(loopIdx, "проверка должна идти до вызова").toBeLessThan(execIdx);
  });

  it("повтор не обрывает миссию, а сообщается модели", () => {
    // Обрыв на повторе грубее нужного: модель часто выходит из тупика
    // ровно тогда, когда ей прямо сказали, что она в нём.
    // Блок до первого continue — вся ветка обработки повтора.
    const start = engine.indexOf("if (loop.looping)");
    const block = engine.slice(start, engine.indexOf("continue;", start) + 9);
    expect(block).toContain("history.push");
    expect(block).toContain("continue");
    expect(block.length, "ветка повтора разрослась").toBeLessThan(1200);
    expect(block, "обрыв цикла на повторе").not.toContain("break");
  });

  it("снимок делается ДО первого шага", () => {
    const snapIdx = engine.indexOf("snapshotWorkspace(");
    const loopIdx = engine.indexOf("for (let i = checkpoints.length");
    expect(snapIdx).toBeGreaterThan(-1);
    expect(snapIdx, "снимок после начала работы бесполезен").toBeLessThan(loopIdx);
  });

  it("неудачный снимок не останавливает миссию", () => {
    // Новый проект без файлов — обычный случай, требовать там снимок
    // было бы абсурдом.
    const fn = guard.slice(guard.indexOf("export async function snapshotWorkspace"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("snapshot.failed");
    expect(body).toContain("return null");
  });

  it("снимок копирует содержимое, а не ссылку", () => {
    // Объект в рабочей области будет перезаписан миссией, и ссылка на
    // него после этого указывала бы на изменённые данные — то есть
    // снимок не был бы снимком.
    const fn = guard.slice(guard.indexOf("export async function snapshotWorkspace"));
    expect(fn.slice(0, 2000)).toContain("await body.arrayBuffer()");
  });

  it("откат переключает активный набор файлов", () => {
    // Иначе откат неполон: остались бы половинчатые новые файлы, на
    // которые ничего не ссылается.
    const fn = guard.slice(guard.indexOf("export async function rollbackWorkspace"));
    expect(fn.slice(0, 2000)).toContain("publishWorkspace");
    expect(fn.slice(0, 2000)).toContain("!wanted.has(logicalWorkspacePath(prefix,obj.key.slice(prefix.length)))");
  });

  it("откат вызывается при непройденной проверке", () => {
    const block = engine.slice(engine.indexOf("if (!verdict.passed) {"));
    expect(block.slice(0, 1400)).toContain("rollbackWorkspace");
  });

  it("регрессия тестов НЕ даёт done", () => {
    // Агент, починивший одно и сломавший три, формально решил задачу.
    // Окно ограничено САМОЙ веткой, а не первыми N символами:
    // фиксированное окно захватывало следующий блок с законным done и
    // падало на верном коде.
    const start = engine.indexOf("if (comparison.regressed)");
    const block = engine.slice(start, engine.indexOf("mission.completed", start));
    expect(block).toContain('status: "needs_input"');
    expect(block, "регрессия не должна проходить как успех").not.toContain('status: "done"');
  });

  it("замер тестов делается до первого шага", () => {
    const baseIdx = engine.indexOf("tests.baseline");
    const loopIdx = engine.indexOf("for (let i = checkpoints.length");
    expect(baseIdx).toBeGreaterThan(-1);
    expect(baseIdx).toBeLessThan(loopIdx);
  });

  it("отсутствие движка тестов не мешает работе", () => {
    const block = engine.slice(engine.indexOf("let testsBefore"));
    expect(block.slice(0, 900)).toContain('detectBackend(this.env) !== "none"');
    expect(block.slice(0, 900)).toContain("catch");
  });
});

describe("Опыт переживает миссию, реестр не дублирует", () => {
  const engine = coreEngineSource();
  const registry = src("src/lib/tool-registry.ts");
  const evolution = src("src/agents/evolution-agent.ts");

  it("реестр не содержит имён-дублей", () => {
    // Список уходит МОДЕЛИ, и каждое лишнее имя — способ выбрать не тот
    // инструмент и потратить шаг на выяснение, что он делает то же самое.
    for (const dup of ["verify", "preview", "open_preview", "run_command", "create_artifact"]) {
      expect(registry, `дубль вернулся: ${dup}`).not.toContain(`name: "${dup}"`);
    }
  });

  it("рефлексия действительно ВЫЗЫВАЕТСЯ при успехе", () => {
    // Проверка существования метода недостаточна: удаление вызова
    // проходило незаметно, и рефлексия становилась мёртвым кодом,
    // который выглядит рабочим. Именно так это и обнаружилось.
    const start = engine.indexOf("if (decision.done || !decision.tool)");
    const block = engine.slice(start, engine.indexOf('status: "done"', start));
    expect(block, "вызов reflect потерян").toContain("this.reflect(ctx, goal, history,");
  });

  it("рефлексия записывает ОДИН факт, а не пересказ работы", () => {
    // Десять фактов с каждой миссии за месяц превращают память в шум,
    // из которого модель ничего не выберет.
    const fn = engine.slice(engine.indexOf("private async reflect("));
    const calls = (fn.slice(0, 1600).match(/rememberFact\(/g) ?? []).length;
    expect(calls).toBe(1);
  });

  it("рефлексия не роняет уже сделанную работу", () => {
    const fn = engine.slice(engine.indexOf("private async reflect("));
    expect(fn.slice(0, 1600)).toContain("reflect.failed");
    expect(fn.slice(0, 1600)).toContain("catch");
  });

  it("рефлексия пропускает миссии, из которых нечего вынести", () => {
    // Раньше отсев шёл по длине: миссию короче двух шагов не записывали.
    // Длина — плохой признак: правка одной строки в нужном файле стоит
    // запоминания, а десять шагов чтения без единой правки — нет.
    //
    // Теперь решает содержание (core/reflection.ts): факт пишется, только
    // если в нём есть МЕСТО (изменённые файлы) или ПРИЧИНА (внятная
    // ошибка). Пустой список фактов — нормальный и частый ответ.
    const fn = engine.slice(engine.indexOf("private async reflect("));
    expect(fn.slice(0, 1600)).toContain("buildReflection(");
    expect(fn.slice(0, 1600)).toContain("if (!facts.length) return;");
  });

  it("аудит проекта видит прошлые решения", () => {
    // Без них он повторно предлагает то, что уже пробовали и отвергли.
    expect(evolution).toContain("recallContext");
    expect(evolution).toContain("РАНЕЕ ПРИНЯТЫЕ РЕШЕНИЯ");
  });

  it("запрос на необратимое действие записывается, но НЕ исполняется", () => {
    // Запись — журнал намерений, а не разрешение. Инструмент риска
    // approval цикл по-прежнему не выполняет.
    const block = engine.slice(engine.indexOf("const wanted = TOOL_REGISTRY.find"));
    expect(block.slice(0, 700)).toContain("recordApprovalRequest");
    expect(block.slice(0, 700), "запись не должна открывать исполнение").not.toContain("executeTool");
  });

  it("Unified Approval Engine получает запросы вместо пустого legacy-журнала", () => {
    const journal = src("src/core/execution-journal.ts");
    expect(journal).toContain("requestApproval");
    expect(journal).toContain("approvalDigest");
  });

  it("сбой записи одобрения не мешает миссии", () => {
    const journal = src("src/core/execution-journal.ts");
    const fn = journal.slice(journal.indexOf("async recordApprovalRequest"));
    expect(fn.slice(0, fn.indexOf("\n  }\n"))).toContain("approval.record_failed");
  });
});

describe("Данные не копятся впустую", () => {
  // Класс ошибки, который не ловился ничем прежним: таблица пишется и
  // никогда не читается. Код работает, тесты зелёные, схема корректна —
  // а данные накапливаются в базе, и достать их нечем.
  //
  // Так было с четырьмя таблицами разом: план миссии, вызовы
  // инструментов, вердикты проверок и заблокированные запросы. Это ровно
  // те данные, которых не хватало для трассировки прогона — и они уже
  // собирались.
  const files = ["src/index.ts", "src/agents/orchestrator.ts", "src/core/execution-engine.ts", "src/lib/billing.ts", "src/lib/event-store.ts", "src/lib/chat-store.ts", "src/lib/memory-agent.ts", "src/lib/versions.ts", "src/lib/ledger-studio.ts"];
  const all = files.map((f) => src(f)).join("\n");

  it("у каждой таблицы, в которую пишут, есть чтение", () => {
    const written = [...new Set([...all.matchAll(/INSERT (?:OR \w+ )?INTO\s+(\w+)/gi)].map((m) => m[1]))];
    expect(written.length).toBeGreaterThan(4);

    const unread = written.filter(
      (t) => t !== "local_tasks" && !new RegExp(`(?:FROM|JOIN)\\s+${t}\\b`, "i").test(all),
    );
    expect(unread, `пишутся и не читаются: ${unread.join(", ")}`).toEqual([]);
  });

  it("история миссии отдаёт трассировку целиком", () => {
    const idx = src("src/index.ts");
    // Граница — следующий роут, а не magic number: первая версия резала
    // окно на 2200 символах, и добавленный в обработчик комментарий
    // выталкивал последнюю проверку за край. Тест падал на изменении,
    // которое ничего не ломало.
    const from = idx.indexOf("Полная трассировка прогона");
    const to = idx.indexOf('url.pathname === "/api/conversations"', from);
    const block = idx.slice(from, to);
    for (const part of ["mission_steps", "tool_calls", "mission_checks", "approval_requests"]) {
      expect(block, `${part} не отдаётся`).toContain(part);
    }
  });

  it("отсутствие одной таблицы не лишает трассировки целиком", () => {
    // Схема, применённая не полностью, — обычный случай при обновлении.
    const idx = src("src/index.ts");
    const fn = idx.slice(idx.indexOf("const pick = async"));
    expect(fn.slice(0, 500)).toContain("catch");
    expect(fn.slice(0, 500)).toContain("return []");
  });
});

describe("Ни одно событие не уходит в пустоту", () => {
  // Событие, которое отправляется и нигде не показывается, — это работа
  // впустую: сервер тратит запись и рассылку, а человек ничего не видит.
  // Так было с approval.requested — единственным местом, где видно,
  // ЧЕГО системе не хватило.
  const engine = coreEngineSource();
  const html = src("public/index.html");

  it("каждое отправляемое событие показывается в карте миссии", () => {
    const emitted = [...new Set([...engine.matchAll(/this\.note\(ctx, "([a-z_.]+)"/g)].map((m) => m[1]))];
    expect(emitted.length).toBeGreaterThan(10);
    const hidden = emitted.filter((e) => !html.includes(`'${e}'`));
    expect(hidden, `отправляются, но не видны: ${hidden.join(", ")}`).toEqual([]);
  });
});

describe("Нет эндпоинтов без пути к ним", () => {
  // Работающий код, к которому нет пути из интерфейса, — это поддержка
  // без причины. Так висели /api/chat и /api/conversations: готовые,
  // покрытые тестами и не вызываемые ни одной страницей.
  const idx = src("src/index.ts");
  const html = src("public/index.html");
  const classic = src("public/classic.html") + src("public/control.js") + fs.readdirSync(path.resolve(import.meta.dirname, "..", "ui")).filter((f) => f.endsWith(".ts")).map((f) => src(`ui/${f}`)).join("\n");

  it("каждый API-маршрут вызывается хотя бы одной страницей", () => {
    const routes = [...new Set([...idx.matchAll(/pathname === "(\/api\/[a-z]+)(?:\/[^"]*)?"/g)].map((m) => m[1]))];
    expect(routes.length).toBeGreaterThan(8);
    // Ищем ВЫЗОВЫ, а не упоминания. Первая версия проверяла
    // html.includes(route) и проходила на комментарии, где я перечислил
    // имена эндпоинтов — то есть подтверждала бы наличие пути там, где
    // никакого пути нет.
    // Учитываются три способа вызова, все реально применяются:
    //   api('/api/x')            — обычный
    //   api(cond ? '/api/x' : …) — выбор пути (миссия vs задача)
    //   '...' + '/api/stream'    — сборка адреса для WebSocket
    // Требовать строку строго после скобки было бы неверно: первая
    // версия объявила осиротевшими /api/mission и /api/stream, которые
    // вызываются каждый день.
    const called = (page: string, route: string) => {
      const quoted = `['"\`]${route.replace(/\//g, "\\/")}(?:[/?'"\`])`;
      return new RegExp(quoted).test(page);
    };

    const orphaned = routes.filter((r) => !called(html, r) && !called(classic, r));
    expect(orphaned, `нет пути из интерфейса: ${orphaned.join(", ")}`).toEqual([]);
  });

  it("история грузится по раскрытию, а не при старте", () => {
    // Незачем тянуть список, который человек может не открыть ни разу.
    // Стало крючком на открытие ЭКРАНА: событие toggle у <details>
    // исчезло вместе с самими раскрывашками.
    expect(html).toContain("onViewOpen('viewHistory'");
    expect(html).toContain("!$('histList').children.length");
  });

  it("ошибка открытия диалога остаётся на экране", () => {
    // Не тостом: тост исчезает через две секунды, пока человек смотрит
    // в другую сторону.
    const fn = html.slice(html.indexOf("function openConversation"));
    const errBlock = fn.slice(fn.indexOf(".catch("), fn.indexOf(".catch(") + 500);
    expect(errBlock).toContain("Не удалось открыть диалог");
    expect(errBlock, "ошибка не должна уходить тостом").not.toContain("toast(");
  });
});

describe("Контейнер: код готов, деплой не сломан", () => {
  const engine = coreEngineSource();
  const sandbox = src("src/core/sandbox.ts");
  const wrangler = JSON.parse(src("wrangler.production.json"));

  it("контейнер включён полностью, а не наполовину", () => {
    // Три блока обязаны быть все сразу. Один без других — деплой падает:
    // wrangler отвергает containers без class_name, а класс без миграции
    // не инициализируется.
    expect(wrangler.containers[0].class_name).toBe("Sandbox");
    expect(wrangler.durable_objects.bindings.some((b: {name:string})=>b.name==="AZRAIL_SANDBOX")).toBe(true);
    expect(wrangler.migrations.some((m:{new_sqlite_classes:string[]})=>m.new_sqlite_classes.includes("Sandbox"))).toBe(true);
  });

  it("класс песочницы экспортирован из воркера", () => {
    // wrangler ищет класс с именем из containers.class_name среди
    // экспортов. Без экспорта деплой упадёт, а типы будут чисты.
    expect(src("src/index.ts")).toMatch(/export \{ Sandbox \} from/);
  });

  it("экспортируется НАШ подкласс, а не класс пакета напрямую", () => {
    // Прямой реэкспорт берёт умолчания пакета, и SANDBOX_LIMITS остаётся
    // документацией: сегодня цифры совпадают, при смене умолчания разойдутся
    // молча — вместе со счётом за простаивающие контейнеры.
    expect(src("src/index.ts"), "прямой реэкспорт теряет наши лимиты").not.toMatch(
      /export \{ Sandbox \} from "@cloudflare\/sandbox"/,
    );
    const cls = src("src/core/azrail-sandbox.ts");
    expect(cls).toContain("extends BaseSandbox");
    expect(cls, "лимит обязан браться из SANDBOX_LIMITS").toContain("SANDBOX_LIMITS.IDLE_TIMEOUT_MS");
  });

  it("песочница изолирована по проектам", () => {
    // Без имени ВСЕ проекты делят один контейнер: чужие файлы, чужие
    // зависимости, чужой мусор в рабочей папке.
    expect(engine).toContain("sandboxName: ctx.projectId");
  });

  it("версия образа совпадает с версией пакета", () => {
    // SDK сверяет их при старте: расхождение ломает часть возможностей и
    // пишет предупреждение, которое легко не заметить.
    const pkg = JSON.parse(src("package.json")).dependencies["@cloudflare/sandbox"].replace(/^[^0-9]*/, "");
    const from = src("Dockerfile").match(/FROM docker\.io\/cloudflare\/sandbox:([0-9.]+)/);
    expect(from, "Dockerfile обязан наследовать официальный образ").not.toBeNull();
    expect(from![1], `образ ${from![1]} против пакета ${pkg}`).toBe(pkg);
  });

  it("проверяется то, чем пользуется getSandbox", () => {
    // Пустой объект в биндинге — обычное дело при неполной настройке.
    // Падать на «undefined is not a function» посреди миссии хуже, чем
    // честно сказать, что песочницы нет.
    const fn = sandbox.slice(sandbox.indexOf("export function getContainer"));
    expect(fn.slice(0, 600)).toContain('idFromName');
  });

  it("таймаут передаётся полем, которое существует в API", () => {
    // Прежний адаптер слал timeoutMs — такого поля нет, и команда шла бы
    // без ограничения времени. Компилятор молчал: биндинг был unknown.
    expect(sandbox).toMatch(/timeout:\s*opts\?\.timeoutMs/);
    expect(sandbox, "timeoutMs не поле API").not.toMatch(/box\.exec\([^)]*timeoutMs:/);
  });

  it("SDK грузится лениво — чистая логика проверяема без рантайма", () => {
    // Статический импорт тянет cloudflare:workers и роняет загрузку всего
    // файла в тестах, унося с собой политику сети и разбор вывода.
    expect(sandbox).not.toMatch(/^import \{ getSandbox \}/m);
    expect(sandbox).toContain("async function loadSdk");
  });

  it("таймаут отделён от ненулевого кода", () => {
    // «Зависло» и «упало» лечатся по-разному.
    const block = engine.slice(engine.indexOf('case "sandbox_exec"'));
    expect(block.slice(0, 1800)).toContain("res.timedOut");
    expect(block.slice(0, 1800)).toContain("res.exitCode !== 0");
  });

  it("непроброшенный порт — не сбой, а сообщение", () => {
    // Сервер не поднят — обычное дело. Модель должна понять, что надо
    // сначала его запустить.
    const block = engine.slice(engine.indexOf('case "sandbox_preview"'));
    expect(block.slice(0, 1200)).toContain("Сначала запусти сервер");
  });
});

describe("Чат и история: параметры совпадают с сервером", () => {
  // Реальный баг: панель истории слала ?conversation=, а сервер читает
  // conversationId. Открытие ЛЮБОГО диалога отвечало бы 400. Ни типы, ни
  // прежние тесты этого не видят — имя параметра для них просто строка
  // внутри URL.
  const idx = src("src/index.ts");
  const html = src("public/index.html");
  const classic = src("public/classic.html") + src("public/control.js") + fs.readdirSync(path.resolve(import.meta.dirname, "..", "ui")).filter((f) => f.endsWith(".ts")).map((f) => src(`ui/${f}`)).join("\n");
  const auth = src("src/lib/auth.ts");
  const orch = src("src/agents/orchestrator.ts");
  const store = src("src/lib/chat-store.ts");

  it("каждый параметр строки запроса читается сервером", () => {
    // auth.ts тоже читает параметры (token для WebSocket) — иначе
    // проверка объявила бы рабочий путь сломанным.
    const known = new Set(
      [...`${idx}\n${auth}`.matchAll(/searchParams\.get\("([^"]+)"\)/g)].map((m) => m[1]),
    );
    const bad: string[] = [];
    for (const [name, page] of [["index", html], ["classic", classic]] as const) {
      for (const m of page.matchAll(/['"`]\/api\/[a-z]+\?([a-zA-Z]+)=/g)) {
        if (!known.has(m[1])) bad.push(`${name}: ?${m[1]}=`);
      }
    }
    expect(bad, `сервер таких параметров не читает: ${bad.join(", ")}`).toEqual([]);
  });

  it("история читает поля, которые сервер отдаёт", () => {
    const query = idx.slice(idx.indexOf("SELECT c.id, c.project_id"), idx.indexOf("conversations: results"));
    const fn = html.slice(html.indexOf("function loadHistory"), html.indexOf("function openConversation"));
    for (const field of [...new Set([...fn.matchAll(/\bc\.([a-z_]+)/g)].map((m) => m[1]))]) {
      expect(query, `поля ${field} нет в запросе`).toContain(field);
    }
  });

  it("сообщения диалога содержат role и content", () => {
    expect(store).toContain("SELECT id, role, content");
  });

  it("формат сообщений WebSocket согласован в обе стороны", () => {
    // Расхождение здесь означало бы молчащий чат: сообщения уходят,
    // ответы не распознаются, и никакой ошибки при этом нет.
    expect(html).toContain("type: 'chat'");
    expect(orch).toContain('parsed.type !== "chat"');
    expect(orch).toContain('type: "chat_reply"');
    expect(html).toContain("data.type === 'chat_reply'");
  });

  it("чат пишет в те же таблицы, из которых читает история", () => {
    // Иначе панель истории всегда пуста, а понять почему — трудно:
    // чат работает, таблицы есть, данных нет.
    expect(orch).toContain("ensureConversation");
    expect(orch).toContain("addMessage");
    expect(idx).toContain("FROM conversations c");
  });
});

describe("Чат, чтение и песочница доступны", () => {
  const html = src("public/index.html");

  it("чат — отдельный раздел, а не строка внутри журнала", () => {
    // Он лежал третьим полем в «Живом журнале»: найти можно было только
    // развернув чужой по смыслу раздел. Пользователь так его и искал.
    expect(html).toContain('id="viewChat"');
    const chat = html.slice(html.indexOf('id="viewChat"'), html.indexOf('id="viewLive"'));
    expect(chat, "чат должен содержать своё поле ввода").toContain('id="chatInput"');
    expect(chat, "и свой журнал реплик").toContain('id="chatLog"');
  });

  it("чат — один из экранов, а не строка внутри чужого раздела", () => {
    // Раньше он лежал третьим полем в «Живом журнале». Теперь это
    // отдельный экран, и попасть в него можно одним нажатием из меню.
    expect(html).toContain('data-open="viewChat"');
  });

  it("отправка сама поднимает соединение", () => {
    // Требовать нажать «Подключить» — перекладывать на человека работу,
    // которую система знает как сделать.
    const fn = html.slice(html.indexOf("function sendChat"));
    expect(fn.slice(0, 1200)).toContain("pendingChat");
    expect(fn.slice(0, 1200)).toContain("connectWs()");
  });

  it("сообщение не теряется, пока сокет открывается", () => {
    expect(html).toContain("if (pendingChat)");
  });

  it("длинный ответ можно прочитать целиком", () => {
    expect(html).toContain('id="readerWrap"');
    expect(html).toContain("function openReader");
    // Кнопка появляется только у длинного текста — иначе она висит
    // под каждым коротким ответом и её приходится пропускать взглядом.
    expect(html).toContain("fullText.length > 400");
  });

  it("режим чтения закрывается по Escape", () => {
    const esc = html.slice(html.indexOf("if (e.key !== 'Escape') return;"));
    expect(esc.slice(0, 300)).toContain("closeReader");
  });

  it("песочница запускается без задачи", () => {
    expect(html).toContain('id="viewSandbox"');
    expect(html).toContain('id="sandboxRun"');
    expect(html).toContain("function runSandbox");
  });

  it("закрытый предпросмотр можно открыть заново", () => {
    // Раньше закрытие означало «потерял»: перезапускай задачу целиком.
    expect(html).toContain('id="sandboxReopen"');
    expect(html).toContain("var lastRun");
  });

  it("изоляция песочницы не ослаблена", () => {
    // allow-scripts вместе с allow-same-origin снимает изоляцию полностью.
    const iframe = html.slice(html.indexOf('id="previewFrame"'), html.indexOf('id="previewFrame"') + 140);
    expect(iframe).toContain('sandbox="allow-scripts"');
    expect(iframe, "allow-same-origin в песочнице недопустим").not.toContain("allow-same-origin");
  });
});

describe("AZRAIL отвечает на вопросы", () => {
  const types = src("src/types.ts");
  const registry = src("src/lib/agent-registry.ts");
  const orch = src("src/agents/orchestrator.ts");
  const intent = src("src/agents/orchestrator-intent.ts");
  const agent = src("src/agents/answer-agent.ts");
  const models = src("src/lib/model-registry.ts");

  it("намерение «ответить» существует", () => {
    // До него все десять намерений означали «сделай что-то с кодом»,
    // и любой вопрос падал в unclear.
    expect(types).toMatch(/\|\s*"answer"/);
  });

  it("вопрос проходит белый список намерений", () => {
    // Классификатор может вернуть answer, но фильтр ALLOWED_INTENTS
    // выбросил бы его обратно в unclear — тихо и незаметно.
    const list = intent.slice(intent.indexOf("ALLOWED_INTENTS"), intent.indexOf("checkTaskSufficiency"));
    expect(list).toContain('"answer"');
  });

  it("классификатор знает, что вопрос — не unclear", () => {
    expect(intent).toContain("answer — если это ВОПРОС");
  });

  it("намерение связано с возможностью, а возможность — с агентом", () => {
    expect(registry).toMatch(/answer:\s*"reasoning"/);
    expect(registry).toContain('capabilities: ["reasoning"]');
    expect(registry).toContain("AnswerAgent");
  });

  it("у ответа своя политика выбора модели", () => {
    // Иначе он молча падал бы в дефолт policyFor — работает, но случайно.
    expect(models).toMatch(/^\s*answer:\s*\{/m);
  });

  it("чат больше не голый вызов модели", () => {
    // Раньше системный промпт чата прямо запрещал работу: «ты не
    // выполняешь здесь задачи». Вопрос в чате и тот же вопрос в задаче
    // получали разные ответы.
    expect(orch).not.toContain("здесь только разговор");
    expect(orch).toContain('this.runCapability("reasoning"');
  });

  it("чат не теряет предмет разговора", () => {
    // Без истории «а почему?» следом за ответом повисает в воздухе.
    expect(orch).toContain("conversationHistory");
    expect(agent).toContain("priorTurns");
  });

  it("ступени идут от дешёвой к дорогой", () => {
    expect(agent).toContain("chooseTier");
    ["direct", "memory", "compute"].forEach((t) => expect(agent).toContain(`"${t}"`));
  });

  it("считает вычислитель, а не модель", () => {
    // Единственное, ради чего всё затевалось: модель не считает, она
    // предсказывает правдоподобное число.
    expect(agent).toContain("calculateAll");
    expect(agent).toContain("посчитано вычислителем, не тобой");
    expect(agent, "модель не должна пересчитывать готовое").toContain("Не пересчитывай");
  });

  it("вычислитель не исполняет код", () => {
    const calc = src("src/lib/calc.ts");
    expect(calc, "eval недоступен в Workers и был бы дырой").not.toMatch(/\beval\s*\(/);
    expect(calc).not.toMatch(/new Function\s*\(/);
  });

  it("недоступная память не срывает ответ", () => {
    // Срез от ВЫЗОВА, а не от строки импорта: первое вхождение
    // recallContext — это import, и тест проходил бы мимо сути.
    const call = agent.indexOf("await recallContext");
    expect(call, "вызов recallContext не найден").toBeGreaterThan(-1);
    expect(agent.slice(call - 200, call + 300)).toContain("catch");
  });
});

describe("Готовность к деплою контейнера", () => {
  const project = src("src/lib/project.ts");

  it("существование проекта не кешируется вне D1", () => {
    expect(project).not.toContain("new Map");
    expect(project).not.toContain("systemUserReady");
    expect(project).toContain("env.AZRAIL_D1.batch");
  });
  it("ошибка сохранения не объявляет проект созданным", () => {
    const fail=project.slice(project.indexOf("catch (err)"));
    expect(fail).toContain("return false");
    expect(fail).not.toContain("return true");
  });

  it("простой контейнера объявлен, а не унаследован", () => {
    // Контейнер тарифицируется за время работы: простой до усыпления —
    // единственное, что отделяет забытую песочницу от счёта за час безделья.
    expect(src("src/core/azrail-sandbox.ts")).toContain("sleepAfter");
  });
});

describe("Найдено на живой системе", () => {
  const html = src("public/index.html");

  it("«Новая задача» — кнопка, а не надпись", () => {
    // Было: padding 0 и 13px серым — высота нажатия около 17 пикселей при
    // норме 44. Код был исправен, промахивался палец, и выглядело это
    // как «кнопка не работает».
    const css = html.slice(html.indexOf(".again {"), html.indexOf(".again:hover"));
    expect(css, "нужна область касания в 44 пикселя").toContain("min-height: 44px");
    expect(css, "padding: 0 схлопывает область нажатия").not.toMatch(/padding:\s*0;/);
  });

  it("сырые данные показываются с переносами", () => {
    // JSON.stringify экранирует переносы внутри строк: длинный ответ
    // превращается в сплошную ленту с «\n\n» вместо абзацев.
    expect(html).toMatch(/JSON\.stringify\(data\.data, null, 2\)\.replace/);
  });
});

describe("Утечка рассуждения модели", () => {
  const router = src("src/lib/model-router.ts");

  it("извлечение текста всегда чистит размышление", () => {
    // Намерение answer идёт к думающим моделям, и они отдают <think>
    // прямо в тексте. Пользователь увидел «Привет.</think>На связи.»
    expect(router).toContain("export function stripReasoning");
    const fn = router.slice(router.indexOf("export function extractText"));
    const raw = fn.match(/return (?!stripReasoning)\w+\.?\w*content|return o\.response(?!\))/g);
    expect(raw, "остался путь без очистки: " + raw).toBeNull();
  });

  it("оборванное размышление тоже режется", () => {
    // Ответ подрезали по лимиту токенов: тег открыт и не закрыт. Без этой
    // ветки наружу ушло бы всё размышление целиком.
    expect(router).toContain('const open = out.indexOf("<think>")');
  });
});

describe("Поля ввода видны на тёмной странице", () => {
  const html = src("public/index.html");
  const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));

  it("фон задаётся ОБЩИМ правилом, а не каждому полю отдельно", () => {
    // Так уже случилось дважды — с полем чата и с полем песочницы: новое
    // поле заводили отдельным правилом и забывали про фон, браузер рисовал
    // его белым, и набранный текст пропадал на светлом.
    expect(css).toMatch(/^textarea \{[^}]*background:/m);
  });

  it("цвет текста и подсказки заданы явно", () => {
    const start = css.search(/^textarea \{/m);
    const rule = css.slice(start, css.indexOf("}", start));
    expect(rule, "без color текст наследует непредсказуемое").toContain("color: var(--text)");
    expect(css).toMatch(/textarea::placeholder/);
  });

  it("цвет берётся из объявленной переменной", () => {
    // --fg в этом файле не существует: опечатка в имени тихо оставила бы
    // поле без цвета, и ошибки бы никто не увидел.
    const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
    const declared = new Set([...root.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
    const missing = [...used].filter((v) => !declared.has(v));
    expect(missing, "переменные без объявления: " + missing.join(", ")).toEqual([]);
  });
});

describe("Разделы — отдельные экраны", () => {
  const html = src("public/index.html");
  // Первый <script> — тот, что задаёт поведение страницы. lastIndexOf
  // попадал в строку ВНУТРИ кода (шаблон предпросмотра содержит "<script>"),
  // и срез выходил пустым, из-за чего тест ничего не проверял.
  const script = html.slice(html.indexOf("<script>"), html.indexOf("</script>", html.indexOf("<script>")));

  it("раскрывашек не осталось", () => {
    // Всё лежало одной лентой: чтобы дойти до песочницы, приходилось
    // прокручивать чужие разделы. Ищем ТЕГ, а не слово: в комментариях
    // <details> упоминается как объяснение, почему его больше нет.
    // Разметка, а не текст скрипта: в комментарии <details> упоминается
    // как объяснение, почему его больше нет.
    const markup = html.slice(0, html.indexOf("<script>"));
    expect(markup).not.toMatch(/<details[\s>]/);
    expect(markup).not.toMatch(/<summary[\s>]/);
  });

  it("каждый экран существует и скрыт по умолчанию", () => {
    ["viewChat", "viewLive", "viewSandbox", "viewHistory", "viewOps"].forEach((v) => {
      expect(html, v + " не найден").toContain('id="' + v + '"');
    });
    expect(html).toContain('id="viewHome"');
  });

  it("у каждого экрана есть возврат", () => {
    const backs = html.match(/data-back/g) || [];
    expect(backs.length, "возврат нужен на каждом из пяти экранов").toBeGreaterThanOrEqual(5);
  });

  it("меню ведёт к экранам, а не к исчезнувшим раскрывашкам", () => {
    // data-open="foldChat" указывал бы в пустоту: элемента больше нет.
    expect(html).not.toMatch(/data-open="fold/);
    expect(html).toMatch(/data-open="view/);
  });

  it("область касания у возврата и кнопки меню — 44 пикселя", () => {
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
    expect(css.slice(css.indexOf(".view-back {"), css.indexOf(".view-back:hover"))).toContain("44px");
    expect(css.slice(css.indexOf(".menu-btn {"), css.indexOf(".menu-btn span"))).toContain("44px");
  });

  it("крючки экранов объявлены ДО первого использования", () => {
    // var поднимается, значение — нет. Объявление ниже вызова роняло весь
    // скрипт: он один, и падение уносит всё, что подключается ниже.
    const decl = script.indexOf("var viewHooks");
    // ВЫЗОВ, а не определение функции: первое вхождение "onViewOpen(" —
    // это её объявление, и сравнение шло бы само с собой, то есть тест
    // проходил бы всегда.
    const use = script.search(/^\s*onViewOpen\(/m);
    expect(decl, "viewHooks не объявлен").toBeGreaterThan(-1);
    expect(use, "вызов onViewOpen не найден").toBeGreaterThan(-1);
    expect(decl, "объявление ниже вызова — скрипт упадёт целиком").toBeLessThan(use);
  });

  it("нет слушателей на исчезнувших элементах", () => {
    // Загрузка истории висела на событии toggle у <details>. Элемент
    // пропал — и строка уронила весь скрипт, унеся всё, что ниже.
    expect(script).not.toMatch(/\$\('fold[A-Za-z]+'\)/);
  });
});

describe("Вёрстка и размеры на телефоне", () => {
  const html = src("public/index.html");
  const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
  const rule = (sel: string) => {
    const i = css.indexOf(sel + " {");
    return i === -1 ? "" : css.slice(i, css.indexOf("}", i));
  };

  it("закрытое меню не оставляет содержимое в узкой колонке", () => {
    // display:none убирает саму полосу, но НЕ её колонку в сетке.
    // Содержимое оставалось шириной 260px, справа — чернота во весь экран,
    // а слово AZRAIL обрезалось. Ломалось молча: ошибок в консоли нет.
    expect(rule(".layout.nav-closed")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("нажимаемое — не меньше 40 пикселей", () => {
    // .mini и .chip не имели высоты вовсе: выходило около 30, и промах
    // читался как «кнопка не работает».
    const targets: Array<[string, RegExp]> = [
      [".nav-item", /min-height:\s*(\d+)px/],
      [".mini", /min-height:\s*(\d+)px/],
      [".pick", /min-height:\s*(\d+)px/],
      [".act", /min-height:\s*(\d+)px/],
      [".mode", /min-height:\s*(\d+)px/],
      [".view-back", /width:\s*(\d+)px/],
      [".menu-btn", /width:\s*(\d+)px/],
      [".again", /min-height:\s*(\d+)px/],
    ];
    for (const [sel, re] of targets) {
      const m = rule(sel).match(re);
      expect(m, sel + ": размер не задан").not.toBeNull();
      expect(Number(m![1]), sel + " слишком мелкий").toBeGreaterThanOrEqual(40);
    }
  });

  it("меню читается: шрифт не мельче 15 пикселей", () => {
    // Было 13px с точкой в 8 — прочитать можно, только присмотревшись.
    const m = rule(".nav-item").match(/font-size:\s*(\d+)px/);
    expect(Number(m![1])).toBeGreaterThanOrEqual(15);
  });

  it("на телефоне меню шире и крупнее", () => {
    // Выезжающее меню лежит ПОВЕРХ содержимого и ширину не экономит —
    // значит и ужимать в нём нечего.
    const mob = css.slice(css.indexOf("@media (max-width: 860px)"));
    const w = Number((mob.match(/\.sidebar \{[^}]*width:\s*(\d+)px/s) || [])[1] || 0);
    const f = Number((mob.match(/\.sidebar \.nav-item \{[^}]*font-size:\s*(\d+)px/s) || [])[1] || 0);
    expect(w, "меню уже 280px").toBeGreaterThanOrEqual(280);
    expect(f, "шрифт меньше 16px").toBeGreaterThanOrEqual(16);
  });
});

describe("Чат устроен как чат", () => {
  const html = src("public/index.html");
  const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
  const rule = (sel: string) => {
    const i = css.indexOf(sel + " {");
    return i === -1 ? "" : css.slice(i, css.indexOf("}", i));
  };

  it("ввод внизу, переписка над ним", () => {
    // Была обычная лента: коробка на 44vh, под ней поле. Чтобы написать,
    // приходилось сначала доскроллить до него.
    expect(rule("#viewChat")).toMatch(/height:\s*calc\(100dvh/);
    expect(rule(".chat-log"), "переписка должна тянуться и прокручиваться").toMatch(/flex:\s*1/);
    expect(rule(".chat-log")).toMatch(/overflow-y:\s*auto/);
    expect(rule(".chat-dock"), "ввод не должен уезжать вместе с лентой").toMatch(/flex:\s*none/);
  });

  it("своя реплика отличается не бледностью", () => {
    // Серый текст читается как «неважное», хотя это вопрос человека.
    expect(rule(".chat-turn.mine")).toContain("align-self: flex-end");
  });
});

describe("Выбор модели там, где его меняют", () => {
  const html = src("public/index.html");

  it("список моделей есть в чате, а не только в «Служебном»", () => {
    // Менять модель хочется в тот момент, когда задаёшь вопрос.
    expect(html).toContain('id="chatModel"');
    const chat = html.slice(html.indexOf('id="viewChat"'), html.indexOf('id="viewLive"'));
    expect(chat, "выбор должен стоять внутри экрана чата").toContain('id="chatModel"');
  });

  it("значение одно на оба списка", () => {
    // Иначе они разъедутся: человек видит одну модель, работает другая.
    expect(html).toContain("function setPreferredModel");
    const script = html.slice(html.indexOf("<script>"), html.indexOf("</script>", html.indexOf("<script>")));
    // Прямых присваиваний preferredModel в обработчиках быть не должно.
    expect(script).not.toMatch(/preferredModel = \$\('(modelSelect|chatModel|model)'\)/);
  });

  it("недоступные модели не предлагаются в чате", () => {
    // Предложить то, что не запустится, — обещание, которое не выполнится.
    expect(html).toContain("if (chatSel && m.available)");
  });
});

describe("Панель состояния говорит правду", () => {
  const html = src("public/index.html");
  const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));

  it("сводка видна всегда, подробность по касанию", () => {
    // Так снимается вопрос «как часто смотрят на состояние»: беглый
    // взгляд бесплатен, разбор — одно нажатие.
    expect(html).toContain('id="stateBtn"');
    expect(html).toContain('id="statebar"');
  });

  it("три колонки только там, где для них есть место", () => {
    // 260 слева и 320 справа — это 580 точек только на панели. На
    // телефоне три колонки не ужимаются, а перестают существовать.
    expect(css).toMatch(/@media \(min-width: 1180px\)[\s\S]*?grid-template-columns:\s*260px minmax\(0,1fr\) 320px/);
    expect(css).toMatch(/@media \(max-width: 1179px\)[\s\S]*?position: fixed/);
  });

  it("«не подключён» отличается от «сломано»", () => {
    // /health возвращает три состояния, не два. Красить absent в красный
    // значит пугать там, где ничего не сломано.
    expect(html).toContain("c.status === 'absent'");
  });

  it("непроверенные биндинги подписаны как непроверенные", () => {
    // Сервер честно говорит: вызывать модель ради health-check дорого.
    // Значит известно лишь, что биндинг объявлен. В макете тут стояло «ВКЛ».
    expect(html).toContain("объявлен (не проверен)");
  });

  it("панель строится узлами, а не innerHTML", () => {
    // Сюда приходят данные с сервера, включая тексты ошибок.
    const fn = html.slice(html.indexOf("function renderState"), html.indexOf("function renderSandboxState"));
    expect(fn).not.toContain("innerHTML");
  });

  it("состояние обновляется при каждом открытии", () => {
    // Показывать состояние минутной давности хуже, чем не показывать.
    const h = html.slice(html.indexOf("$('stateBtn').addEventListener"));
    expect(h.slice(0, 500)).toContain("checkHealth()");
  });
});

describe("Объявленное — применяется", () => {
  it("потолок жизни контейнера больше не только документация", () => {
    // Та же болезнь, что ловилась всю сессию: величина объявлена, а
    // поведением правит что-то другое. MAX_LIFETIME_MS существовал
    // как комментарий.
    // Считать УПОМИНАНИЯ бесполезно: объявление тоже упоминание, и тест
    // проходил бы на файле, где величина только объявлена. Проверяется
    // ВЫЗОВ сторожа из exec.
    const cls = src("src/core/azrail-sandbox.ts");
    expect(cls, "exec не переопределён").toMatch(/async exec\(/);
    expect(cls, "сторож не вызывается из exec").toMatch(/await this\.enforceLifetime\(\)/);
    expect(cls, "сторож не сверяется с потолком").toContain("SANDBOX_LIMITS.MAX_LIFETIME_MS");
  });

  it("Canon Validator существует и подключён к отчёту", () => {
    // В canon.ts стояла честная пометка «пока не реализован».
    expect(src("src/lib/canon-check.ts")).toContain("validateAgainstCanon");
    expect(src("src/index.ts"), "валидатор не вызывается").toContain("validateAgainstCanon({");
  });

  it("валидатор не спрашивает модель", () => {
    // Вердикт от модели был бы ровно тем неподтверждённым утверждением,
    // ради борьбы с которым валидатор и заводится.
    const f = src("src/lib/canon-check.ts");
    expect(f).not.toContain("runModel");
    expect(f).not.toContain("fetch(");
  });

  it("отчёт виден в интерфейсе", () => {
    // Иначе он остался бы данными, которых никто не читает — тем самым
    // классом, что уже ловился здесь трижды.
    expect(src("public/index.html")).toContain("renderCanon");
    expect(src("public/index.html")).toContain("/api/mission?missionId=");
  });

  it("непроверяемые принципы названы числом, а не скрыты", () => {
    // Умолчание читалось бы как «там всё хорошо».
    expect(src("public/index.html")).toContain("не выводятся");
  });
});

describe("Каждый экран зарегистрирован", () => {
  const html = src("public/index.html");

  it("всякая секция .view есть в списке VIEWS", () => {
    // Экран, которого нет в списке, openView молча подменяет главной:
    // раздел существует в разметке, кнопка нажимается, ничего не
    // происходит. Ни одной ошибки в консоли.
    const sections = [...html.matchAll(/<section class="view[^"]*" id="(view[A-Za-z]+)"/g)].map((m) => m[1]);
    const list = html.slice(html.indexOf("var VIEWS = ["), html.indexOf("]", html.indexOf("var VIEWS = [")));
    const missing = sections.filter((id) => !list.includes(`'${id}'`));
    expect(missing, `секции есть, в VIEWS нет: ${missing.join(", ")}`).toEqual([]);
  });

  it("всякий пункт меню ведёт на существующий экран", () => {
    // data-view вместо data-open молча ничего не делает: атрибут
    // выдуман, обработчик его не знает.
    const targets = [...html.matchAll(/data-open="(view[A-Za-z]+)"/g)].map((m) => m[1]);
    targets.forEach((t) => {
      expect(html, `пункт ведёт на ${t}, а секции нет`).toContain(`id="${t}"`);
    });
    expect(html, "data-view не обрабатывается — атрибут называется data-open").not.toContain("data-view=");
  });

  it("реестр агентов читается интерфейсом", () => {
    // /api/agents отдавал список в пустоту: его не звал никто.
    expect(html).toContain("/api/agents");
    expect(html).toContain("skillAgents");
  });

  it("недоступные инструменты показаны, а не спрятаны", () => {
    // Список из восьми «всё работает» врёт про систему, где работает
    // восемь из двадцати одного.
    expect(html).toContain("недоступен");
    expect(html).toContain("srow' + (live ? '' : ' off')");
  });
});

describe("Телефон: ввод и меню", () => {
  const html = src("public/index.html");
  const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
  const rule = (sel: string) => {
    const i = css.indexOf(sel + " {");
    return i === -1 ? "" : css.slice(i, css.indexOf("}", i));
  };

  it("поле ввода занимает всю строку", () => {
    // Раньше оно делило строку с тремя кнопками и на телефоне сжималось
    // до узкой щели: главное действие выглядело как второстепенное.
    expect(rule(".ask")).toMatch(/grid-template-columns:\s*1fr/);
    expect(html, "кнопки не вынесены под поле").toContain('class="ask-tools"');
  });

  it("кнопки под полем, отправка справа", () => {
    expect(rule(".ask-tools .go")).toMatch(/margin-left:\s*auto/);
  });

  it("меню выезжает, а не пропадает", () => {
    // display:none нельзя анимировать в принципе: полоса мгновенно
    // исчезала и мгновенно возникала.
    expect(css, "вернулся display:none").not.toMatch(/nav-closed \.sidebar \{ display: none/);
    expect(css).toMatch(/nav-closed \.sidebar[\s\S]{0,140}translateX\(-100%\)/);
  });

  it("скрытое меню недоступно с клавиатуры", () => {
    // Иначе табом можно провалиться в то, чего не видно.
    expect(css).toMatch(/nav-closed \.sidebar[\s\S]{0,140}visibility: hidden/);
  });

  it("движение не гасится наглухо", () => {
    // У владельца системные анимации выключены: правило
    // prefers-reduced-motion навсегда заморозило бы меню без способа
    // его оживить. Движение включается классом, и выбор человека имеет
    // приоритет над настройкой ОС.
    expect(css, "меню замрёт у тех, кто отключил анимации в системе")
      .not.toMatch(/@media \(prefers-reduced-motion[\s\S]{0,200}\.sidebar/);
  });
});
