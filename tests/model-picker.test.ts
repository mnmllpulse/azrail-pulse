import { describe, expect, it } from 'vitest';
import { applyPicker, modelBadge, PICKER_FILTERS, type PickerModel } from '../ui/model-picker';

const label = (m: PickerModel) => m.displayName ?? m.slug;
const models: PickerModel[] = [
  { slug: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', provider: 'Meta', task: 'Text Generation', freeAllowlisted: true, reviewed: true, hosted: true, availability: 'available' },
  { slug: '@cf/zai-org/glm-5.2', provider: 'Z.ai', task: 'Text Generation', reviewed: true, hosted: true, availability: 'unavailable' },
  { slug: '@cf/black-forest-labs/flux-2-klein-4b', provider: 'Black Forest', task: 'Text-to-Image', hosted: true, availability: 'available' },
  { slug: 'openai/gpt-6', provider: 'OpenAI', task: 'Text Generation', reviewed: true, hosted: false, availability: 'available' },
  { slug: '@cf/qwen/qwen3-30b-a3b-fp8', provider: 'Qwen', task: 'Text Generation', hosted: true, availability: 'available' },
];
const run = (filter: Parameters<typeof applyPicker>[1]['filter'], query = '', showLocked = false) =>
  applyPicker(models, { filter, query, showLocked }, label).map((m) => m.slug);

describe('выбор модели', () => {
  it('«Для чата» скрывает картинки и недоступные', () => {
    expect(run('chat')).toEqual(['@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'openai/gpt-6', '@cf/qwen/qwen3-30b-a3b-fp8']);
  });

  it('«Бесплатные» — только разрешённые и доступные', () => {
    expect(run('free', '', true)).toEqual(['@cf/meta/llama-3.3-70b-instruct-fp8-fast']);
  });

  it('«Проверенные» — только reviewed; недоступные видны лишь с переключателем', () => {
    expect(run('reviewed')).toEqual(['@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'openai/gpt-6']);
    expect(run('reviewed', '', true)).toContain('@cf/zai-org/glm-5.2');
  });

  it('«Все» показывает картинки, недоступные — по переключателю', () => {
    expect(run('all')).toHaveLength(4);
    expect(run('all', '', true)).toHaveLength(5);
  });

  it('недоступная чатовая модель попадает в «Для чата» при показе недоступных', () => {
    expect(run('chat', '', true)).toContain('@cf/zai-org/glm-5.2');
  });

  it('поиск идёт по имени, провайдеру, слагу и задаче', () => {
    expect(run('all', 'openai')).toEqual(['openai/gpt-6']);
    expect(run('all', 'text-to-image')).toEqual(['@cf/black-forest-labs/flux-2-klein-4b']);
    expect(run('all', '  QWEN3 ')).toEqual(['@cf/qwen/qwen3-30b-a3b-fp8']);
    expect(run('all', 'нет такой')).toEqual([]);
  });

  it('метки: недоступна, нейроны, free, сторонняя, paid', () => {
    expect(modelBadge(models[1]).kind).toBe('locked');
    expect(modelBadge({ slug: '@cf/zai-org/glm-5.2', availability: 'available' }).kind).toBe('neuron');
    expect(modelBadge(models[0]).kind).toBe('free');
    expect(modelBadge(models[3]).kind).toBe('external');
    expect(modelBadge(models[4]).kind).toBe('paid');
  });

  it('набор фильтров фиксирован и начинается с «Для чата»', () => {
    expect(PICKER_FILTERS.map((f) => f.id)).toEqual(['chat', 'free', 'reviewed', 'all']);
  });
});
