import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("очистка вложений при отправке", () => {
  const src = readFileSync("ui/app.ts", "utf8");
  const start = src.indexOf("const shown=message");
  const block = src.slice(start, src.indexOf("catch(e){", start));
  it("вложения очищаются до запроса к серверу", () => {
    expect(block.indexOf("clearAttachments()")).toBeGreaterThan(-1);
    expect(block.indexOf("clearAttachments()")).toBeLessThan(
      block.indexOf("await api('/api/chat'"),
    );
  });
  it("в запрос уходит снимок вложений", () => {
    expect(block).toContain("attachments:sentRefs");
    expect(block.match(/clearAttachments\(\)/g)).toHaveLength(1);
  });
});
