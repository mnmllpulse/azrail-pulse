import { sqliteD1 } from "./stubs/sqlite-d1";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { sendHint, drainHints, MAX_HINT_LENGTH, MAX_PENDING_HINTS } from "../src/lib/mission-state";
import type { Env } from "../src/types";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/** KV и D1 в памяти. */
function fakeEnv(status = "executing") {
  const {db,sqlite}=sqliteD1();
  if(status!=="__missing__")sqlite.prepare("INSERT INTO missions(id,goal,status) VALUES('m1','test',?)").run(status);
  return {sqlite,env:{AZRAIL_D1:db} as unknown as Env};
}

describe("Очередь подсказок", () => {
  it("подсказка принимается и забирается", async () => {
    const f = fakeEnv();
    expect((await sendHint(f.env, "m1", "смотри в src/auth")).ok).toBe(true);
    expect(await drainHints(f.env, "m1")).toEqual(["смотри в src/auth"]);
  });

  it("забранное стирается сразу", async () => {
    // Подсказка, пережившая свой шаг, будет повторена моделью на
    // следующем — и агент получит её дважды, как настойчивое требование.
    const f = fakeEnv();
    await sendHint(f.env, "m1", "подсказка");
    await drainHints(f.env, "m1");
    expect(await drainHints(f.env, "m1")).toEqual([]);
    expect(f.sqlite.prepare("SELECT COUNT(*) AS n FROM mission_hints").get()?.n).toBe(0);
  });

  it("подсказки копятся в порядке отправки", async () => {
    const f = fakeEnv();
    await sendHint(f.env, "m1", "первая");
    await sendHint(f.env, "m1", "вторая");
    expect(await drainHints(f.env, "m1")).toEqual(["первая", "вторая"]);
  });

  it("пустая подсказка отклоняется", async () => {
    const f = fakeEnv();
    expect(await sendHint(f.env, "m1", "   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("длинная обрезается, а не отбрасывается", async () => {
    // Это реплика в одну-две фразы. Длинная подсказка вытеснила бы из
    // запроса саму задачу — то есть сделала бы ровно то, от чего мы
    // бережём контекст.
    const f = fakeEnv();
    await sendHint(f.env, "m1", "я".repeat(5000));
    const [only] = await drainHints(f.env, "m1");
    expect(only.length).toBe(MAX_HINT_LENGTH);
  });

  it("очередь не бесконечна", async () => {
    // Больше пяти — это уже не поправка на ходу, а новая задача.
    const f = fakeEnv();
    for (let i = 0; i < MAX_PENDING_HINTS; i++) await sendHint(f.env, "m1", `подсказка ${i}`);
    expect(await sendHint(f.env, "m1", "лишняя")).toEqual({ ok: false, reason: "too_many" });
  });

  it("опоздавшая подсказка отклоняется явно", async () => {
    // Принять её молча значило бы дать человеку думать, что она учтётся.
    // "completed", а не "done": done — это статус TaskResult, а строка
    // миссии переводится в completed (см. statusForResult).
    const f = fakeEnv("completed");
    expect(await sendHint(f.env, "m1", "поздно")).toEqual({ ok: false, reason: "already_finished" });
  });

  it("несуществующая миссия — не найдена", async () => {
    const f = fakeEnv("__missing__");
    expect(await sendHint(f.env, "нет", "текст")).toEqual({ ok: false, reason: "not_found" });
  });

  it("истёкшая подсказка не доставляется", async () => {
    const f = fakeEnv();
    f.sqlite.prepare("INSERT INTO mission_hints(mission_id,text,expires_at) VALUES('m1','old',0)").run();
    expect(await drainHints(f.env, "m1")).toEqual([]);
  });

  it("сбой очереди не роняет миссию", async () => {
    const broken = {
      AZRAIL_D1: { prepare() {throw new Error("D1 unavailable");} },
    } as unknown as Env;
    expect(await drainHints(broken, "m1")).toEqual([]);
  });
});

describe("Цикл слышит подсказки", () => {
  const engine = src("src/core/execution-engine.ts");

  it("читает их на границе шага, как и отмену", () => {
    // Подсказку присылают отдельным запросом; значение, снятое на старте,
    // устареет к первому же шагу.
    const abort = engine.indexOf("ctx.shouldAbort && (await ctx.shouldAbort())");
    const hints = engine.indexOf("await ctx.takeHints()");
    const decide = engine.indexOf("let decision: StepDecision;");
    expect(hints).toBeGreaterThan(abort);
    expect(hints).toBeLessThan(decide);
  });

  it("подсказка ложится в историю, а не в системный промпт", () => {
    // История — это то, что произошло, и «владелец сказал X» произошло
    // так же, как вызов инструмента. В промпте она стояла бы вне времени,
    // и модель не поняла бы, что сказанное относится к последнему шагу.
    expect(engine).toContain('tool: "hint"');
    expect(engine).toContain("ВЛАДЕЛЕЦ ВМЕШАЛСЯ");
  });

  it("подсказка не считается неудачей", () => {
    // ok: false накрутил бы счётчик провалов и оборвал миссию за то, что
    // человек попытался помочь.
    //
    // КОММЕНТАРИИ СНИМАЮТСЯ. Первая версия этой проверки ловила слова
    // «ok: true» в пояснении НАД строкой — и мутация, менявшая саму
    // строку на ok: false, проходила мимо зелёной. Тест, читающий
    // комментарий, проверяет намерение автора, а не поведение кода.
    const bare = engine.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    const record = bare.slice(bare.indexOf('tool: "hint"'));
    expect(record.slice(0, 400)).toContain("ok: true");
    expect(record.slice(0, 400)).not.toContain("ok: false");
  });

  it("сказано, что подсказка важнее плана", () => {
    // Иначе модель учтёт её как «ещё одно соображение» и продолжит идти
    // по плану, который человек только что попытался поправить.
    expect(engine).toContain("важнее твоего текущего плана");
  });

  it("оркестратор передаёт источник подсказок", () => {
    expect(src("src/agents/mission-coordinator.ts")).toContain("takeHints: () => drainHints(");
  });
});

describe("Маршрут подсказки", () => {
  const index = src("src/index.ts");

  it("существует и защищён", () => {
    expect(index).toContain('url.pathname === "/api/mission/hint" && request.method === "POST"');
    const guard = index.slice(index.indexOf("const isProtected"), index.indexOf("if (isProtected)"));
    expect(guard).toContain("/api/mission/hint");
  });

  it("каждый отказ имеет свой код", () => {
    // Один общий 400 на все случаи не даёт клиенту сказать человеку, что
    // именно пошло не так.
    // Путь упоминается дважды: в блоке защиты и в самом маршруте. Срез от
    // ПЕРВОГО вхождения попадал на защиту и проверял не то.
    const route = index.slice(index.indexOf('url.pathname === "/api/mission/hint" && request.method === "POST"'));
    expect(route.slice(0, 1800)).toContain("404");
    expect(route.slice(0, 1800)).toContain("409");
    expect(route.slice(0, 1800)).toContain("429");
  });
});

describe("Строка подсказки в интерфейсе", () => {
  const html = src("public/index.html");

  it("есть поле и кнопка", () => {
    expect(html).toContain('id="hintInput"');
    expect(html).toContain('id="hintBtn"');
  });

  it("скрыта, пока нет миссии", () => {
    // У одиночной задачи подсказку некому прочитать. Показывать её там —
    // обещать несуществующее.
    //
    // Проверка изменилась после реальной поломки: раньше она сторожила
    // вызов showHintBar(false) перед каждым переключением экрана. Именно
    // этот способ и сломал кнопку «Новая задача» — на странице два
    // независимых скрипта, и вызовы из второго падали на ReferenceError.
    // Теперь скрытие живёт внутри show(), общей для обоих, и держится на
    // классе, а не на области видимости.
    expect(html).toContain('class="hintbar hidden" id="hintBar"');
    expect(html).toContain("showHintBar(true);");

    const showFn = html.slice(html.indexOf("function show(which)"), html.indexOf("function send()"));
    expect(showFn).toContain("hintBar");
    expect(showFn).toContain("classList.add('hidden')");
  });

  it("отправляется и по кнопке, и по Enter", () => {
    // С телефона Enter — основной жест; кнопка нужна тем, у кого
    // клавиатура не показывает перевод строки.
    expect(html).toContain("$('hintBtn').onclick = sendHint;");
    expect(html).toContain("if (e.key === 'Enter')");
  });

  it("поле чистится сразу после отправки", () => {
    // Иначе повторное нажатие по той же строке отправит подсказку дважды.
    const fn = html.slice(html.indexOf("function sendHint()"));
    expect(fn.indexOf("input.value = '';")).toBeLessThan(fn.indexOf("api('/api/mission/hint'"));
  });

  it("отказ произносится вслух", () => {
    // Молчаливая неудача здесь хуже всего: человек будет считать, что
    // агент услышал, и ждать реакции.
    expect(html).toContain("hint.rejected");
  });

  it("принятая подсказка видна в карте миссии", () => {
    expect(html).toContain("'hint.received'");
  });
});
