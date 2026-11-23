// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { installImageViewer, openImageViewer } from "../ui/image-viewer";

beforeEach(() => {
  document.body.innerHTML =
    '<div class="thing-card"><div class="assignment-pair"><img id="a" src="/media/a.png" alt="кот"></div></div><img id="x" src="/media/x.png">';
});

describe("просмотр картинки в чате", () => {
  it("клик по картинке открывает окно просмотра, а не ссылку", () => {
    installImageViewer();
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    document.getElementById("a")!.dispatchEvent(event);
    const viewer = document.getElementById("image-viewer");
    expect(event.defaultPrevented).toBe(true);
    expect(viewer?.querySelector("img")?.getAttribute("src")).toContain(
      "/media/a.png",
    );
    expect(viewer?.querySelector("a")?.hasAttribute("download")).toBe(true);
    expect(viewer?.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Закрыть",
    );
  });
  it("картинки вне чата не затрагиваются", () => {
    installImageViewer();
    document
      .getElementById("x")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.getElementById("image-viewer")).toBeNull();
  });
  it("опасный адрес не открывается", () => {
    expect(openImageViewer("javascript:alert(1)", "x")).toBeNull();
  });
  it("закрытие убирает окно", () => {
    const dialog = openImageViewer("/media/a.png", "кот")!;
    dialog.close();
    expect(document.getElementById("image-viewer")).toBeNull();
  });
});
