import { describe, expect, it } from "vitest";
import { attachmentsToText, loadAttachments } from "../src/lib/attachments";

function envWith(size: number, ai?: unknown) {
  return {
    AZRAIL_R2: {
      get: async () => ({
        size,
        arrayBuffer: async () => new ArrayBuffer(Math.min(size, 16)),
        text: async () => "",
      }),
    },
    ...(ai ? { AI: ai } : {}),
  } as never;
}
const ref = [
  { r2Key: "u/song.mp3", fileName: "song.mp3", inputType: "file" },
] as never;

describe("аудио во вложении", () => {
  it("слова расшифровываются и помечены как расшифровка", async () => {
    const ai = { run: async () => ({ text: "привет это мой трек" }) };
    const out = await loadAttachments(envWith(1000, ai), ref);
    expect(out[0].text).toBe("привет это мой трек");
    expect(out[0].skipped).toContain("не слышишь");
    expect(attachmentsToText(out)).toContain("привет это мой трек");
  });
  it("без распознавания прямо: я не слышу аудио", async () => {
    const out = await loadAttachments(envWith(1000), ref);
    expect(out[0].text).toBeUndefined();
    expect(out[0].skipped).toContain("я не слышу аудио");
  });
  it("большой файл не расшифровывается молча", async () => {
    const out = await loadAttachments(
      envWith(9 * 1024 * 1024, { run: async () => ({ text: "x" }) }),
      ref,
    );
    expect(out[0].skipped).toContain("8 МБ");
  });
  it("пустая расшифровка: слов нет, музыку не слышу", async () => {
    const out = await loadAttachments(
      envWith(1000, { run: async () => ({ text: "" }) }),
      ref,
    );
    expect(out[0].skipped).toContain("не слышу музыку");
  });
  it("ошибка провайдера не выдаёт выдуманный текст", async () => {
    const out = await loadAttachments(
      envWith(1000, {
        run: async () => {
          throw new Error("x");
        },
      }),
      ref,
    );
    expect(out[0].text).toBeUndefined();
    expect(out[0].skipped).toContain("не удалась");
  });
});
