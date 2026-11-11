import { describe, expect, it } from 'vitest';
import { formatPlan, fileNameFromPhrase, followUpPlan, groundWorkPlan, holdBlocked, keepAskedMedia, openStoredPlan, pictureReply, planRecord, planWork, restorePageVersion, retryPart, revisePart, takeBackPage, wantsPageRestore, wavesToRun, workPlanFromDraft } from '../ui/planner';
import { chatPicturePaths } from '../ui/chat-markdown';

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
    expect(text).toContain('Рядом: Картинка и Трек');
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

  it('разбор архива не становится сборкой файла', () => {
    const drafted = workPlanFromDraft([{ text: 'сделай анализ', kind: 'file' }]);
    expect(groundWorkPlan('сделай анализ', drafted)).toBeNull();
    const kept = workPlanFromDraft([{ text: 'Сделай pdf отчёт', kind: 'file' }]);
    expect(groundWorkPlan('Сделай pdf отчёт', kept)?.parts[0]?.kind).toBe('file');
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

  it('короткая правка продолжает прошлую картинку, а новая задача не притворяется правкой', () => {
    const plan = planWork('Нарисуй постер для бюро');
    plan.parts[0].state = 'done';
    plan.parts[0].thing = { type: 'image', url: '/api/studio/artifacts/poster-1?inline=1', title: 'Постер' };
    const darker = followUpPlan('сделай темнее', plan);
    expect(darker?.parts[0]?.kind).toBe('image');
    expect(darker?.parts[0]?.versions?.[0]?.url).toBe('/api/studio/artifacts/poster-1?inline=1');
    expect(darker?.parts[0]?.text).toContain('сделай темнее');
    expect(followUpPlan('нарисуй другой постер', plan)).toBeNull();
    const site = planWork('Собери сайт для бюро');
    site.parts[0].state = 'done';
    site.parts[0].thing = { type: 'page', url: '/s/bureau', title: 'Страница' };
    const recolor = followUpPlan('измени цвет кнопки на фиолетовый', site);
    expect(recolor?.parts[0]?.kind).toBe('web');
    expect(recolor?.parts[0]?.versions?.[0]?.url).toBe('/s/bureau');
    expect(followUpPlan('сделай темнее', site)).toBeNull();
    const wider = followUpPlan('Сделай чат шире и добавь эффект живого фиолетового импульса.', site);
    expect(wider?.parts[0]?.kind).toBe('web');
    expect(wider?.parts[0]?.text).toContain('чат шире');
    expect(followUpPlan('нарисуй постер', site)).toBeNull();
    expect(followUpPlan('Бро, наш сайт выглядит дешево', site)?.parts[0]?.kind).toBe('web');
  });

  it('возвращает прошлую страницу на место и держит смещённую в истории', () => {
    const plan = planWork('Собери сайт для бюро');
    const part = plan.parts[0];
    part.state = 'done';
    part.thing = { type: 'page', url: '/s/now', title: 'Сейчас', lines: ['azrail-site\tБюро\tdark\t0\t1\t1\t1\t0\t0\tбюро'] };
    part.versions = [
      { type: 'page', url: '/s/then', title: 'Раньше', lines: ['azrail-site\tБюро\tdark\t0\t0\t0\t1\t0\t0\tбюро'] },
      { type: 'page', url: '/s/first', title: 'Первая' },
    ];
    expect(wantsPageRestore('верни предыдущую')).toBe(true);
    expect(wantsPageRestore('верни предыдущую картинку')).toBe(false);
    expect(restorePageVersion(part, 1)).toBeNull();
    const back = takeBackPage(plan);
    expect(back?.url).toBe('/s/then');
    expect(part.thing?.url).toBe('/s/then');
    expect(part.versions?.[0]?.url).toBe('/s/now');
    expect(part.versions?.some((item) => item.url === '/s/then')).toBe(false);
    const kept = followUpPlan('сделай чат шире', plan);
    expect(kept?.parts[0]?.versions?.map((item) => item.url)).toEqual(['/s/then', '/s/now', '/s/first']);
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

  it('повтор поднимает только упавшую часть и оставляет прошлую вещь', () => {
    const plan = planWork('Нарисуй постер и собери трек');
    plan.parts[0].state = 'done';
    plan.parts[0].thing = { type: 'image', url: '/api/studio/artifacts/poster-1?inline=1', title: 'Постер' };
    plan.parts[1].state = 'failed';
    plan.parts[1].thing = { type: 'audio', url: '/api/studio/artifacts/track-1?inline=1', title: 'Трек' };
    expect(retryPart(plan, plan.parts[0].id)).toBe(false);
    expect(retryPart(plan, plan.parts[1].id)).toBe(true);
    expect(plan.parts[0]?.state).toBe('done');
    expect(plan.parts[1]?.state).toBe('waiting');
    expect(plan.parts[1]?.thing).toBeUndefined();
    expect(plan.parts[1]?.versions?.[0]?.url).toBe('/api/studio/artifacts/track-1?inline=1');
    expect(wavesToRun(plan, plan.parts[1].id).map((group) => group.map((part) => part.kind))).toEqual([['music']]);
  });

  it('упавшая зависимость держит только свою следующую часть', () => {
    const plan = workPlanFromDraft([
      { text: 'Постер', kind: 'image' },
      { text: 'Трек', kind: 'music' },
      { text: 'Сайт', kind: 'web', after: true },
    ]);
    expect(plan).not.toBeNull();
    plan!.parts[0].state = 'done';
    plan!.parts[1].state = 'failed';
    const next = plan!.parts.filter((part) => part.wave === 1);
    const runnable = holdBlocked(plan!, next);
    expect(runnable).toEqual([]);
    expect(plan!.parts[0]?.state).toBe('done');
    expect(plan!.parts[2]?.state).toBe('failed');
  });

  it('два адреса картинки остаются, чужой адрес выпадает', () => {
    const plan = planWork('Нарисуй постер и собери трек');
    plan.parts[0].thing = {
      type: 'image',
      url: '/api/studio/artifacts/poster-1?inline=1',
      title: 'Постер',
      alts: ['/api/studio/artifacts/poster-2?inline=1', 'https://evil.example/x.png'],
    };
    plan.parts[0].versions = [{ type: 'image', url: '/api/studio/artifacts/poster-0?inline=1', title: 'Старый' }];
    const record = planRecord(plan);
    expect(record.parts[0]?.thing).toEqual({
      type: 'image',
      url: '/api/studio/artifacts/poster-1?inline=1',
      title: 'Постер',
      alts: ['/api/studio/artifacts/poster-2?inline=1'],
    });
    expect(record.parts[0]?.versions).toEqual([{ type: 'image', url: '/api/studio/artifacts/poster-0?inline=1', title: 'Старый' }]);
    plan.parts[0].seed = 7;
    expect(planRecord(plan).parts[0]?.seed).toBe(7);
  });

  it('сосед в той же волне без этой зависимости остаётся ждать', () => {
    const plan = planWork('Нарисуй постер и собери трек');
    plan.parts[0].state = 'failed';
    plan.parts[1].wave = 1;
    plan.parts[1].dependsOn = [];
    plan.parts[1].state = 'waiting';
    plan.parts.push({ ...plan.parts[1], id: 'part-3', text: 'Сайт', dependsOn: ['part-1'], state: 'waiting' });
    const runnable = holdBlocked(plan, plan.parts.filter((part) => part.wave === 1));
    expect(runnable.map((part) => part.id)).toEqual(['part-2']);
    expect(plan.parts.find((part) => part.id === 'part-3')?.state).toBe('failed');
    expect(plan.parts[0]?.state).toBe('failed');
  });

  it('пустой план модели не отменяет просьбу нарисовать', () => {
    expect(keepAskedMedia('нарисуй череп на черном фоне', null)?.parts[0]?.kind).toBe('image');
    expect(keepAskedMedia('нарисуй череп', workPlanFromDraft([{ text: 'опиши череп', kind: 'build' }]))?.parts[0]?.kind).toBe('image');
    expect(keepAskedMedia('привет', null)).toBeNull();
  });

  it('готовая картинка остаётся картинкой в тексте чата', () => {
    const reply = pictureReply([{
      ready: 'Картинка в чате.',
      thing: { type: 'image', url: '/api/studio/artifacts/skull-1?inline=1', title: 'Череп', alts: ['https://evil.example/x.png'] },
    }]);
    expect(reply).toContain('![Череп](/api/studio/artifacts/skull-1?inline=1)');
    expect(reply).not.toContain('evil.example');
    expect(chatPicturePaths(reply)).toEqual(['/api/studio/artifacts/skull-1?inline=1']);
    expect(chatPicturePaths('![чужая](https://evil.example/x.png)')).toEqual([]);
  });

  it('имя файла берётся из фразы', () => {
    expect(fileNameFromPhrase('Ночной постер бюро', 'png')).toBe('ночной-постер-бюро.png');
    expect(fileNameFromPhrase('???', 'png')).toBe('файл.png');
  });
});
