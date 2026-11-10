import { glyphRows } from "./glyph8";

const BOX = [0x7e, 0x42, 0x42, 0x42, 0x42, 0x42, 0x7e, 0x00];

function reverseBits(value: number): number {
  let out = 0;
  for (let bit = 0; bit < 8; bit++) if (value & (1 << bit)) out |= 1 << (7 - bit);
  return out;
}

function glyphHex(rows: number[]): string {
  return rows.map((row) => reverseBits(row).toString(16).padStart(2, "0")).join("") + ">";
}

function charProc(rows: number[]): string {
  return `8 0 0 0 8 8 d1\nq\n8 0 0 8 0 0 cm\nBI\n/W 8\n/H 8\n/BPC 1\n/IM true\n/F /AHx\nID\n${glyphHex(rows)}\nEI\nQ`;
}

/** PDF с растровыми буквами. Кириллица берётся из таблицы глифов, не из Helvetica. */
export function pdfBytes(text: string): Uint8Array {
  const source = (text || "Пусто").replace(/\r/g, "").slice(0, 12_000);
  const used: number[] = [];
  const slot = new Map<number, number>();
  const take = (code: number) => {
    const found = slot.get(code);
    if (found) return found;
    if (used.length >= 250) return 0;
    const next = used.length + 1;
    used.push(code);
    slot.set(code, next);
    return next;
  };
  const lines: number[][] = [];
  let line: number[] = [];
  const pushLine = () => {
    lines.push(line);
    line = [];
  };
  for (const ch of source) {
    if (ch === "\n") {
      pushLine();
      continue;
    }
    const code = ch.codePointAt(0) ?? 32;
    if (code > 0xffff) continue;
    line.push(take(code === 9 ? 32 : code));
    if (line.length >= 64) pushLine();
  }
  if (line.length || lines.length === 0) pushLine();
  const pages = Math.max(1, Math.ceil(lines.length / 56));
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const procIds = used.map((code) => add(`<< /Length ${charProc(glyphRows(code) ?? BOX).length} >>\nstream\n${charProc(glyphRows(code) ?? BOX)}\nendstream`));
  const names = used.map((_, index) => `/c${index + 1}`).join(" ");
  const procMap = procIds.map((id, index) => `/c${index + 1} ${id} 0 R`).join(" ");
  const toUnicode = [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Azrail-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<00> <FF>",
    "endcodespacerange",
    `${used.length} beginbfchar`,
    ...used.map((code, index) => `<${(index + 1).toString(16).padStart(2, "0")}> <${code.toString(16).padStart(4, "0")}>`),
    "endbfchar",
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ].join("\n");
  const cmapId = add(`<< /Length ${toUnicode.length} >>\nstream\n${toUnicode}\nendstream`);
  const fontBody = `<< /Type /Font /Subtype /Type3 /FontMatrix [1 0 0 1 0 0] /FontBBox [0 0 8 8] /FirstChar 1 /LastChar ${used.length} /Widths [${used.map(() => "8").join(" ")}] /Encoding << /Type /Encoding /Differences [1 ${names}] >> /CharProcs << ${procMap} >> /ToUnicode ${cmapId} 0 R >>`;
  const fontId = add(fontBody);
  const pageIds: number[] = [];
  for (let page = 0; page < pages; page++) {
    const slice = lines.slice(page * 56, page * 56 + 56);
    const commands = ["BT", "/F1 1.25 Tf", "40 800 Td"];
    slice.forEach((row, index) => {
      if (index) commands.push("0 -12 Td");
      const bytes = row.map((code) => (
        code === 0x28 || code === 0x29 || code === 0x5c || code < 32 || code > 126
          ? `\\${code.toString(8).padStart(3, "0")}`
          : String.fromCharCode(code)
      )).join("");
      commands.push(`(${bytes}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent PAGES 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`));
  }
  const pagesId = add(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const fixed = objects.map((body) => body.replaceAll("PAGES 0 R", `${pagesId} 0 R`));
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  fixed.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${fixed.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index++) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fixed.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
