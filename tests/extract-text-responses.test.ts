import { describe, expect, it } from "vitest";
import { extractText } from "../src/lib/model-router";

describe("extractText: Responses-формат", () => {
  it("берёт текст сообщения и пропускает reasoning", () => {
    const out = {
      output: [
        {
          type: "reasoning",
          content: [{ type: "reasoning_text", text: "думаю" }],
        },
        { type: "message", content: [{ type: "output_text", text: "Ответ" }] },
      ],
    };
    expect(extractText(out)).toBe("Ответ");
    expect(extractText({ result: out })).toBe("Ответ");
  });
  it("пустой output остаётся пустым", () => {
    expect(
      extractText({
        output: [{ type: "reasoning", content: [{ text: "x" }] }],
      }),
    ).toBe("");
  });
});
