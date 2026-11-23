export type LayerNode = { id: string; dependencies: string[] };

/** Уровень узла = длина самой длинной цепочки зависимостей до него. Неизвестные и циклические зависимости не ломают расчёт. */
export function layerGraph<T extends LayerNode>(nodes: T[]): T[][] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const walk = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const node = byId.get(id)!;
    const level = node.dependencies.reduce((max, dep) => (byId.has(dep) ? Math.max(max, walk(dep) + 1) : max), 0);
    visiting.delete(id);
    depth.set(id, level);
    return level;
  };
  const layers: T[][] = [];
  for (const node of nodes) (layers[walk(node.id)] ??= []).push(node);
  return layers.filter(Boolean);
}

/** Понятное описание графа без терминов. */
export function graphCaption(mode: string, layers: unknown[][]): string {
  const widest = layers.reduce((max, layer) => Math.max(max, layer.length), 0);
  if (!layers.length) return 'Шагов пока нет.';
  if (mode !== 'explicit') return 'Порядок шагов: один за другим. Связи между шагами планировщик не указал.';
  return widest > 1
    ? 'План с явными связями. Шаги одного уровня не зависят друг от друга; сейчас они всё равно выполняются по очереди, чтобы не мешать друг другу.'
    : 'План с явными связями: каждый шаг ждёт предыдущий.';
}
