import { describe, expect, it } from 'vitest';
import { parsePlanDraft } from '../src/lib/assignment-plan';

describe('Разбор плана модели', () => {
  it('достаёт части из JSON, даже если вокруг есть текст', () => {
    const parts = parsePlanDraft('Готово: {"parts":[{"text":"Постер","kind":"image","after":false},{"text":"Трек","kind":"music","after":true}]}');
    expect(parts).toEqual([
      { text: 'Постер', kind: 'image', after: false },
      { text: 'Трек', kind: 'music', after: true },
    ]);
  });

  it('пустой список значит разговор', () => {
    expect(parsePlanDraft('{"parts":[]}')).toEqual([]);
  });

  it('битый JSON и чужой вид нельзя использовать', () => {
    expect(parsePlanDraft('не json')).toBeNull();
    expect(parsePlanDraft('{"parts":[{"text":"Ролик","kind":"kling"}]}')).toBeNull();
  });
});
