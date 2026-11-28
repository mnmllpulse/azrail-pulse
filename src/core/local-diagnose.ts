const RULES: Array<[RegExp, string]> = [
  [/ENOENT|no such file|не найден[аоы]? путь|cannot find path/i, "Пути не существует. Не угадывай: посмотри родителя через local_list или найди через local_search, потом повтори с точным путём."],
  [/EEXIST|уже существует|already exists/i, "Назначение занято. Выбери другое имя или проверь через local_list, не лежит ли там уже нужное."],
  [/ENOTEMPTY|не пуст/i, "Папка не пуста. Сначала разбери содержимое (local_list), потом действуй."],
  [/EACCES|EPERM|permission denied|отказано в доступе|закрыт для агента/i, "Нет доступа. Путь закрыт или занят другой программой. Выбери другой путь; в закрытые папки не лезь."],
  [/EBUSY|being used by another process|занят другим процессом/i, "Файл занят другой программой. Попроси владельца закрыть её или повтори позже."],
  [/ENOSPC|no space left|недостаточно места/i, "Нет места на диске. Скажи владельцу, не повторяй."],
  [/Фрагмент не найден/i, "Текста для правки в файле нет. Прочитай файл (local_read) и возьми точный фрагмент."],
  [/встречается \d+ раз/i, "Фрагмент не уникален. Добавь соседние строки, чтобы он встречался один раз."],
  [/Файл больше/i, "Файл слишком большой для чтения целиком. Ищи нужное через local_search."],
  [/Это не файл/i, "Это папка. Используй local_list."],
  [/command not found|не является внутренней или внешней командой|is not recognized/i, "Команды нет в системе. Проверь local_overview (менеджер пакетов) и установлена ли программа; не придумывай замену."],
  [/ERESOLVE|peer dep/i, "Конфликт версий зависимостей. Не используй --force молча: назови конфликт владельцу."],
  [/Cannot find module|MODULE_NOT_FOUND/i, "Зависимости не установлены. Выполни установку менеджером из local_overview."],
  [/EADDRINUSE|address already in use/i, "Порт занят. Возьми другой порт или попроси владельца закрыть то, что его держит."],
  [/ETIMEDOUT|timed out|таймаут|превышено время/i, "Время вышло. Повтори один раз; если снова — скажи владельцу, а не крути цикл."],
  [/Агент ещё не|не отвечает|нет связи|offline/i, "Агент на компьютере не отвечает. Это не ошибка пути: скажи владельцу включить агента."],
];

/** Короткий понятный диагноз ошибки локального инструмента и что делать дальше; null — причина не распознана. */
export function diagnoseLocalError(message: string): string | null {
  const text = String(message ?? "");
  for (const [pattern, advice] of RULES) if (pattern.test(text)) return advice;
  return null;
}

/** Диагноз по результату инструмента: ошибка может прийти как поле error готового отчёта. */
export function diagnoseOutput(output: unknown): string | null {
  if (output && typeof output === "object" && "error" in output && typeof (output as { error: unknown }).error === "string" && (output as { error: string }).error) return diagnoseLocalError((output as { error: string }).error);
  return null;
}
