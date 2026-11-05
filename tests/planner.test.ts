import { describe, expect, it } from 'vitest';
import { formatPlan, openStoredPlan, planRecord, planWork, revisePart, wavesToRun, workPlanFromDraft } from '../ui/planner';

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

  it('план модели ставит картинку и трек в одну волну', () => {
    const plan = workPlanFromDraft([
      { text: 'Постер бюро', kind: 'image' },
      { text: 'Тёмный трек', kind: 'music' },
    ]);
    expect(plan?.parts.map((part) => part.kind)).toEqual(['image', 'music']);
    expect(plan?.parallel).toBe(true);
    expect(plan?.parts[1]?.wave).toBe(0);
  });

  it('after у модели ставит вторую часть после первой', () => {
    const plan = workPlanFromDraft([
      { text: 'Сайт бюро', kind: 'web' },
      { text: 'Постер', kind: 'image', after: true },
    ]);
    expect(plan?.parts[1]?.wave).toBe(1);
    expect(plan?.parts[1]?.dependsOn).toEqual(['part-1']);
  });

  it('неизвестный вид отменяет ответ модели', () => {
    expect(workPlanFromDraft([{ text: 'Сделать', kind: 'deck' }])).toBeNull();
    expect(workPlanFromDraft([])).toBeNull();
  });

  it('сохранённый план помнит готовую часть и оставляет упавшую', () => {
    const plan = openStoredPlan([
      { id: 'part-1', kind: 'image', text: 'Постер', state: 'done', wave: 0, thing: { type: 'image', url: '/api/studio/artifacts/poster-1?inline=1', title: 'Постер' } },
      { id: 'part-2', kind: 'music', text: 'Трек', state: 'failed', wave: 0 },
      { id: 'part-3', kind: 'web', text: 'Сайт', state: 'running', wave: 1, dependsOn: ['part-2'] },
    ]);
    expect(plan?.parts.map((part) => part.state)).toEqual(['done', 'failed', 'waiting']);
    expect(plan?.parts[2]?.dependsOn).toEqual(['part-2']);
    expect(wavesToRun(plan!).map((group) => group.map((part) => part.kind))).toEqual([['music'], ['web']]);
  });

  it('правка одной части не трогает соседнюю', () => {
    const plan = planWork('Нарисуй постер и собери трек');
    plan.parts[0].state = 'done';
    plan.parts[0].thing = { type: 'image', url: '/api/studio/artifacts/poster-1?inline=1', title: 'Постер' };
    plan.parts[1].state = 'done';
    expect(revisePart(plan, plan.parts[1].id, '  тихий трек  ')).toBe(true);
    expect(plan.parts[1]?.text).toBe('тихий трек');
    expect(plan.parts[1]?.state).toBe('waiting');
    expect(plan.parts[1]?.thing).toBeUndefined();
    expect(plan.parts[0]?.state).toBe('done');
    expect(plan.parts[0]?.thing?.url).toBe('/api/studio/artifacts/poster-1?inline=1');
    expect(wavesToRun(plan, plan.parts[1].id).map((group) => group.map((part) => part.text))).toEqual([['тихий трек']]);
  });
});
