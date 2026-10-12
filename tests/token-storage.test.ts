import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(__dirname, "..", "public/index.html"), "utf-8");

/**
 * НАЙДЕНО В БОЮ.
 *
 * Токен лежал в sessionStorage — хранилище, которое живёт ровно пока
 * открыта вкладка. Замысел был про безопасность на чужом устройстве. На
 * практике каждая новая вкладка начиналась с отказов «нужен заголовок
 * Authorization» при загрузке файла и запросе списка моделей. Это
 * выглядит как сломанная система, а не как незаполненная настройка:
 * человек идёт чинить загрузку, которая не ломалась.
 *
 * Вторая половина той же истории: список моделей запрашивается ОДИН раз
 * при открытии страницы. Без токена он падал и навсегда оставался в
 * состоянии «список не загрузился» — даже после того, как токен введён.
 * Система знала, что причина устранена, и продолжала показывать старую
 * ошибку.
 */

/** Тело функции по имени — через подсчёт скобок, а не по ближайшей строке. */
function functionBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return "";
}

describe("Токен переживает закрытие вкладки", () => {
  it("читается из localStorage", () => {
    expect(html).toContain("local.get('azrail_token')");
  });

  it("чтение НЕ ограничено сессией", () => {
    /* Мутация «вернуть sessionStorage» пережила первую версию этого
     * файла: проверялось, что нужная строка ЕСТЬ, но не что старой
     * больше НЕТ. Обе строки уживаются рядом, и тест оставался зелёным
     * на коде с исходным дефектом. */
    const init = html.slice(html.indexOf("var token ="), html.indexOf("var preferredModel"));
    expect(init).toContain("local.get('azrail_token')");
    expect(init.indexOf("local.get('azrail_token')")).toBeLessThan(
      init.indexOf("session.get('azrail_token')"),
    );
  });

  it("сохранение пишет в localStorage", () => {
    const save = html.slice(html.indexOf("$('tokenBtn').addEventListener"));
    expect(save.slice(0, 900)).toContain("local.set('azrail_token'");
  });

  it("значение из старой сессии переносится, а не теряется", () => {
    // Иначе обновление страницы выглядит как потеря настроек: человек
    // вводил токен вчера, а сегодня поле пустое без объяснений.
    expect(html).toContain("session.get('azrail_token')");
    expect(html).toContain("if (token && !local.get('azrail_token')) local.set('azrail_token', token);");
  });
});

describe("Токен можно стереть явно", () => {
  it("кнопка «Забыть» есть в разметке", () => {
    expect(html).toContain('id="tokenForgetBtn"');
  });

  it("она чистит оба хранилища и поле", () => {
    const forget = html.slice(html.indexOf("$('tokenForgetBtn').addEventListener"));
    const body = forget.slice(0, 500);
    expect(body).toContain("local.set('azrail_token', '')");
    expect(body).toContain("session.set('azrail_token', '')");
    expect(body).toContain("$('token').value = ''");
  });

  it("подпись не обещает того, чего больше нет", () => {
    // Старый текст говорил «стирается при закрытии вкладки». Теперь это
    // неправда, а подпись, которая врёт, хуже отсутствующей.
    expect(html).not.toContain("стирается при её закрытии");
  });
});

describe("Список моделей оживает после ввода токена", () => {
  it("перезапрашивается прямо в обработчике сохранения", () => {
    const save = functionBody(
      html.slice(html.indexOf("$('tokenBtn').addEventListener")),
      "function ()",
    );
    expect(save).toContain("loadModels()");
  });

  it("но не запрашивается, когда токен только что стёрли", () => {
    // Запрос без токена вернёт ту же ошибку и перезапишет список ею —
    // то есть покажет отказ там, где человек сам всё очистил.
    const save = functionBody(
      html.slice(html.indexOf("$('tokenBtn').addEventListener")),
      "function ()",
    );
    expect(save).toContain("if (token) loadModels()");
  });
});
