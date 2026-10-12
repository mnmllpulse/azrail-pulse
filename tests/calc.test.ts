import { describe, it, expect } from "vitest";
import { calculate, calculateAll, CalcError } from "../src/lib/calc";

describe("вычислитель считает, а не угадывает", () => {
  it("умножает большие числа точно", () => {
    // Ровно тот случай, где модель выдаёт правдоподобное, но неверное.
    expect(calculate("4871 * 3392")).toBe(4871 * 3392);
    expect(calculate("98765 * 43210")).toBe(4267635650);
  });
  it("соблюдает приоритет", () => {
    expect(calculate("2 + 3 * 4")).toBe(14);
    expect(calculate("(2 + 3) * 4")).toBe(20);
  });
  it("степень правоассоциативна", () => {
    expect(calculate("2^3^2")).toBe(512);
    expect(calculate("2**10")).toBe(1024);
  });
  it("унарный минус", () => {
    expect(calculate("-5 + 3")).toBe(-2);
    expect(calculate("-(2+3)")).toBe(-5);
  });
  it("функции и константы", () => {
    expect(calculate("sqrt(144)")).toBe(12);
    expect(calculate("round(pi * 100) / 100")).toBe(3.14);
    expect(calculate("max(3, 9, 2)")).toBe(9);
    expect(calculate("avg(2, 4, 6)")).toBe(4);
    expect(calculate("median(1, 3, 100)")).toBe(3);
  });
  it("выборочное отклонение", () => {
    expect(calculate("stdev(2, 4, 4, 4, 5, 5, 7, 9)")).toBeCloseTo(2.138, 3);
  });
  it("деление на ноль — ошибка, а не Infinity", () => {
    expect(() => calculate("1/0")).toThrow(CalcError);
  });
  it("неизвестное имя — ошибка, а не ноль", () => {
    // Подставить 0 значило бы посчитать не то, о чём просили, молча.
    expect(() => calculate("x + 1")).toThrow(/неизвестное имя/);
  });
  it("мусор отвергается", () => {
    expect(() => calculate("2 +")).toThrow(CalcError);
    expect(() => calculate("")).toThrow(CalcError);
    expect(() => calculate("2 2")).toThrow(CalcError);
  });
  it("не исполняет код", () => {
    // Главное свойство: это калькулятор, а не интерпретатор.
    expect(() => calculate("fetch('http://evil')")).toThrow(CalcError);
    expect(() => calculate("process.exit(1)")).toThrow(CalcError);
    expect(() => calculate("constructor")).toThrow(CalcError);
  });
  it("пачка: ошибка одного не роняет остальные", () => {
    const r = calculateAll(["2+2", "1/0", "10*10"]);
    expect(r[0].value).toBe(4);
    expect(r[1].value).toBeNull();
    expect(r[1].error).toBeTruthy();
    expect(r[2].value).toBe(100);
  });
});
