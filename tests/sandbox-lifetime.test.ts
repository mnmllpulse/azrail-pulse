import { describe, it, expect, vi } from "vitest";
import { SANDBOX_LIMITS } from "../src/core/sandbox";

/** Повторяет логику потолка из azrail-sandbox.ts без запуска контейнера.
 *  Проверяется РЕШЕНИЕ (сносить или нет), а не SDK. */
function decide(born: number | undefined, now: number) {
  if (typeof born !== "number") return { destroy: false, write: now };
  if (now - born < SANDBOX_LIMITS.MAX_LIFETIME_MS) return { destroy: false, write: null };
  return { destroy: true, write: now };
}

describe("потолок жизни контейнера", () => {
  const t0 = 1_700_000_000_000;

  it("первая команда только запоминает время", () => {
    const d = decide(undefined, t0);
    expect(d.destroy).toBe(false);
    expect(d.write).toBe(t0);
  });

  it("внутри часа контейнер живёт", () => {
    expect(decide(t0, t0 + 59 * 60_000).destroy).toBe(false);
  });

  it("на границе часа сносится", () => {
    expect(decide(t0, t0 + SANDBOX_LIMITS.MAX_LIFETIME_MS).destroy).toBe(true);
  });

  it("после сноса отсчёт начинается заново", () => {
    const d = decide(t0, t0 + SANDBOX_LIMITS.MAX_LIFETIME_MS);
    expect(d.write).toBe(t0 + SANDBOX_LIMITS.MAX_LIFETIME_MS);
    // Следующая команда сразу после сноса не должна снести его повторно.
    expect(decide(d.write!, d.write! + 1000).destroy).toBe(false);
  });

  it("ловит именно тот случай, ради которого нужен", () => {
    // Цикл гоняет короткие команды без остановки: каждая укладывается в
    // COMMAND_TIMEOUT_MS, простоя не наступает никогда, sleepAfter молчит.
    let born = t0, now = t0, destroyed = 0;
    for (let i = 0; i < 400; i++) {
      now += 30_000;                       // команда раз в полминуты
      const d = decide(born, now);
      if (d.destroy) destroyed++;
      if (d.write !== null) born = d.write;
    }
    // 400 × 30 с = 200 минут ≈ три часа. Потолок обязан сработать.
    expect(destroyed, "за три часа непрерывной работы потолок не сработал").toBeGreaterThanOrEqual(3);
  });

  it("три рубежа ловят разное и не подменяют друг друга", () => {
    expect(SANDBOX_LIMITS.COMMAND_TIMEOUT_MS).toBeLessThan(SANDBOX_LIMITS.IDLE_TIMEOUT_MS);
    expect(SANDBOX_LIMITS.IDLE_TIMEOUT_MS).toBeLessThan(SANDBOX_LIMITS.MAX_LIFETIME_MS);
  });
});

describe("потолок применён, а не только объявлен", () => {
  const src = (p: string) => require("fs").readFileSync(p, "utf8");
  const cls = src("src/core/azrail-sandbox.ts");

  it("exec переопределён и проверяет срок", () => {
    // Ровно эта болезнь ловилась всю сессию: величина объявлена, а
    // поведением правит что-то другое.
    expect(cls).toContain("async exec(");
    expect(cls).toContain("enforceLifetime");
    expect(cls).toContain("SANDBOX_LIMITS.MAX_LIFETIME_MS");
  });

  it("проверка перед командой, а не по таймеру", () => {
    // Будить объект ради сторожа значит платить за сам сторож.
    expect(cls).not.toMatch(/setAlarm|scheduled\(/);
  });

  it("после сноса время рождения переписывается", () => {
    // Иначе следующая же команда снесёт контейнер снова, и так по кругу.
    const block = cls.slice(cls.indexOf("await this.destroy()"));
    expect(block.slice(0, 200)).toContain("storage.put(BORN_AT");
  });
});
