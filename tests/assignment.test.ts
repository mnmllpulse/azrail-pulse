import { describe, expect, it } from 'vitest';
import { formatAssignment, readAssignment, skillsReply } from '../ui/assignment';

describe('Поручение из чата', () => {
  it('вопрос остаётся разговором', () => {
    expect(readAssignment('Что такое картинка?').kind).toBe('talk');
    expect(readAssignment('Как сделать сайт для бюро').kind).toBe('talk');
    expect(readAssignment('Объясни, как собрать трек').kind).toBe('talk');
    expect(readAssignment('привет').kind).toBe('talk');
    expect(skillsReply('что ты умеешь')).toContain('нарисуй');
    expect(skillsReply('что ты умеешь')).toContain('сайт');
    expect(skillsReply('ты умеешь писать код или читать зип файл')).toContain('ZIP');
    expect(skillsReply('ты умеешь писать код или читать зип файл')).toContain('Python');
    expect(skillsReply('нарисуй город')).toBeNull();
  });

  it('спорные слова не забирает у чата', () => {
    expect(readAssignment('Сделай деплой в продакшн').kind).toBe('talk');
    expect(readAssignment('Создай тесты для входа').kind).toBe('talk');
  });

  it('называет инструмент по результату', () => {
    expect(readAssignment('Нарисуй премиальный постер для бюро').kind).toBe('image');
    expect(readAssignment('Сделай pdf отчёт').kind).toBe('file');
    expect(readAssignment('Нарисуй схему входа').kind).toBe('diagram');
    expect(readAssignment('Что такое pdf?').kind).toBe('talk');
    expect(readAssignment('Собери тёмный трек без вокала').kind).toBe('music');
    expect(readAssignment('Сделай ролик из четырёх кадров').kind).toBe('video');
    expect(readAssignment('Создай сайт для архитектурного бюро').kind).toBe('web');
    expect(readAssignment('Сделай калькулятор').kind).toBe('web');
    expect(readAssignment('Сделай страницу-визитку: имя и три ссылки').kind).toBe('web');
    expect(readAssignment('Напиши скрипт для разбора логов').kind).toBe('talk');
    expect(readAssignment('дай изображение ночного города').kind).toBe('image');
    expect(readAssignment('хочу сайт для бюро').kind).toBe('web');
    expect(readAssignment('дай изображение').studio).toBeNull();
    expect(readAssignment('хочу сайт').studio).toBeNull();
  });

  it('если в фразе два результата, берёт тот, что назван раньше', () => {
    expect(readAssignment('Собери трек и нарисуй обложку').kind).toBe('music');
    expect(readAssignment('Нарисуй обложку и собери трек').kind).toBe('image');
  });

  it('карточка называет, кто работает', () => {
    const text = formatAssignment(readAssignment('Нарисуй постер'));
    expect(text).toContain('Картинка');
    expect(text).toContain('Кто работает');
    expect(text).toContain('Нужно ли тебе вмешаться');
  });
});

describe("явные просьбы о файле и схеме не блокируются словом «тест»", () => {
  it.each([
    ["Сделай pdf с текстом: тестовый документ", "file"],
    ["Сделай схему: Идея -> Код -> Тест -> Выпуск", "diagram"],
    ["Создай схему тестирования", "diagram"],
  ])("%s → %s", (phrase, kind) => {
    expect(readAssignment(phrase).kind).toBe(kind);
  });
  it.each(["Напиши тесты для функции", "Проверь покрытие тестами", "Задеплой на staging"])("остаётся разговором: %s", (phrase) => {
    expect(readAssignment(phrase).kind).toBe("talk");
  });
});

describe('вопрос о содержимом не запускает генерацию', () => {
  it.each([
    'что на картинке',
    'Что на картинке? Опиши',
    'опиши изображение',
    'что нарисовано на этом изображении',
    'прочитай pdf и перескажи',
    'проанализируй таблицу',
    'какой логотип на фото',
    'скажи, что за диаграмма во вложении',
    'переведи документ',
  ])('%s → talk', (phrase) => {
    expect(readAssignment(phrase).kind).toBe('talk');
  });

  it.each([
    ['нарисуй такое же', 'image'],
    ['изобрази ночной город', 'image'],
    ['сделай pdf с текстом: тест', 'file'],
    ['построй схему: идея -> код', 'diagram'],
    ['хочу сайт для бюро', 'web'],
  ])('%s → %s', (phrase, kind) => {
    expect(readAssignment(phrase).kind).toBe(kind);
  });

  it('упоминание картинки без просьбы создать остаётся разговором', () => {
    expect(readAssignment('картинка получилась странная').kind).toBe('talk');
  });
});
