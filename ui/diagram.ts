export type DiagramModel = {
  nodes: string[];
  edges: Array<[string, string]>;
};

const ARROW = /(.+?)\s*(?:->|→|—)\s*(.+)/;

function add(nodes: string[], name: string): string {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!clean || nodes.includes(clean) || nodes.length >= 8) return nodes.includes(clean) ? clean : "";
  nodes.push(clean);
  return clean;
}

/** Узлы и стрелки из фразы. Без внешней библиотеки схем. */
export function diagramModel(text: string): DiagramModel {
  const nodes: string[] = [];
  const edges: Array<[string, string]> = [];
  for (const line of text.split(/\n|·|;/)) {
    const match = ARROW.exec(line.trim());
    if (!match) continue;
    const from = add(nodes, match[1]);
    const to = add(nodes, match[2]);
    if (from && to) edges.push([from, to]);
  }
  if (!nodes.length) {
    const bits = text
      .replace(/(?<![\p{L}])(?:нарисуй|сделай|создай|схем\p{L}*|диаграмм\p{L}*|график)(?![\p{L}])/giu, " ")
      .split(/,|\s+и\s+/)
      .map((bit) => bit.trim())
      .filter((bit) => bit.length > 1);
    bits.forEach((bit, index) => {
      const name = add(nodes, bit);
      const prev = nodes[index - 1];
      if (index > 0 && prev && name) edges.push([prev, name]);
    });
  }
  if (!nodes.length) nodes.push("Шаг");
  return { nodes: nodes.slice(0, 8), edges: edges.slice(0, 8) };
}

export function diagramLines(model: DiagramModel): string[] {
  if (model.edges.length) return model.edges.map(([from, to]) => `${from} -> ${to}`).slice(0, 8);
  return model.nodes.slice(0, 8);
}
