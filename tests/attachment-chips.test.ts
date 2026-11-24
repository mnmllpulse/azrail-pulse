import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { attachmentChip, fileIconName, splitAttachments } from "../ui/attachment-chip";
import { createChatHistory, renderChatMessages } from "../ui/chat-history";

const windows: Window[] = [];
afterEach(() => { for (const w of windows) w.close(); windows.length = 0; vi.unstubAllGlobals(); });
function setup() {
  const w = new Window();
  windows.push(w);
  vi.stubGlobal("window", w);
  vi.stubGlobal("document", w.document);
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => undefined) } });
  const host = w.document.createElement("div");
  w.document.body.append(host);
  return { w, host };
}
const storage = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage; };

describe("карточки вложений", () => {
  it("иконка зависит от типа файла", () => {
    expect(fileIconName("site.zip")).toBe("archive");
    expect(fileIconName("a.PNG")).toBe("image");
    expect(fileIconName("report.docx")).toBe("document");
    expect(fileIconName("main.ts")).toBe("fileCode");
    expect(fileIconName("song.wav")).toBe("audio");
    expect(fileIconName("clip.mp4")).toBe("video");
    expect(fileIconName("noext")).toBe("file");
    expect(fileIconName("x.unknownext")).toBe("file");
  });
  it("splitAttachments отделяет хвост из файлов от текста и не трогает обычные ссылки", () => {
    const content = "Разбери архив\n\n[site.zip](/api/studio/artifacts/abc123)\n\n![pic.png](/api/studio/artifacts/img_9)\n\n📎 notes.txt";
    expect(splitAttachments(content)).toEqual({
      text: "Разбери архив",
      files: [
        { name: "site.zip", url: "/api/studio/artifacts/abc123", image: false },
        { name: "pic.png", url: "/api/studio/artifacts/img_9", image: true },
        { name: "notes.txt", image: false },
      ],
    });
    expect(splitAttachments("см. [сайт](https://example.com) выше").files).toEqual([]);
    expect(splitAttachments("[a](/api/studio/artifacts/x)\n\nтекст после").files).toEqual([]);
  });
  it("чип: ссылка открывается безопасно, у незагруженного файла нет ссылки", () => {
    const { w } = setup();
    const link = attachmentChip(w.document as unknown as Document, { name: "a.zip", url: "/api/studio/artifacts/q1", image: false }) as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.querySelector(".attachment-chip-name")?.textContent).toBe("a.zip");
    expect(link.querySelector("small")?.textContent).toBe("Загружен");
    const plain = attachmentChip(w.document as unknown as Document, { name: "b.txt", image: false });
    expect(plain.tagName).toBe("SPAN");
    expect(plain.querySelector("small")?.textContent).toBe("Не загружен");
  });
  it("в ленте 30 файлов — компактные чипы одной строкой-контейнером, а не абзацы", () => {
    const { host } = setup();
    const history = createChatHistory(storage());
    history.setScope("t");
    const thread = history.create();
    const links = Array.from({ length: 30 }, (_, i) => `[f${i}.ts](/api/studio/artifacts/id${i})`).join("\n\n");
    thread.turns = [{ missionId: "m", requestKey: "k", user: `Проверь\n\n${links}`, reply: "ok", status: "completed" }];
    renderChatMessages(host, thread, "");
    const [files, caption] = Array.from(host.querySelectorAll('[data-role="user"]'));
    expect(files.querySelectorAll(".message-attachments .attachment-chip")).toHaveLength(30);
    expect(files.querySelectorAll("p")).toHaveLength(0);
    expect(caption.querySelector(".message-content")?.textContent).toBe("Проверь");
    expect(caption.querySelector('.message-actions [aria-label="Редактировать"]')).not.toBeNull();
  });
});
