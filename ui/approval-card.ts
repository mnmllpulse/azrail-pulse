export type CardAction = {
  label: string;
  primary?: boolean;
  run: () => void | Promise<void>;
};
export type CardSpec = {
  title: string;
  text: string;
  code?: string;
  actions: CardAction[];
};
export type CardHandle = {
  update: (spec: CardSpec) => void;
  close: () => void;
};

const ID = "approval-card";

/** Карточка разрешения над полем ввода: вместо похода в настройки и вместо ответа словом «разреши». */
export function showApprovalCard(
  spec: CardSpec,
  doc: Document = document,
): CardHandle {
  doc.getElementById(ID)?.remove();
  const card = doc.createElement("section");
  card.id = ID;
  card.className = "approval-card";
  card.setAttribute("role", "region");
  card.setAttribute("aria-label", "Нужно твоё разрешение");
  const dock = doc.querySelector(".composer-dock");
  const form = doc.getElementById("composer");
  if (dock && form) dock.insertBefore(card, form);
  else doc.body.append(card);
  const close = () => card.remove();
  const paint = (next: CardSpec) => {
    const title = doc.createElement("strong");
    title.textContent = next.title;
    const text = doc.createElement("p");
    text.textContent = next.text;
    const row = doc.createElement("div");
    row.className = "approval-actions";
    for (const action of next.actions) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      if (action.primary) button.dataset.primary = "true";
      button.onclick = () => {
        button.disabled = true;
        void Promise.resolve(action.run()).finally(() => {
          button.disabled = false;
        });
      };
      row.append(button);
    }
    const nodes: HTMLElement[] = [title, text];
    if (next.code) {
      const code = doc.createElement("textarea");
      code.className = "approval-code";
      code.readOnly = true;
      code.rows = Math.min(6, next.code.split("\n").length);
      code.value = next.code;
      code.setAttribute("aria-label", "Что именно будет выполнено или изменено");
      nodes.push(code);
    }
    nodes.push(row);
    card.replaceChildren(...nodes);
  };
  paint(spec);
  return { update: paint, close };
}
