import { describe, expect, it } from "vitest";
import { withRetry } from "../ui/account-retry";

describe("повтор запроса статуса аккаунта", () => {
  it("один сбой не ломает ответ", async () => {
    let calls = 0;
    const value = await withRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error("network");
        return "ok";
      },
      3,
      1,
    );
    expect(value).toBe("ok");
    expect(calls).toBe(2);
  });
  it("после всех попыток отдаёт последнюю ошибку", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("down");
        },
        3,
        1,
      ),
    ).rejects.toThrow("down");
    expect(calls).toBe(3);
  });
  it("неповторяемая ошибка (например 401) не крутится", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("401");
        },
        3,
        1,
        () => false,
      ),
    ).rejects.toThrow("401");
    expect(calls).toBe(1);
  });
});
