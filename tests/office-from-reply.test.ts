import { describe, expect, it } from "vitest";
import {
  asksToWrite,
  buildOffice,
  isBareFileRequest,
  plainFromMarkdown,
} from "../src/lib/office-file";

describe("файл из ответа модели", () => {
  it.each([
    "сделай pdf",
    "в pdf",
    "сделай из этого pdf файл",
    "сохрани как docx",
    "теперь в презентацию",
  ])("«%s» — просьба без содержания", (phrase) =>
    expect(isBareFileRequest(phrase)).toBe(true),
  );
  it.each([
    "сделай pdf с отчётом по продажам за март",
    "создай таблицу: имя, возраст",
  ])("«%s» несёт своё содержание", (phrase) =>
    expect(isBareFileRequest(phrase)).toBe(false),
  );
  it("просьба написать текст распознаётся", () => {
    expect(asksToWrite("напиши сказку на 3 страницы и сделай pdf")).toBe(true);
    expect(asksToWrite("сделай pdf")).toBe(false);
  });
  it("разметка Markdown убирается", () => {
    const text = plainFromMarkdown(
      "## Глава 1\n\n**Жили-были** кот и *пёс*.\n\n- первый\n- второй\n\n---\n\n`код`",
    );
    expect(text).toContain("Глава 1");
    expect(text).not.toMatch(/[#*`]/);
    expect(text).toContain("• первый");
  });
  it("PDF строится из ответа, а не из слов просьбы", () => {
    const made = buildOffice(
      "сделай pdf",
      "# Сказка про кота\n\nЖил-был кот. Он любил молоко.",
    );
    expect(made.kind).toBe("pdf");
    expect(made.name).toMatch(/\.pdf$/);
    expect(
      new TextDecoder("latin1").decode(made.bytes).startsWith("%PDF"),
    ).toBe(true);
    const plain = buildOffice("сделай pdf");
    expect(plain.bytes.length).not.toBe(made.bytes.length);
  });
  it("без ответа остаётся прежнее поведение", () => {
    expect(buildOffice("создай таблицу: имя, возраст").kind).toBe("xlsx");
  });
});
