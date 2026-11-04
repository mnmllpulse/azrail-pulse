import { describe, expect, it } from 'vitest';
import { formatAssignment, readAssignment } from '../ui/assignment';

describe('Поручение из чата', () => {
  it('вопрос остаётся разговором', () => {
    expect(readAssignment('Что такое картинка?').kind).toBe('talk');
    expect(readAssignment('Как сделать сайт для бюро').kind).toBe('talk');
    expect(readAssignment('Объясни, как собрать трек').kind).toBe('talk');
    expect(readAssignment('привет').kind).toBe('talk');
  });

  it('спорные слова не забирает у чата', () => {
    expect(readAssignment('Сделай деплой в продакшн').kind).toBe('talk');
    expect(readAssignment('Создай тесты для входа').kind).toBe('talk');
  });

  it('называет инструмент по результату', () => {
    expect(readAssignment('Нарисуй премиальный постер для бюро').kind).toBe('image');
    expect(readAssignment('Собери тёмный трек без вокала').kind).toBe('music');
    expect(readAssignment('Сделай ролик из четырёх кадров').kind).toBe('video');
    expect(readAssignment('Создай сайт для архитектурного бюро').kind).toBe('web');
    expect(readAssignment('Сделай страницу-визитку: имя и три ссылки').kind).toBe('web');
    expect(readAssignment('Напиши скрипт для разбора логов').kind).toBe('build');
  });

  it('если в фразе два результата, берёт тот, что назван раньше', () => {
    expect(readAssignment('Собери трек и нарисуй обложку').kind).toBe('music');
    expect(readAssignment('Нарисуй обложку и собери трек').kind).toBe('image');
  });

  it('карточка называет, кто работает', () => {
    const text = formatAssignment(readAssignment('Нарисуй постер'));
    expect(text).toContain('Image Studio');
    expect(text).toContain('Кто работает');
    expect(text).toContain('Нужно ли тебе вмешаться');
  });
});
