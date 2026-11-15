import { describe, expect, it } from "vitest";
import { filesFromReply, wantsZipOfReply, zipOfReply } from "../ui/chat-zip";

const reply = "**Содержимое файлов**\n\n*index.html*\n```html\n<!doctype html><title>a</title>\n```\n\n*style.css*\n```css\nbody{margin:0}\n```\n";

describe("ZIP из ответа чата", () => {
  it("распознаёт просьбу", () => {
    for (const text of ["сделай его в зип архивом", "собери zip", "упакуй в архив", "дай архив"]) expect(wantsZipOfReply(text)).toBe(true);
    expect(wantsZipOfReply("расскажи про архивы в истории")).toBe(false);
  });
  it("берёт файлы по подписи", () => {
    expect(filesFromReply(reply).map((f) => f.path)).toEqual(["index.html", "style.css"]);
  });
  it("без подписей называет по языку", () => {
    expect(filesFromReply("```html\n<p>x</p>\n```").map((f) => f.path)).toEqual(["index.html"]);
  });
  it("собирает настоящий zip", () => {
    const bytes = zipOfReply(reply)!;
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    expect(zipOfReply("просто текст")).toBeNull();
  });
  it("не пропускает выход из папки", () => {
    expect(filesFromReply("*../../etc/x.txt*\n```\nq\n```").map((f) => f.path)).toEqual(["etc/x.txt"]);
  });
});
