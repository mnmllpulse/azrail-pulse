export type DiagramModel = {
  nodes: string[];
  edges: Array<[string, string]>;
};

const ARROW = /\s*(?:->|=>|→|—)\s*/;
const TITLE = /^[^:>→—=]*(?:схем|диаграмм|график)[^:>→—=]*:\s*/iu;
const COMMAND = /^\s*(?:(?:нарисуй|сделай|создай|построй|собери|изобрази)\s+)?(?:мне\s+|нам\s+)?(?:схем\p{L}*|диаграмм\p{L}*|график\p{L}*)\s*[:\-]?\s*/iu;

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
    const chain = line.trim().replace(TITLE, '').replace(COMMAND, '').split(ARROW).map((part) => part.trim()).filter(Boolean);
    if (chain.length < 2) continue;
    for (let index = 1; index < chain.length; index += 1) {
      const from = add(nodes, chain[index - 1] ?? '');
      const to = add(nodes, chain[index] ?? '');
      if (from && to) edges.push([from, to]);
    }
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

const SVG_NS = 'http://www.w3.org/2000/svg';

/** SVG схемы: узлы в ряд, ширина подгоняется под число узлов. */
export function diagramSvg(doc: Document, lines: string[]): SVGSVGElement {
  const model = diagramModel(lines.join('\n'));
  const count = Math.max(model.nodes.length, 1);
  const width = Math.min(112, Math.max(56, Math.floor(600 / count) - 16));
  const step = count === 1 ? 0 : (640 - 24 - width) / (count - 1);
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 640 120');
  svg.setAttribute('width', '100%');
  svg.setAttribute('role', 'img');
  const place = new Map(model.nodes.map((name, index) => [name, { x: count === 1 ? 264 : 12 + index * step, y: 44 }]));
  for (const [from, to] of model.edges) {
    const start = place.get(from);
    const end = place.get(to);
    if (!start || !end) continue;
    const line = doc.createElementNS(SVG_NS, 'line');
    const forward = end.x >= start.x;
    line.setAttribute('x1', String(forward ? start.x + width : start.x));
    line.setAttribute('y1', String(start.y + 16));
    line.setAttribute('x2', String(forward ? end.x : end.x + width));
    line.setAttribute('y2', String(end.y + 16));
    line.setAttribute('stroke', '#8b7cff');
    line.setAttribute('stroke-width', '2');
    svg.append(line);
  }
  const chars = Math.max(4, Math.floor((width - 12) / 6.5));
  for (const name of model.nodes) {
    const point = place.get(name);
    if (!point) continue;
    const rect = doc.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(point.x));
    rect.setAttribute('y', String(point.y));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', '32');
    rect.setAttribute('rx', '6');
    rect.setAttribute('fill', '#12121a');
    rect.setAttribute('stroke', '#8b7cff');
    const label = doc.createElementNS(SVG_NS, 'text');
    label.textContent = name.length > chars ? `${name.slice(0, chars - 1)}…` : name;
    label.setAttribute('x', String(point.x + 6));
    label.setAttribute('y', String(point.y + 21));
    label.setAttribute('fill', '#f4f1ea');
    label.setAttribute('font-size', '12');
    svg.append(rect, label);
  }
  return svg;
}
