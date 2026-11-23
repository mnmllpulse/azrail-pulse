import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { showApprovalCard } from "../ui/approval-card";

const windows: Window[] = [];
afterEach(() => {
  for (const w of windows) w.close();
  windows.length = 0;
});
function page() {
  const w = new Window();
  windows.push(w);
  w.document.body.innerHTML =
    '<div class="composer-dock"><form id="composer"></form></div>';
  return w.document as unknown as Document;
}

describe("карточка разрешения", () => {
  it("встаёт над полем ввода и имеет доступную роль", () => {
    const doc = page();
    showApprovalCard(
      {
        title: "Нужно разрешение",
        text: "Запустить?",
        actions: [{ label: "Да", primary: true, run: () => {} }],
      },
      doc,
    );
    const dock = doc.querySelector(".composer-dock")!;
    expect(dock.firstElementChild?.id).toBe("approval-card");
    expect(dock.firstElementChild?.getAttribute("role")).toBe("region");
  });

  it("кнопка вызывает действие; вторая карточка заменяет первую", async () => {
    const doc = page();
    const run = vi.fn();
    showApprovalCard(
      { title: "A", text: "", actions: [{ label: "Да", run }] },
      doc,
    );
    showApprovalCard(
      { title: "B", text: "", actions: [{ label: "Да", run }] },
      doc,
    );
    expect(doc.querySelectorAll("#approval-card").length).toBe(1);
    (doc.querySelector("#approval-card button") as HTMLButtonElement).click();
    expect(run).toHaveBeenCalledOnce();
  });

  it("update перерисовывает, показывает команду; close убирает", () => {
    const doc = page();
    const card = showApprovalCard({ title: "A", text: "", actions: [] }, doc);
    card.update({ title: "B", text: "t", code: "pwsh x", actions: [] });
    expect(
      (doc.querySelector(".approval-code") as HTMLTextAreaElement).value,
    ).toBe("pwsh x");
    card.close();
    expect(doc.getElementById("approval-card")).toBeNull();
  });

  it("текст вставляется как текст, а не как разметка", () => {
    const doc = page();
    showApprovalCard(
      { title: "<b>x</b>", text: "<img src=x>", actions: [] },
      doc,
    );
    expect(doc.querySelector("#approval-card img")).toBeNull();
  });
});
