import { icon } from "./icons";

const SELECTOR =
  ".thing-card img, .assignment-pair img, .assignment-versions img";

function safeSrc(src: string): string {
  return /^(?:blob:|data:image\/|\/|https?:)/i.test(src) ? src : "";
}

export function openImageViewer(
  src: string,
  alt: string,
): HTMLDialogElement | null {
  const url = safeSrc(src);
  if (!url) return null;
  document.getElementById("image-viewer")?.remove();
  const dialog = document.createElement("dialog");
  dialog.id = "image-viewer";
  dialog.className = "image-viewer";
  dialog.setAttribute("aria-label", alt || "Картинка");
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt || "Картинка";
  const bar = document.createElement("div");
  bar.className = "image-viewer-bar";
  const save = document.createElement("a");
  save.href = url;
  save.download = "azrail-image.png";
  save.className = "icon-download";
  save.title = "Скачать";
  save.setAttribute("aria-label", "Скачать");
  save.innerHTML = icon("download", 20);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-download";
  close.title = "Закрыть";
  close.setAttribute("aria-label", "Закрыть");
  close.innerHTML = icon("close", 20);
  close.onclick = () => dialog.close();
  bar.append(save, close);
  dialog.append(img, bar);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  return dialog;
}

export function installImageViewer(root: Document = document): void {
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.matches(SELECTOR))
      return;
    event.preventDefault();
    openImageViewer(target.currentSrc || target.src, target.alt);
  });
}
