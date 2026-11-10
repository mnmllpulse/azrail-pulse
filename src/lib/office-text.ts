import { listZip, readEntry } from "./zip-reader";

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&amp;/g, "&");
}

function xmlBits(xml: string): string {
  const bits: string[] = [];
  const tags = /<[^>]+>|[^<]+/g;
  for (const part of xml.match(tags) ?? []) {
    if (part.startsWith("<")) {
      if (/^<(\/)?(w:p|a:p|si|row|tr)\b/.test(part)) bits.push("\n");
      else if (/^<w:tab\b/.test(part)) bits.push("\t");
      continue;
    }
    const text = unescapeXml(part).replace(/\s+/g, " ").trim();
    if (text) bits.push(text);
  }
  return bits.join(" ").replace(/[ ]*\n[ ]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Текст из DOCX, XLSX или PPTX. PDF сюда не входит: это не ZIP с XML. */
export async function officePlain(buf: ArrayBuffer, ext: string): Promise<string> {
  const { entries } = listZip(buf, 80);
  const want = entries.filter((entry) => {
    if (entry.skipped) return false;
    if (ext === "docx") return entry.path === "word/document.xml";
    if (ext === "pptx") return /^ppt\/slides\/slide\d+\.xml$/i.test(entry.path);
    if (ext === "xlsx") {
      const shared = entries.some((item) => item.path === "xl/sharedStrings.xml" && !item.skipped);
      return shared ? entry.path === "xl/sharedStrings.xml" : /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.path);
    }
    return false;
  });
  const chunks: string[] = [];
  for (const entry of want.slice(0, 24)) {
    const bytes = await readEntry(buf, entry, 256 * 1024);
    const text = xmlBits(new TextDecoder().decode(bytes));
    if (text) chunks.push(text);
  }
  return chunks.join("\n").slice(0, 80_000);
}
