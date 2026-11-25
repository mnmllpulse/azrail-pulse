import { describe, expect, it } from "vitest";
import { recallChats, topicWords, wantsChatRecall } from "../src/lib/chat-recall";
import { sqliteD1 } from "./stubs/sqlite-d1";
import type { Env } from "../src/types";

function seed() {
  const { db, sqlite } = sqliteD1();
  const chat = (id: string, title: string, owner: string, lines: Array<[string, string]>) => {
    sqlite.prepare("INSERT INTO conversations(id,title) VALUES(?,?)").run(id, title);
    sqlite.prepare("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('conversation',?,?)").run(id, owner);
    lines.forEach(([role, content], i) => sqlite.prepare("INSERT INTO messages(id,conversation_id,role,content,created_at) VALUES(?,?,?,?,?)").run(`${id}-${i}`, id, role, content, `2026-11-2${i}T10:00:00`));
  };
  chat("c1", "Эффект Даунинга Крюгера", "me", [["user", "Напиши про эффект Даунинга Крюгера"], ["assistant", "Это когнитивное искажение."]]);
  chat("c2", "Сайт про кофе", "me", [["user", "Сделай страницу кофейни ![a.png](data:image/png;base64,AAA)"], ["assistant", "Готово."]]);
  chat("c3", "Чужой чат", "other", [["user", "секретный пароль"], ["assistant", "ок"]]);
  chat("cur", "Текущий", "me", [["user", "привет"]]);
  return { env: { AZRAIL_D1: db } as unknown as Env };
}

describe("распознавание просьбы", () => {
  it("нужны и глагол чтения, и слово «чаты»", () => {
    for (const ok of ["прочитай чаты", "найди в моих чатах про кофе", "что мы обсуждали в прошлых диалогах", "посмотри переписку про сайт"]) expect(wantsChatRecall(ok), ok).toBe(true);
    for (const no of ["сделай страницу чата", "прочитай файл", "привет", "открой чат"]) expect(wantsChatRecall(no), no).toBe(false);
  });
  it("слова темы без служебных", () => {
    expect(topicWords("найди в моих чатах про эффект Даунинга")).toEqual(["эффект", "даунинга"]);
  });
});

describe("чтение прошлых чатов", () => {
  it("отдаёт только чаты владельца и без текущего", async () => {
    const { env } = seed();
    const text = await recallChats(env, "me", "cur", "прочитай чаты");
    expect(text).toContain("Эффект Даунинга Крюгера");
    expect(text).toContain("Сайт про кофе");
    expect(text).not.toContain("секретный пароль");
    expect(text).not.toContain("Текущий");
  });
  it("отбирает по теме и скрывает вложения", async () => {
    const { env } = seed();
    const text = await recallChats(env, "me", "cur", "найди в моих чатах про кофе");
    expect(text).toContain("Сайт про кофе");
    expect(text).not.toContain("Даунинга");
    expect(text).toContain("[вложение]");
    expect(text).not.toContain("base64");
  });
  it("если по теме пусто — честно говорит и даёт последние", async () => {
    const { env } = seed();
    const text = await recallChats(env, "me", "cur", "найди в чатах про космос");
    expect(text).toContain("совпадений нет");
  });
  it("у другого аккаунта чатов нет", async () => {
    const { env } = seed();
    expect(await recallChats(env, "nobody", "cur", "прочитай чаты")).toContain("пока нет");
  });
});
