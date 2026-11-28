import { describe, expect, it } from "vitest";
import { jobPreview, type AgentJob } from "../src/lib/local-agent";

const job = (kind: string, content: string | null): AgentJob => ({ id: "1", kind, path: "a", content } as AgentJob);

describe("превью задачи для карточки", () => {
  it("запись: начало текста, длинное обрезается", () => {
    expect(jobPreview(job("write", "привет"))).toBe("привет");
    expect(jobPreview(job("write", "x".repeat(900)))!.length).toBe(501);
  });
  it("правка: было и стало", () => {
    expect(jobPreview(job("edit", JSON.stringify({ old: "a", new: "b" })))).toBe("было:\na\n\nстало:\nb");
  });
  it("остальные действия без превью", () => {
    expect(jobPreview(job("mkdir", null))).toBeUndefined();
    expect(jobPreview(job("edit", "{сломано"))).toBeUndefined();
  });
});
