import { describe, expect, it } from 'vitest';
import { explainIntent, intentFromParts } from '../src/lib/intent-contract';
import { rankFacts } from '../src/lib/memory-agent';
import { parsePlan, parsePlanNodes, readDependencyNote } from '../src/core/planner';
import { readMissionGraph } from '../src/lib/metatron-ops';

describe('Контракт намерения', () => {
  it('две независимые части не требуют подтверждения', () => {
    const intent = intentFromParts('Нарисуй постер и собери трек', [
      { kind: 'image', text: 'постер', wave: 0, dependsOn: [], worker: 'Image Studio' },
      { kind: 'music', text: 'трек', wave: 0, dependsOn: [], worker: 'Music Studio' },
    ]);
    expect(intent.parallel).toBe(true);
    expect(intent.requiresApproval).toBe(false);
    expect(intent.riskLevel).toBe('low');
    expect(intent.agents).toEqual(['Image Studio', 'Music Studio']);
    expect(explainIntent(intent)).toContain('Независимые части идут рядом');
    expect(explainIntent(intent)).toContain('внешняя музыкальная модель не подключена');
  });

  it('просьба выложить помечается как подтверждение', () => {
    const intent = intentFromParts('Выложи сайт бюро', [
      { kind: 'web', text: 'сайт', wave: 0, dependsOn: [], worker: 'Миссия · сайт' },
    ]);
    expect(intent.requiresApproval).toBe(true);
    expect(intent.riskLevel).toBe('high');
  });

  it('страница без выкладки остаётся средней', () => {
    const intent = intentFromParts('Собери сайт бюро', [
      { kind: 'web', text: 'сайт', wave: 0, dependsOn: [], worker: 'Миссия · сайт' },
    ]);
    expect(intent.riskLevel).toBe('medium');
    expect(intent.requiresApproval).toBe(false);
    expect(explainIntent(intent)).toContain('отдельной кнопкой');
  });
});

describe('Память по словам фразы', () => {
  it('поднимает совпавший факт и прячет секрет', () => {
    const ranked = rankFacts([
      { key: 'palette', value: 'тёмный графит' },
      { key: 'api_key', value: 'sk-live-hidden' },
      { key: 'cover', value: 'обложка бюро ночная' },
    ], 'нужна обложка бюро');
    expect(ranked.map((fact) => fact.key)).toEqual(['cover', 'palette']);
  });
});

describe('Явный граф миссии', () => {
  it('массив строк не становится явным графом', () => {
    expect(parsePlan('["прочитать файл", "починить баг"]')).toEqual(['прочитать файл', 'починить баг']);
    expect(parsePlanNodes('["прочитать файл"]').every((node) => node.explicit)).toBe(false);
  });

  it('объекты с dependsOn хранят номера ранних шагов', () => {
    const nodes = parsePlanNodes('[{"title":"макет","dependsOn":[]},{"title":"страница","dependsOn":[0,9]}]');
    expect(nodes.map((node) => node.title)).toEqual(['макет', 'страница']);
    expect(nodes[1]?.dependsOn).toEqual([0]);
    expect(nodes.every((node) => node.explicit)).toBe(true);
  });

  it('снимок без рёбер остаётся производным', () => {
    const graph = readMissionGraph([
      { id: 'a', position: 0, title: 'первый', status: 'doing', note: null },
      { id: 'b', position: 1, title: 'второй', status: 'pending', note: 'заметка' },
    ]);
    expect(graph.mode).toBe('derived-linear');
    expect(graph.nodes[1]?.dependencies).toEqual(['a']);
  });

  it('записанные рёбра становятся явным графом', () => {
    const graph = readMissionGraph([
      { id: 'a', position: 0, title: 'макет', status: 'done', note: JSON.stringify({ dependsOn: [] }) },
      { id: 'b', position: 1, title: 'страница', status: 'pending', note: JSON.stringify({ dependsOn: ['a'], text: 'ждёт макет' }) },
    ]);
    expect(graph.mode).toBe('explicit');
    expect(graph.nodes[1]?.dependencies).toEqual(['a']);
    expect(graph.nodes[1]?.note).toBe('ждёт макет');
    expect(readDependencyNote('просто текст')).toBeNull();
  });

  it('цикл не выдаётся за явный граф', () => {
    const graph = readMissionGraph([
      { id: 'a', position: 0, title: 'раз', status: 'pending', note: JSON.stringify({ dependsOn: ['b'] }) },
      { id: 'b', position: 1, title: 'два', status: 'pending', note: JSON.stringify({ dependsOn: ['a'] }) },
    ]);
    expect(graph.mode).toBe('derived-linear');
    expect(graph.warning).toContain('не сошлись');
  });
});
