// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppDialogs } from "../ui/app-dialogs";

function setup(account: { role?: string } | null, replies: Record<string, unknown> = {}, project = "p1") {
  document.body.innerHTML = '<div id="content"></div>';
  const content = document.getElementById("content")!;
  const api = vi.fn(async (path: string) => replies[path.split("?")[0]] ?? { items: [] });
  const dialog = vi.fn((title: string, html: string) => { content.dataset.title = title; content.innerHTML = html; return content; });
  const dialogs = createAppDialogs({ api, blobAPI: vi.fn(), dialog, notice: vi.fn(), failure: vi.fn(), getAccount: () => account, isLocal: () => false, getProject: () => project, getStudio: () => null });
  return { dialogs, api, dialog, content };
}

describe("app-dialogs", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("диалоги требуют вход", async () => {
    const { dialogs, api } = setup(null);
    await expect(dialogs.openAssetIntelligence()).rejects.toThrow("Войдите");
    await expect(dialogs.openGlobalMemory()).rejects.toThrow("Войдите");
    await expect(dialogs.openReviewHistory()).rejects.toThrow("Войдите");
    expect(api).not.toHaveBeenCalled();
  });

  it("библиотека артефактов: пустой список", async () => {
    const { dialogs, content, api } = setup({ role: "admin" });
    await dialogs.openAssetIntelligence();
    expect(content.textContent).toBe("Артефактов пока нет.");
    expect(api).toHaveBeenCalledWith("/api/studio/assets/intelligence?projectId=p1");
  });

  it("память: пустая и с записью, проект уходит в запрос", async () => {
    const empty = setup({ role: "viewer" });
    await empty.dialogs.openGlobalMemory();
    expect(empty.content.textContent).toContain("Память пока пуста.");
    expect(empty.api).toHaveBeenCalledWith("/api/studio/intelligence/memory?scope=all&projectId=p1");
    const full = setup({ role: "viewer" }, { "/api/studio/intelligence/memory": { items: [{ id: "m1", scope: "user", key: "тема", value: "тёмная", source: "chat", whyStored: "просил", confidence: 0.9, expiresAt: null, createdAt: 1, updatedAt: 1 }] } });
    await full.dialogs.openGlobalMemory();
    expect(full.content.textContent).toContain("тема");
    expect(full.content.textContent).toContain("тёмная");
  });

  it("review без студии не запускается", async () => {
    const { dialogs } = setup({ role: "admin" });
    await expect(dialogs.startProfessionalReviewMission()).rejects.toThrow("Откройте Studio");
  });

  it("история требует проект", async () => {
    const { dialogs } = setup({ role: "admin" }, {}, "");
    await expect(dialogs.openSystemHistory()).rejects.toThrow("выберите проект");
  });

  it("подсказки без входа пусты, ошибки сети не бросают", async () => {
    expect(await setup(null).dialogs.loadSystemSuggestions({} as never)).toEqual([]);
    const { dialogs, api } = setup({ role: "admin" });
    api.mockRejectedValueOnce(new Error("offline"));
    expect(await dialogs.loadSystemSuggestions({} as never)).toEqual([]);
  });
});
