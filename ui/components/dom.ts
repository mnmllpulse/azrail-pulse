/** Small DOM primitives shared by studio/settings UI. Text is always assigned via textContent. */
export function makeElement<K extends keyof HTMLElementTagNameMap>(tag: K, text = ""): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

export function makeLabel(text: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.append(document.createTextNode(text), control);
  return label;
}
