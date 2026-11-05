import { describe, expect, it } from 'vitest';
import { formatPlan, planRecord, planWork } from '../ui/planner';

describe('Планировщик поручения', () => {
  it('одну картинку не дробит', () => {
    const plan = planWork('Нарисуй премиальный постер для бюро');
    expect(plan.parts).toHaveLength(1);
    expect(plan.parts[0]?.kind).toBe('image');
    expect(plan.parallel).toBe(false);
  });

  it('два результата без очереди идут одной волной', () => {
    const plan = planWork('Нарисуй постер и собери тёмный трек');
    expect(plan.parts.map((part) => part.kind)).toEqual(['image', 'music']);
    expect(plan.parts.every((part) => part.wave === 0)).toBe(true);
    expect(plan.parallel).toBe(true);
    expect(plan.parts[1]?.dependsOn).toEqual([]);
  });

  it('слово «потом» ставит следующую часть после предыдущей', () => {
    const plan = planWork('Создай сайт для бюро потом нарисуй постер');
    expect(plan.parts.map((part) => part.kind)).toEqual(['web', 'image']);
    expect(plan.parts[1]?.wave).toBe(1);
    expect(plan.parts[1]?.dependsOn).toEqual(['part-1']);
    expect(plan.parallel).toBe(false);
  });

  it('союз «и» внутри одного описания не режет фразу', () => {
    const plan = planWork('Собери тёмный и глубокий трек');
    expect(plan.parts).toHaveLength(1);
    expect(plan.parts[0]?.kind).toBe('music');
  });

  it('карточка называет, что идёт рядом', () => {
    const text = formatPlan(planWork('Нарисуй постер и собери трек'));
    expect(text).toContain('План из 2 частей');
    expect(text).toContain('Рядом: Image Studio и Music Studio');
  });

  it('в запись плана попадает только своя ссылка на файл', () => {
    const plan = planWork('Нарисуй постер и собери трек');
    plan.parts[0].thing = { type: 'image', url: '/api/studio/artifacts/poster-1?inline=1', title: 'Постер' };
    plan.parts[1].thing = { type: 'audio', url: 'https://evil.example/track.wav', title: 'Трек' };
    const record = planRecord(plan);
    expect(record.parts[0]?.thing).toEqual({ type: 'image', url: '/api/studio/artifacts/poster-1?inline=1', title: 'Постер' });
    expect(record.parts[1]?.thing).toBeUndefined();
  });
});
